// src/map/InstallationsLayer.tsx
import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const REGIONS = [
  "Όλες",
  "Ανατολική Μακεδονία και Θράκη",
  "Κεντρική Μακεδονία",
  "Δυτική Μακεδονία",
  "Ήπειρος",
  "Θεσσαλία",
  "Ιόνιες Νήσοι",
  "Δυτική Ελλάδα",
  "Στερεά Ελλάδα",
  "Αττική",
  "Πελοπόννησος",
  "Βόρειο Αιγαίο",
  "Νότιο Αιγαίο",
  "Κρήτη",
] as const;
type RegionOption = typeof REGIONS[number];

type Row = {
  id: number;
  region: string | null;
  feature: any; // GeoJSON Feature
};

// --- Safe client bootstrap ---
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";
const hasEnv = Boolean(supabaseUrl && supabaseKey);

let supabase: SupabaseClient | null = null;
if (hasEnv) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  } catch (err) {
    console.error("[InstallationsLayer] Failed to init Supabase client:", err);
    supabase = null;
  }
} else {
  console.error("[InstallationsLayer] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars");
}

export default function InstallationsLayer() {
  const map = useMap();
  const [region, setRegion] = useState<RegionOption>("Όλες");
  const layerRef = useRef<L.GeoJSON | null>(null);
  const controlRef = useRef<L.Control | null>(null);

  const fmt = (v: unknown) =>
    v === null || v === undefined || v === "" || Number.isNaN(Number(v))
      ? "—"
      : Number(v).toLocaleString("el-GR");

  const draw = (features: any[]) => {
    if (layerRef.current) {
      layerRef.current.removeFrom(map);
      layerRef.current = null;
    }

    if (!features || features.length === 0) {
      // καθάρισε αλλά μην «πέσεις»
      return;
    }

    const layer = L.geoJSON(features as any, {
      style: () => ({ weight: 2, opacity: 1, fillOpacity: 0.15 }),
      pointToLayer: (_f, latlng) => L.marker(latlng),
      onEachFeature: (f, l) => {
        const p = (f.properties ?? {}) as any;
        const code = p?.code ?? `#${p?.id ?? "—"}`;
        const r = p?.region ?? "—";
        const pm = fmt(p?.power_max);
        const pa = fmt(p?.power_avg);

        l.bindPopup(
          `<b>${code}</b><br/>Περιφέρεια: ${r}<br/>Pmax: ${pm} kWh<br/>Pavg: ${pa} kWh`
        );

        const tooltipHtml = `<div class="poly-label">
  <div><b>${code}</b></div>
  <div>Max: ${pm} kWh</div>
  <div>Avg: ${pa} kWh</div>
</div>`;
        l.bindTooltip(tooltipHtml, {
          permanent: true,
          direction: "center",
          className: "poly-tooltip",
          opacity: 0.95,
        });
        (l as any).bringToFront?.();
      },
    }).addTo(map);

    layerRef.current = layer;

    try {
      const b = layer.getBounds();
      if (b.isValid()) map.fitBounds(b, { padding: [20, 20] });
    } catch (e) {
      console.warn("[InstallationsLayer] fitBounds failed:", e);
    }
  };

  const fetchData = async (selected: RegionOption) => {
    if (!supabase) {
      console.warn("[InstallationsLayer] Supabase client missing; skipping fetch");
      draw([]); // καθάρισε τυχόν παλιό layer
      return;
    }
    try {
      let q = supabase.from("v_installations_geojson").select("id,region,feature");
      if (selected !== "Όλες") q = q.eq("region", selected);
      const { data, error } = await q;
      if (error) {
        console.error("[InstallationsLayer] Load failed:", error.message);
        draw([]);
        return;
      }
      const features = (data ?? []).map((r: Row) => r.feature);
      draw(features);
    } catch (err: any) {
      console.error("[InstallationsLayer] Unexpected fetch error:", err?.message ?? err);
      draw([]);
    }
  };

  // αρχικό load + αλλαγή περιφέρειας
  useEffect(() => {
    fetchData(region);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  // refresh μετά από insert
  useEffect(() => {
    const h = () => fetchData(region);
    window.addEventListener("reload-installations", h as EventListener);
    return () => window.removeEventListener("reload-installations", h as EventListener);
  }, [region]);

  // Leaflet control για Περιφέρεια
  useEffect(() => {
    const RegionControl = L.Control.extend({
      onAdd: () => {
        const container = L.DomUtil.create("div", "leaflet-bar");
        container.style.background = "white";
        container.style.padding = "6px";
        container.style.borderRadius = "4px";
        container.style.boxShadow = "0 1px 4px rgba(0,0,0,0.2)";

        const label = L.DomUtil.create("label", "", container);
        label.style.display = "block";
        label.style.fontSize = "12px";
        label.style.marginBottom = "4px";
        label.textContent = "Περιφέρεια:";

        const select = L.DomUtil.create("select", "", container) as HTMLSelectElement;
        select.style.maxWidth = "240px";
        if (!hasEnv) select.disabled = true; // αν λείπουν env, απενεργοποίησέ το

        REGIONS.forEach((r) => {
          const opt = document.createElement("option");
          opt.value = r;
          opt.textContent = r;
          select.appendChild(opt);
        });
        select.value = region;

        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        select.addEventListener("change", (e) => {
          const val = (e.target as HTMLSelectElement).value as RegionOption;
          setRegion(val);
        });

        return container;
      },
      onRemove: () => {},
    });

    const ctl = new RegionControl({ position: "topleft" });
    ctl.addTo(map);
    controlRef.current = ctl;

    return () => {
      if (controlRef.current) {
        controlRef.current.remove();
        controlRef.current = null;
      }
    };
  }, [map, region]);

  return null;
}
