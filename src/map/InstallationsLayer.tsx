import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { createClient } from "@supabase/supabase-js";

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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

export default function InstallationsLayer() {
  const map = useMap();
  const [region, setRegion] = useState<RegionOption>("Όλες");
  const layerRef = useRef<L.GeoJSON | null>(null);
  const controlRef = useRef<L.Control | null>(null);

  const fmt = (v: unknown) =>
    v === null || v === undefined || v === "" ? "—" : Number(v).toLocaleString("el-GR");

  const draw = (features: any[]) => {
    if (layerRef.current) {
      layerRef.current.removeFrom(map);
      layerRef.current = null;
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

        // Popup (click)
        l.bindPopup(
          `<b>${code}</b><br/>Περιφέρεια: ${r}<br/>Pmax: ${pm} kWh<br/>Pavg: ${pa} kWh`
        );

        // Μόνιμη ετικέτα ΜΕΣΑ στο πολύγωνο (3 γραμμές)
        // Χρησιμοποιούμε Leaflet Tooltip ως "label"
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

        // Βοηθάει ώστε οι ετικέτες να μην κρύβονται από άλλες στρώσεις
        (l as any).bringToFront?.();
      },
    }).addTo(map);

    layerRef.current = layer;

    // Προαιρετικό autofit αν θες να χωράνε όλα:
    try {
      const b = layer.getBounds();
      if (b.isValid()) map.fitBounds(b, { padding: [20, 20] });
    } catch {
      // ignore
    }
  };

  const fetchData = async (selected: RegionOption) => {
    // Φέρνουμε από το view (βλ. v_installations_geojson με στήλη region + feature)
    let q = supabase.from("v_installations_geojson").select("id,region,feature");
    if (selected !== "Όλες") q = q.eq("region", selected);

    const { data, error } = await q;
    if (error) {
      alert("Load failed: " + error.message);
      return;
    }
    const features = (data ?? []).map((r: Row) => r.feature);
    draw(features);
  };

  // (3) Φόρτωση στην αρχή + σε αλλαγή περιφέρειας
  useEffect(() => {
    fetchData(region);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  // Ανανέωση μετά από insert (π.χ. από NewInstallation → dispatch 'reload-installations')
  useEffect(() => {
    const h = () => fetchData(region);
    window.addEventListener("reload-installations", h as EventListener);
    return () => window.removeEventListener("reload-installations", h as EventListener);
  }, [region]);

  // Leaflet control (πάνω-αριστερά) για επιλογή Περιφέρειας
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

        REGIONS.forEach((r) => {
          const opt = document.createElement("option");
          opt.value = r;
          opt.textContent = r;
          select.appendChild(opt);
        });
        select.value = region;

        // Μην κάνεις drag το map όταν ο χρήστης αλληλεπιδρά με το control
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
