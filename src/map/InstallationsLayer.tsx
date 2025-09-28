import { useEffect, useState } from "react";
import { GeoJSON } from "react-leaflet";

// Τύπος για το feature που επιστρέφει το view
interface InstallationFeature {
  type: "Feature";
  id: number;
  geometry: any;
  properties: {
    id: number;
    code: string;
    region: string;
    power_max: number | null;
    power_avg: number | null;
    area_m2: number | null;
  };
}

export default function InstallationsLayer() {
  const [features, setFeatures] = useState<InstallationFeature[]>([]);

  async function load() {
    try {
      const base = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/v_installations_geojson`;
      const selected = (window as any).__selectedRegion as string | null | undefined;

      const url =
        selected && selected.trim()
          ? `${base}?select=feature&region=eq.${encodeURIComponent(selected)}`
          : `${base}?select=feature`;

      const resp = await fetch(url, {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      if (!resp.ok) {
        console.error("Failed to fetch installations", await resp.text());
        setFeatures([]);
        return;
      }
      const data = await resp.json(); // [{ id, feature }]
      setFeatures(data.map((row: any) => row.feature));
    } catch (err) {
      console.error("Error loading installations", err);
      setFeatures([]);
    }
  }

  useEffect(() => {
    load();

    const onReload = () => load();
    const onRegion = () => load();

    window.addEventListener("reload-installations", onReload);
    window.addEventListener("region-changed", onRegion);
    return () => {
      window.removeEventListener("reload-installations", onReload);
      window.removeEventListener("region-changed", onRegion);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      onEachFeature={(f: any, l: any) => {
        const p = (f.properties ?? {}) as any;
        const code = p.code ?? "—";
        const pm =
          p.power_max != null ? Number(p.power_max).toLocaleString("el-GR") : "—";
        const pa =
          p.power_avg != null ? Number(p.power_avg).toLocaleString("el-GR") : "—";
        const am2 =
          p.area_m2 != null
            ? `${Math.round(Number(p.area_m2)).toLocaleString("el-GR")} m²`
            : "—";

        l.bindPopup(
          `<b>${code}</b><br/>
           Max: ${pm} kWh<br/>
           Avg: ${pa} kWh<br/>
           Area: ${am2}`
        );

        const tooltipHtml = `<div style="text-align:center;line-height:1.2">
          <div><b>${code}</b></div>
          <div>Max: ${pm} kWh</div>
          <div>Avg: ${pa} kWh</div>
          <div>Area: ${am2}</div>
        </div>`;
        l.bindTooltip(tooltipHtml, {
          permanent: true,
          direction: "center",
          className: "poly-tooltip",
          opacity: 0.95,
        });
      }}
    />
  );
}
