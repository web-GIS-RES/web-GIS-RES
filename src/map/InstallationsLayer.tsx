// src/map/InstallationsLayer.tsx
import { useEffect, useMemo, useState } from "react";
import { GeoJSON } from "react-leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { supabase } from "../supabaseClient";

type Props = {
  refreshKey?: number;
  /** "ALL" για όλες ή ακριβές όνομα περιφέρειας (π.χ. "Δυτική Μακεδονία") */
  regionFilter?: string | null;
};

type Row = {
  id?: number;
  feature: Feature<Geometry, any>; // από το view v_installations_geojson
};

export default function InstallationsLayer({
  refreshKey = 0,
  regionFilter = "ALL",
}: Props) {
  const [features, setFeatures] = useState<Feature<Geometry, any>[]>([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data, error } = await supabase
        .from("v_installations_geojson")
        .select("id,feature");

      if (error) {
        console.error("Error fetching v_installations_geojson:", error);
        return;
      }

      if (!alive || !Array.isArray(data)) return;

      // Βεβαιώνουμε ότι παίρνουμε μόνο έγκυρα Feature objects
      const feats: Feature<Geometry, any>[] = data
        .map((r: Row) => r?.feature)
        .filter((f): f is Feature<Geometry, any> => !!f && f.type === "Feature");

      setFeatures(feats);
    })();

    return () => {
      alive = false;
    };
  }, [refreshKey]);

  // Client-side filter ανά περιφέρεια από properties.region
  const filteredFeatures = useMemo(() => {
    if (!regionFilter || regionFilter === "ALL") return features;
    const target = regionFilter.trim().toLowerCase();
    return features.filter((f) => {
      const reg = (f.properties?.region ?? "").toString().trim().toLowerCase();
      return reg === target;
    });
  }, [features, regionFilter]);

  // Φτιάχνουμε αυστηρά τυποποιημένο FeatureCollection για το GeoJSON layer
  const fc: FeatureCollection<Geometry, any> = useMemo(
    () => ({
      type: "FeatureCollection",
      features: filteredFeatures,
    }),
    [filteredFeatures]
  );

  return (
    <GeoJSON
      key={refreshKey}
      data={fc as any} // το react-leaflet δέχεται GeoJsonObject — κάνουμε cast για ησυχία στον TS
      style={() => ({
        color: "#d33",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.15,
      })}
      onEachFeature={(feature, layer) => {
        const p = (feature.properties ?? {}) as any;
        const code = p.code ?? "—";
        const pmax =
          p.power_max != null ? `${Number(p.power_max).toLocaleString("el-GR")} kWh` : "—";
        const pavg =
          p.power_avg != null ? `${Number(p.power_avg).toLocaleString("el-GR")} kWh` : "—";
        const area =
          p.area_m2 != null ? `${Number(p.area_m2).toLocaleString("el-GR")} m²` : "—";
        const region = p.region ?? "—";

        layer.bindTooltip(
          `<div style="line-height:1.2">
             <b>${code}</b><br/>
             Max: ${pmax}<br/>
             Avg: ${pavg}<br/>
             Area: ${area}<br/>
             Region: ${region}
           </div>`,
          { sticky: true }
        );
      }}
    />
  );
}
