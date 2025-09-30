import { useEffect } from "react";
import { GeoJSON } from "react-leaflet";
import type { FeatureCollection } from "geojson";
import supabase from "../supabaseClient";

type Props = {
  refreshKey?: number;
  /** "ALL" ή το όνομα της περιφέρειας */
  regionFilter?: string;
};

export default function InstallationsLayer({ refreshKey, regionFilter }: Props) {
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const { data, error } = await supabase.from("installations").select("*");
      if (error) {
        console.error("Error fetching installations:", error);
        return;
      }
      if (!isMounted) return;

      let features = (data || []).map((row: any) => ({
        type: "Feature",
        geometry: row.geom,
        properties: {
          id: row.id,
          name: row.name,
          region: row.region,
        },
      }));

      // Αν υπάρχει φίλτρο περιφέρειας
      if (regionFilter && regionFilter !== "ALL") {
        features = features.filter((f) => f.properties.region === regionFilter);
      }

      const geojson: FeatureCollection = {
        type: "FeatureCollection",
        features: features as any,
      };

      const layer = new (window as any).L.GeoJSON(geojson, {
        onEachFeature: (feature: any, layer: any) => {
          if (feature.properties) {
            layer.bindPopup(
              `<b>${feature.properties.name}</b><br/>Περιφέρεια: ${feature.properties.region}`
            );
          }
        },
      });

      // Καθαρισμός παλιών geojson layers
      (window as any).map.eachLayer((l: any) => {
        if (l instanceof (window as any).L.GeoJSON) {
          (window as any).map.removeLayer(l);
        }
      });

      layer.addTo((window as any).map);
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [refreshKey, regionFilter]);

  return null;
}
