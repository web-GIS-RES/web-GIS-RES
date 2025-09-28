import { useEffect, useState } from "react";
import { GeoJSON } from "react-leaflet";
import L, { GeoJSON as LeafletGeoJSON, Layer } from "leaflet";

// Τύπος για το feature που επιστρέφει το view
interface InstallationFeature {
  type: "Feature";
  id: number;
  geometry: any;
  properties: {
    id: number;
    code: string;
    region: string;
    power_max: number;
    power_avg: number;
    area_m2: number;
  };
}

export default function InstallationsLayer() {
  const [features, setFeatures] = useState<InstallationFeature[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/v_installations_geojson`,
          {
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
          }
        );
        if (!resp.ok) {
          console.error("Failed to fetch installations", await resp.text());
          return;
        }
        const data = await resp.json();
        // data είναι array από { id, feature }
        setFeatures(data.map((row: any) => row.feature));
      } catch (err) {
        console.error("Error loading installations", err);
      }
    }
    load();
  }, []);

  if (!features.length) return null;

  return (
    <GeoJSON
      key="installations"
      data={features as any}
      style={() => ({
        color: "#d62728",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.2,
      })}
      onEachFeature={(f: any, l: Layer) => {
        const p = (f.properties ?? {}) as any;
        const code = p.code ?? "—";
        const pm = p.power_max ?? "—";
        const pa = p.power_avg ?? "—";
        const am2 =
          typeof p.area_m2 === "number"
            ? `${Math.round(p.area_m2).toLocaleString("el-GR")} m²`
            : "—";

        // Popup (click)
        (l as any).bindPopup(
          `<b>${code}</b><br/>
           Max: ${pm} kWh<br/>
           Avg: ${pa} kWh<br/>
           Area: ${am2}`
        );

        // Tooltip (πάνω στο πολύγωνο)
        const tooltipHtml = `<div style="text-align:center;line-height:1.2">
          <div><b>${code}</b></div>
          <div>Max: ${pm} kWh</div>
          <div>Avg: ${pa} kWh</div>
          <div>Area: ${am2}</div>
        </div>`;
        (l as any).bindTooltip(tooltipHtml, {
          permanent: true,
          direction: "center",
          className: "poly-tooltip",
          opacity: 0.95,
        });
      }}
    />
  );
}
