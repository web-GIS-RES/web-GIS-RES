import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L, { GeoJSON as LeafletGeoJSON } from "leaflet";

// Αν θέλεις να φιλτράρεις ανά περιφέρεια δώσε prop από το MapView
type Props = {
  selectedRegion?: string | null; // π.χ. "Δυτική Μακεδονία" ή undefined για όλα
  refreshKey?: number;            // αν το έχεις στο MapView για force reload
};

type Row = {
  id: number;
  feature: any; // GeoJSON Feature (jsonb)
};

export default function InstallationsLayer({ selectedRegion, refreshKey }: Props) {
  const map = useMap();
  const layerRef = useRef<LeafletGeoJSON | null>(null);

  useEffect(() => {
    if (!map) return;

    // Δημιουργώ ένα κενό GeoJSON layer αν δεν υπάρχει
    if (!layerRef.current) {
      layerRef.current = L.geoJSON(undefined, {
        style: () => ({
          color: "#d33",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.15,
        }),
        onEachFeature: (f: any, l) => {
          const p = f?.properties ?? {};
          const code = p.code ?? "—";
          const pmax = p.power_max != null ? `${p.power_max.toLocaleString("el-GR")} kWh` : "—";
          const pavg = p.power_avg != null ? `${p.power_avg.toLocaleString("el-GR")} kWh` : "—";
          const area = p.area_m2 != null ? `${p.area_m2.toLocaleString("el-GR")} m²` : "—";
          const region = p.region ?? "—";
          l.bindTooltip(
            `<div style="line-height:1.2">
               <b>${code}</b><br/>
               Max: ${pmax}<br/>
               Avg: ${pavg}<br/>
               Area: ${area}<br/>
               Region: ${region}
             </div>`,
            { sticky: true }
          );
        },
      }).addTo(map);
    }

    const ctrl = new AbortController();

    (async () => {
      try {
        const baseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

        // Ζητάμε id,feature από το view που έδειξες
        const url = `${baseUrl}/rest/v1/v_installations_geojson?select=id,feature`;

        const res = await fetch(url, {
          headers: {
            apikey: anon,
            Authorization: `Bearer ${anon}`,
            "Content-Type": "application/json",
          },
          signal: ctrl.signal,
        });

        if (!res.ok) {
          console.error("Installations fetch failed", await res.text());
          return;
        }

        const rows = (await res.json()) as Row[];

        // Κάθε row.feature είναι Feature. Συναρμολογώ FeatureCollection
        let features = rows
          .map((r) => r.feature)
          .filter((f) => f && f.type === "Feature");

        // Προαιρετικό client-side filtering ανά περιφέρεια
        if (selectedRegion && selectedRegion !== "ΟΛΕΣ") {
          const target = selectedRegion.trim().toLowerCase();
          features = features.filter((f) => {
            const reg = (f?.properties?.region ?? "").toString().trim().toLowerCase();
            return reg === target;
          });
        }

        const fc = { type: "FeatureCollection", features };

        // Καθαρίζω & ξαναβάζω τα δεδομένα
        layerRef.current!.clearLayers();
        layerRef.current!.addData(fc as any);
      } catch (err) {
        if ((err as any)?.name !== "AbortError") {
          console.error("Installations load error:", err);
        }
      }
    })();

    return () => {
      ctrl.abort();
    };
  }, [map, selectedRegion, refreshKey]);

  // Καθαρισμός αν unmount
  useEffect(() => {
    return () => {
      if (layerRef.current) {
        layerRef.current.removeFrom(map);
        layerRef.current = null;
      }
    };
  }, [map]);

  return null;
}
