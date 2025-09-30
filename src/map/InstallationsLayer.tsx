// src/map/InstallationsLayer.tsx
import { useEffect, useState } from "react";
import { GeoJSON } from "react-leaflet";
import { supabase } from "../supabaseClient";

type Props = {
  refreshKey?: number;
  selectedRegion?: string; // <-- νέο prop
};

export default function InstallationsLayer({ refreshKey, selectedRegion }: Props) {
  const [features, setFeatures] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      let query = supabase.from("v_installations_geojson").select("feature");

      // Αν έχει επιλεγεί περιφέρεια, φιλτράρουμε
      if (selectedRegion && selectedRegion !== "ΟΛΕΣ") {
        query = query.eq("region", selectedRegion);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error loading installations:", error);
        return;
      }

      if (isMounted && data) {
        const feats = data.map((row: any) => row.feature);
        setFeatures(feats);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [refreshKey, selectedRegion]);

  return (
    <>
      {features.map((f: any, idx: number) => (
        <GeoJSON key={idx} data={f} style={{ color: "red" }} />
      ))}
    </>
  );
}
