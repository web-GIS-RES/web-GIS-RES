import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw"; // το CSS το φορτώσαμε στο MapView

const CREATE_API = "/.netlify/functions/create-area";

export default function DrawGeometries() {
  const map = useMap();

  useEffect(() => {
    const drawnItems = new L.FeatureGroup().addTo(map);

    const drawControl = new (L.Control as any).Draw({
      draw: {
        marker: true,
        polygon: { showArea: true, allowIntersection: false },
        polyline: false, rectangle: false, circle: false, circlemarker: false
      },
      edit: { featureGroup: drawnItems, edit: false, remove: false }
    });

    map.addControl(drawControl);

    const onCreated = async (e: any) => {
      const layer = e.layer as L.Layer;
      drawnItems.addLayer(layer);

      const feature = (layer as any).toGeoJSON();
      const geom = feature.geometry;
      const friendlyName = geom.type === "Point" ? "Νέο σημείο" : "Νέο πολύγωνο";

      const resp = await fetch(CREATE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: friendlyName,
          properties: { source: "manual" },
          geometry: geom
        })
      });

      if (!resp.ok) {
        alert("Αποτυχία αποθήκευσης");
        drawnItems.removeLayer(layer);
        return;
      }

      drawnItems.removeLayer(layer);     // καθάρισε το προσωρινό σχέδιο
      map.fire("reload-areas");          // φόρτωσε από DB
    };

    map.on((L as any).Draw.Event.CREATED, onCreated);

    return () => {
      map.off((L as any).Draw.Event.CREATED, onCreated);
      map.removeControl(drawControl);
      map.removeLayer(drawnItems);
    };
  }, [map]);

  return null;
}
