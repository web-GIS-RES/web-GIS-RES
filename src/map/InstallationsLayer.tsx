import { useEffect, useRef } from "react";
import { GeoJSON, useMap } from "react-leaflet";
import type { GeoJSON as LeafletGeoJSON } from "leaflet";
import L from "leaflet";

// Αντλεί τα env για Supabase REST (αν το χρησιμοποιείς)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Τύπος ιδιοτήτων feature (προσαρμοσε στα δικά σου)
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
    let abort = false;

    async function load() {
      // 1) Φέρε GeoJSON από τη view σου
      // Παραδοχή: υπάρχει view π.χ. v_installations_geojson με πεδίο data (FeatureCollection)
      // Αν δεν υπάρχει, προσαρμόζεις το endpoint / format fetch
      if (!SUPABASE_URL || !SUPABASE_ANON) {
        console.warn("Missing Supabase env, falling back to no-data.");
        clearLayer();
        return;
      }

      // Παράδειγμα: PostgREST: select=data (ένα μόνο row με FeatureCollection)
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

      // 2) Client-side φίλτρο με βάση την περιφέρεια (γρήγορο & ασφαλές)
      const filtered = {
        type: "FeatureCollection",
        features: featureCollection.features.filter((f: any) => {
          if (regionFilter === "ALL") return true;
          const p = (f.properties || {}) as InstallProps;
          return (p.region || "") === regionFilter;
        }),
      };

      // 3) Ζωγράφισε/ανανεώσε το GeoJSON layer
      renderLayer(filtered);
    }

    load().catch((e) => {
      console.error(e);
      clearLayer();
    });

    return () => {
      abort = true;
    };

    // Σκανάρει σε refreshKey (π.χ. μετά από νέα εισαγωγή) & regionFilter
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
        const area = p.area_m2 != null ? `${new Intl.NumberFormat("el-GR").format(Math.round(p.area_m2))} m²` : "—";
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

  // Δεν επιστρέφουμε React element, το layer μπαίνει απευθείας στο Leaflet map
  return null;
}
