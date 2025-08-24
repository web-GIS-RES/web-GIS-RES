import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw"; // το CSS το φορτώνουμε ήδη στο MapView.tsx

const CREATE_API = "/.netlify/functions/create-area";

export default function DrawGeometries() {
  const map = useMap();

  useEffect(() => {
    // Layer που κρατά προσωρινά τα προς αποστολή σχέδια
    const drawnItems = new L.FeatureGroup().addTo(map);

    // Ρυθμίσεις εργαλείων σχεδίασης
    const drawControl = new (L.Control as any).Draw({
      draw: {
        marker: true,
        polygon: { showArea: true, allowIntersection: false },
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false
      },
      edit: {
        featureGroup: drawnItems,
        edit: false,
        remove: false
      }
    });

    // Απενεργοποιούμε το double-click zoom όσο σχεδιάζουμε (για να μη «τελειώνει» πρόωρα το polygon)
    const onDrawStart = () => map.doubleClickZoom.disable();
    const onDrawStop = () => map.doubleClickZoom.enable();
    map.on((L as any).Draw.Event.DRAWSTART, onDrawStart);
    map.on((L as any).Draw.Event.DRAWSTOP, onDrawStop);

    map.addControl(drawControl);

    // Όταν δημιουργείται νέο geometry → POST στη Netlify Function
    const onCreated = async (e: any) => {
      const layer = e.layer as L.Layer;
      drawnItems.addLayer(layer);

      const feature = (layer as any).toGeoJSON();
      const geom = feature.geometry;
      const friendlyName = geom?.type === "Point" ? "Νέο σημείο" : "Νέο πολύγωνο";

      try {
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
          const text = await resp.text();
          alert("Αποτυχία αποθήκευσης: " + text);
          drawnItems.removeLayer(layer);
          return;
        }
      } catch (err: any) {
        alert("Σφάλμα δικτύου: " + (err?.message ?? "unknown"));
        drawnItems.removeLayer(layer);
        return;
      }

      // Καθάρισε το προσωρινό layer και κάνε reload από DB
      drawnItems.removeLayer(layer);
      map.fire("reload-areas");
    };

    map.on((L as any).Draw.Event.CREATED, onCreated);

    // Cleanup για να μην συσσωρεύονται listeners σε hot reloads
    return () => {
      map.off((L as any).Draw.Event.CREATED, onCreated);
      map.off((L as any).Draw.Event.DRAWSTART, onDrawStart);
      map.off((L as any).Draw.Event.DRAWSTOP, onDrawStop);
      map.removeControl(drawControl);
      map.removeLayer(drawnItems);
      try {
        map.doubleClickZoom.enable();
      } catch {
        // ignore
      }
    };
  }, [map]);

  return null;
}
