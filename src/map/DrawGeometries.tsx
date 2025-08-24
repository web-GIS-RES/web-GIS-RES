import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";

const CREATE_API = "/.netlify/functions/create-area";

export default function DrawGeometries() {
  const map = useMap();

  useEffect(() => {
    const drawnItems = new L.FeatureGroup().addTo(map);

    const drawControl = new (L.Control as any).Draw({
      draw: {
        marker: true,
        polygon: {
          showArea: true,
          allowIntersection: false,
          finishOnDoubleClick: false  // αποτρέπει το πρόωρο «κλείσιμο»
        },
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false
      },
      edit: { featureGroup: drawnItems, edit: false, remove: false }
    });

    const onDrawStart = () => map.doubleClickZoom.disable();
    const onDrawStop  = () => map.doubleClickZoom.enable();
    map.on((L as any).Draw.Event.DRAWSTART, onDrawStart);
    map.on((L as any).Draw.Event.DRAWSTOP,  onDrawStop);

    map.addControl(drawControl);

    const onCreated = async (e: any) => {
      const layer = e.layer as L.Layer;
      drawnItems.addLayer(layer);
      const feature = (layer as any).toGeoJSON();

      try {
        const resp = await fetch(CREATE_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: feature.geometry?.type === "Point" ? "Νέο σημείο" : "Νέο πολύγωνο",
            properties: { source: "manual" },
            geometry: feature.geometry
          })
        });
        if (!resp.ok) {
          console.error("create-area failed:", await resp.text());
        } else {
          map.fire("reload-areas");
        }
      } catch (err) {
        console.error("Network error saving area:", err);
      } finally {
        drawnItems.removeLayer(layer);
      }
    };

    map.on((L as any).Draw.Event.CREATED, onCreated);

    return () => {
      map.off((L as any).Draw.Event.CREATED, onCreated);
      map.off((L as any).Draw.Event.DRAWSTART, onDrawStart);
      map.off((L as any).Draw.Event.DRAWSTOP, onDrawStop);
      map.removeControl(drawControl);
      map.removeLayer(drawnItems);
      try { map.doubleClickZoom.enable(); } catch {}
    };
  }, [map]);

  return null;
}
