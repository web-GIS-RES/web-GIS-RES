import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

const API = import.meta.env.VITE_SUPABASE_URL + "/rest/v1/rpc/fn_installations_bbox";
const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function InstallationsLayer() {
  const map = useMap();

  useEffect(() => {
    if (!map.getPane("installationsPane")) {
      map.createPane("installationsPane");
      map.getPane("installationsPane")!.style.zIndex = "250";
    }

    const layer = L.geoJSON(undefined, {
      pane: "installationsPane",
      interactive: false,
      style: () => ({ color: "#1976d2", weight: 2, opacity: 1, fillOpacity: 0.15 }),
      onEachFeature: (f, l) => {
        const p = (f.properties ?? {}) as any;
        const html = `
          <div style="min-width:180px">
            <b>${p?.code ?? "—"}</b><br/>
            Max: ${p?.power_max ?? "—"}<br/>
            Avg: ${p?.power_avg ?? "—"}<br/>
          </div>
        `;
        l.bindPopup(html);
      },
      pointToLayer: (_f, latlng) => L.marker(latlng, { interactive: false }),
    }).addTo(map);

    const loadData = async () => {
      const b = map.getBounds();
      const body = {
        minx: b.getWest(),
        miny: b.getSouth(),
        maxx: b.getEast(),
        maxy: b.getNorth(),
      };

      try {
        const resp = await fetch(API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: API_KEY,
            Authorization: `Bearer ${API_KEY}`,
          },
          body: JSON.stringify(body),
        });
        if (!resp.ok) {
          console.error("bbox rpc error:", await resp.text());
          return;
        }
        const fc = await resp.json();
        layer.clearLayers().addData(fc as any);
      } catch (e) {
        console.error("network error", e);
      }
    };

    loadData();
    map.on("moveend", loadData);
    map.on("reload-installations", loadData);

    return () => {
      map.off("moveend", loadData);
      map.off("reload-installations", loadData);
      map.removeLayer(layer);
    };
  }, [map]);

  return null;
}
