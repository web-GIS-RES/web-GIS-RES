import { useEffect, useState, useRef } from "react";
import { GeoJSON } from "react-leaflet";

interface InstallationFeature {
  type: "Feature";
  id: number | string; // string για optimistic προσωρινό
  geometry: any;
  properties: {
    id?: number;
    code: string;
    region: string;
    power_max: number | null;
    power_avg: number | null;
    area_m2: number | null;
    __optimistic__?: boolean; // flag για προσωρινά
  };
}

export default function InstallationsLayer({ refreshKey }: { refreshKey: number }) {
  const [features, setFeatures] = useState<InstallationFeature[]>([]);
  const loadingRef = useRef(false);

  const load = async () => {
    try {
      loadingRef.current = true;
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
        return;
      }
      const rows = await resp.json(); // [{ id, feature }]
      const serverFeatures: InstallationFeature[] = rows.map((r: any) => r.feature);

      // Αντικατάστησε ΟΛΑ με αυτά του server (καθαρίζει optimistic)
      setFeatures(serverFeatures);
    } catch (err) {
      console.error("Error loading installations", err);
    } finally {
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    load();

    const onRegion = () => load();
    window.addEventListener("region-changed", onRegion);

    // Ακούς αισιόδοξες προσθήκες
    const onOptimistic = (e: Event) => {
      const ce = e as CustomEvent<InstallationFeature>;
      const f = ce.detail;
      setFeatures((prev) => [...prev, f]);
    };
    window.addEventListener("optimistic-installation", onOptimistic as EventListener);

    return () => {
      window.removeEventListener("region-changed", onRegion);
      window.removeEventListener("optimistic-installation", onOptimistic as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  if (!features.length) return null;

  return (
    <GeoJSON
      key={`installations-${refreshKey}`}
      data={features as any}
      style={(f: any) => {
        const p = f?.properties ?? {};
        const isTmp = !!p.__optimistic__;
        return {
          color: isTmp ? "#1f77b4" : "#d62728", // μπλε για προσωρινά, κόκκινο για κανονικά
          weight: 2,
          opacity: 1,
          fillOpacity: isTmp ? 0.35 : 0.2,
        };
      }}
      onEachFeature={(f: any, l: any) => {
        const p = (f.properties ?? {}) as any;
        const code = p.code ?? "—";
        const pm = p.power_max != null ? Number(p.power_max).toLocaleString("el-GR") : "—";
        const pa = p.power_avg != null ? Number(p.power_avg).toLocaleString("el-GR") : "—";
        const am2 =
          p.area_m2 != null
            ? `${Math.round(Number(p.area_m2)).toLocaleString("el-GR")} m²`
            : "—";
        const tmp = p.__optimistic__ ? " (προσωρινό)" : "";

        l.bindPopup(
          `<b>${code}${tmp}</b><br/>
           Max: ${pm} kWh<br/>
           Avg: ${pa} kWh<br/>
           Area: ${am2}`
        );

        const tooltipHtml = `<div style="text-align:center;line-height:1.2">
          <div><b>${code}${tmp}</b></div>
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
