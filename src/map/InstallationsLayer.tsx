// src/map/InstallationsLayer.tsx
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { Feature, FeatureCollection } from "geojson";
import { supabase } from "../supabaseClient";

export type RegionName =
  | "ALL"
  | "Ανατολική Μακεδονία και Θράκη"
  | "Κεντρική Μακεδονία"
  | "Δυτική Μακεδονία"
  | "Ήπειρος"
  | "Θεσσαλία"
  | "Ιόνιες Νήσοι"
  | "Δυτική Ελλάδα"
  | "Στερεά Ελλάδα"
  | "Αττική"
  | "Πελοπόννησος"
  | "Βόρειο Αιγαίο"
  | "Νότιο Αιγαίο"
  | "Κρήτη";

interface Props {
  refreshKey: number;
  regionFilter: RegionName;
}

export default function InstallationsLayer({ refreshKey, regionFilter }: Props) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Καθαρισμός παλιού layer πριν από νέο fetch
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }

      // Βασικό query
      let query = supabase.from("v_installations_geojson").select("id, feature");

      // Φίλτρο περιφέρειας (εκτός από ALL)
      if (regionFilter && regionFilter !== "ALL") {
        // JSONB contains στη στήλη feature->properties
        // (υποστηρίζεται από PostgREST/Supabase)
        query = (query as any).contains("feature->properties", {
          region: regionFilter,
        });
      }

      const { data, error } = await query;

      if (cancelled) return;

      if (error) {
        console.error("Supabase load error:", error);
        return;
      }
      if (!data || data.length === 0) {
        return; // τίποτα να εμφανιστεί
      }

      // Μετατροπή σε FeatureCollection
      const fc: FeatureCollection = {
        type: "FeatureCollection",
        features: data.map((row: any) => row.feature as Feature),
      };

      // Δημιουργία GeoJSON layer
      const geo = L.geoJSON(fc as any, {
        style: () => ({
          color: "#d33",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.15,
        }),
        onEachFeature: (f: any, l: L.Layer) => {
          const p = (f?.properties ?? {}) as any;
          const code = p.code ?? "—";
          const max = p.power_max ?? p.powerMax ?? "—";
          const avg = p.power_avg ?? p.powerAvg ?? "—";
          const area = p.area_m2 ?? p.area ?? "—";

          const html =
            `<div style="line-height:1.3">` +
            `<div><b>${code}</b></div>` +
            `<div>Max: ${Number(max).toLocaleString()} kWh</div>` +
            `<div>Avg: ${Number(avg).toLocaleString()} kWh</div>` +
            `<div>Area: ${Number(area).toLocaleString()} m²</div>` +
            `</div>`;

          (l as L.Path).bindTooltip(html, {
            direction: "center",
            opacity: 0.9,
            sticky: false,
          });
        },
      });

      geo.addTo(map);
      layerRef.current = geo;
    }

    load();

    return () => {
      cancelled = true;
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, refreshKey, regionFilter]);

  return null;
}
