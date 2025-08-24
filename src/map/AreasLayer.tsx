import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API = import.meta.env.VITE_SUPABASE_URL + "/rest/v1/rpc/fn_areas_bbox";
const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface Props {
  map: L.Map;
}

export default function AreasLayer({ map }: Props) {
  useEffect(() => {
    const layer = L.geoJSON(undefined, {
      interactive: false,
      style: () => ({ weight: 2, opacity: 1, fillOpacity: 0.15 }),
      pointToLayer: (_f, latlng) => L.marker(latlng),
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

    map.on("moveend", loadData);
    loadData();

    return () => {
      map.off("moveend", loadData);
      map.removeLayer(layer);
    };
  }, [map]);

  return null;
}
