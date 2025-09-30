// src/map/InstallationsLayer.tsx
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import type { GeoJSON as LeafletGeoJSON } from "leaflet";
import L from "leaflet";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

type InstallProps = {
  id: number;
  code: string;
  power_max: number | null;
  power_avg: number | null;
  region?: string | null;
  area_m2?: number | null;
};

type Props = {
  refreshKey?: number;
  regionFilter?: string | "ALL";
};

export default function InstallationsLayer({ refreshKey = 0, regionFilter = "ALL" }: Props) {
  const map = useMap();
  const layerRef = useRef<LeafletGeoJSON | null>(null);

  useEffect(() => {
    (async function load() {
      if (!SUPABASE_URL || !SUPABASE_ANON) {
        console.warn("Missing Supabase env, no installations will load.");
        clearLayer();
        return;
      }

      // Φέρνουμε FeatureCollection από view π.χ. v_installations_geojson (στήλη data)
      const url = `${SUPABASE_URL}/rest/v1/v_installations_geojson?select=data`;
      const resp = await fetch(url, {
        headers: {
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${SUPABASE_ANON}`,
        },
      });

      if (!resp.ok) {
        console.error("Failed to fetch installations:", await resp.text());
        clearLayer();
        return;
      }

      const rows = await resp.json();
      const featureCollection = rows?.[0]?.data;
      if (!featureCollection || featureCollection.type !== "FeatureCollection") {
        clearLayer();
        return;
      }

      // Client-side φίλτρο Περιφέρειας (γρήγορο/απλό)
      const filtered = {
        type: "FeatureCollection",
        features: featureCollection.features.filter((f: any) => {
          if (regionFilter === "ALL") return true;
          const p = (f.properties || {}) as InstallProps;
          return (p.region || "") === regionFilter;
        }),
      };

      renderLayer(filtered);
    })().catch((e) => {
      console.error(e);
      clearLayer();
    });

    // ανανέωση σε refreshKey ή αλλαγή φίλτρου
  }, [refreshKey, regionFilter, map]);

  function clearLayer() {
    if (layerRef.current) {
      layerRef.current.remove();
      layerRef.current = null;
    }
  }

  function renderLayer(geojson: any) {
    clearLayer();

    const gj = L.geoJSON(geojson, {
      style: () => ({ color: "#d33", weight: 2, opacity: 0.9, fillOpacity: 0.2 }),
      onEachFeature: (f, l) => {
        const p = (f.properties || {}) as InstallProps;
        const code = p.code ?? "—";
        const max = p.power_max ?? "—";
        const avg = p.power_avg ?? "—";
        const area =
          p.area_m2 != null
            ? `${new Intl.NumberFormat("el-GR").format(Math.round(p.area_m2))} m²`
            : "—";
        const reg = p.region ?? "—";

        l.bindTooltip(
          `<div style="line-height:1.3">
            <div style="font-weight:700">${code}</div>
            <div>Max: ${max} kWh</div>
            <div>Avg: ${avg} kWh</div>
            <div>Area: ${area}</div>
            <div>Region: ${reg}</div>
          </div>`,
          { sticky: true, direction: "center", opacity: 0.85 }
        );
      },
    });

    gj.addTo(map);
    layerRef.current = gj;
  }

  return null;
}
