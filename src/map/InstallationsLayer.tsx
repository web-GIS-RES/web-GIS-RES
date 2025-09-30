import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { supabase } from "../supabaseClient";

type Props = {
  /** Όταν αλλάζει, γίνεται re-fetch από τη ΒΔ */
  refreshKey?: number;
  /** "ALL" ή ακριβές όνομα περιφέρειας (ελληνικά) */
  regionFilter?: string;
};

export default function InstallationsLayer({ refreshKey, regionFilter }: Props) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Δημιουργούμε (ή καθαρίζουμε) το layer
    if (!layerRef.current) {
      layerRef.current = L.geoJSON(undefined, {
        style: () => ({
          color: "#d33",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.15,
        }),
        onEachFeature: (f: Feature, l: L.Layer) => {
          const p: any = (f.properties ?? {}) as any;
          const code = p?.code ?? "—";
          const max = p?.power_max ?? p?.powerMax ?? "—";
          const avg = p?.power_avg ?? p?.powerAvg ?? "—";
          const area = p?.area_m2 ?? p?.area ?? "—";

          const html =
            `<div style="line-height:1.3">` +
            `<div><b>${code}</b></div>` +
            `<div>Max: ${Number(max).toLocaleString("el-GR")} kWh</div>` +
            `<div>Avg: ${Number(avg).toLocaleString("el-GR")} kWh</div>` +
            `<div>Area: ${Number(area).toLocaleString("el-GR")} m²</div>` +
            `</div>`;

          (l as any).bindTooltip(html, {
            direction: "center",
            opacity: 0.9,
            sticky: false,
          });
        },
      }).addTo(map);
    } else {
      layerRef.current.clearLayers();
    }

    const layer = layerRef.current;

    async function fetchData() {
      // Βασικό query από το view που επιστρέφει ένα Feature ανά γραμμή
      let q = supabase.from("v_installations_geojson").select("feature");

      // Φίλτρο περιφέρειας (εκτός από ALL)
      if (regionFilter && regionFilter !== "ALL") {
        // JSONB contains στο feature.properties.region
        q = (q as any).contains("feature->properties", { region: regionFilter });
      }

      const { data, error } = await q;

      if (cancelled) return;

      if (error) {
        console.error("Supabase load error:", error);
        return;
      }

      const features: Feature<Geometry>[] = (data ?? [])
        .map((r: any) => r.feature as Feature<Geometry>)
        .filter((f) => f && f.geometry);

      const fc: FeatureCollection = {
        type: "FeatureCollection",
        features,
      };

      layer?.addData(fc as any);

      // Προσπάθησε να κάνεις zoom στο σύνολο
      try {
        const b = layer?.getBounds();
        if (b && b.isValid()) {
          map.fitBounds(b.pad(0.15));
        }
      } catch {
        // ignore
      }
    }

    fetchData();

    return () => {
      cancelled = true;
      // Δεν αφαιρούμε το layer από το map για να μη «τρεμοπαίζει» σε re-renders,
      // αλλά αν θες πλήρη cleanup, μπορείς να το ενεργοποιήσεις:
      // if (layerRef.current) {
      //   map.removeLayer(layerRef.current);
      //   layerRef.current = null;
      // }
    };
  }, [map, refreshKey, regionFilter]);

  return null;
}
