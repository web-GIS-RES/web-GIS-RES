import { useEffect } from "react";
import L from "leaflet";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";

interface Props {
  map: L.Map;
}

export default function DrawGeometries({ map }: Props) {
  useEffect(() => {
    const drawnItems = new L.FeatureGroup().addTo(map);

    const drawControl = new (L.Control as any).Draw({
      draw: {
        marker: true,
        polygon: {
          showArea: true,
          allowIntersection: false,
          finishOnDoubleClick: false   // 🔽 επιτρέπει περισσότερες από 3 κορυφές
        },
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

    const onDrawStart = () => map.doubleClickZoom.disable();
    const onDrawStop = () => map.doubleClickZoom.enable();
    map.on((L as any).Draw.Event.DRAWSTART, onDrawStart);
    map.on((L as any).Draw.Event.DRAWSTOP, onDrawStop);

    map.addControl(drawControl);

    map.on((L as any).Draw.Event.CREATED, async (e: any) => {
      const layer = e.layer;
      drawnItems.addLayer(layer);

      const geojson = layer.toGeoJSON();
      try {
        const resp = await fetch("/.netlify/functions/create-area", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geojson)
        });
        if (!resp.ok) {
          console.error("create-area failed:", await resp.text());
        } else {
          console.log("Area saved OK");
        }
      } catch (err) {
        console.error("Network error saving area:", err);
      }
    });

    return () => {
      map.removeControl(drawControl);
      map.off((L as any).Draw.Event.DRAWSTART, onDrawStart);
      map.off((L as any).Draw.Event.DRAWSTOP, onDrawStop);
    };
  }, [map]);

  return null;
}
