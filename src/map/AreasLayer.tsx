import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

const API = import.meta.env.VITE_SUPABASE_URL + "/rest/v1/rpc/fn_areas_bbox";
const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function AreasLayer() {
  const map = useMap();

  useEffect(() => {
    // ξεχωριστό pane για να μην «κλέβει» events από το draw
    if (!map.getPane("areasPane")) {
      map.createPane("areasPane");
      const pane = map.getPane("areasPane");
      if (pane) pane.style.zIndex = "250";
    }

    const layer = L.geoJSON(undefined, {
      pane: "areasPane",
      interactive: false,
      style: () => ({ weight: 2, opacity: 1, fillOpacity: 0.15 }),
      pointToLayer: (_f, latlng) =>
        L.marker(latlng, { interactive: false, keyboard: false }),
      onEachFeature: (f, l) => {
        const p = (f.properties ?? {}) as any;
        const n = p?.name ?? "—";
        l.bindPopup(`<b>${n}</b>`);
      }
    }).addTo(map);

    const loadData = async () => {
      const b = map.getBounds();
      const body = {
        minx: b.getWest(),
        miny: b.getSouth(),
        maxx: b.getEast(),
        maxy: b.getNorth()
      };
      try {
        const resp = await fetch(API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: API_KEY,
            Authorization: `Bearer ${API_KEY}`
          },
          body: JSON.stringify(body)
        });
        if (!resp.ok) {
          console.error("Supabase RPC error:", await resp.text());
          return;
        }
        const fc = await resp.json();
        layer.clearLayers().addData(fc as any);
      } catch (err) {
        console.error("Network error", err);
      }
    };

    loadData();
    map.on("moveend", loadData);
    map.on("reload-areas", loadData);

    return () => {
      map.off("moveend", loadData);
      map.off("reload-areas", loadData);
      map.removeLayer(layer);
    };
  }, [map]);

  return null;
}
