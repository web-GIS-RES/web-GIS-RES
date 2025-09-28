import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import * as L from "leaflet";

type Pair = { lon: string; lat: string };

const REGIONS = [
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

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.7,
};

const grid2Cols: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "140px 1fr",
  gap: 8,
};

const btnBar: React.CSSProperties = {
  display: "flex",
  gap: 8,
  marginTop: 6,
};

const fixedButton: React.CSSProperties = {
  position: "fixed",
  right: 12,
  top: 12,
  zIndex: 1000,
  padding: "8px 12px",
};

export default function NewInstallation({ onClose }: { onClose?: () => void }) {
  const dlgRef = useRef<HTMLDialogElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const [code, setCode] = useState("");
  const [powerMax, setPowerMax] = useState<string>("");
  const [powerAvg, setPowerAvg] = useState<string>("");
  const [region, setRegion] = useState<(typeof REGIONS)[number]>("Δυτική Μακεδονία");
  const [vertices, setVertices] = useState<number>(3);
  const [pairs, setPairs] = useState<Pair[]>([{ lon: "", lat: "" }, { lon: "", lat: "" }, { lon: "", lat: "" }]);
  const [csv, setCsv] = useState("");

  const previewLayer = useRef<L.Polygon | null>(null);

  // open/close dialog programmatically
  useEffect(() => {
    const d = dlgRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // draggable header (ως προς οθόνη)
  useEffect(() => {
    const header = headerRef.current;
    const dlg = dlgRef.current;
    if (!header || !dlg) return;

    let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;

    const onDown = (e: MouseEvent) => {
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      const rect = dlg.getBoundingClientRect();
      ox = rect.left; oy = rect.top;
      e.preventDefault();
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      dlg.style.left = `${ox + dx}px`;
      dlg.style.top = `${oy + dy}px`;
      dlg.style.margin = "0";
      dlg.style.position = "fixed";
    };
    const onUp = () => (dragging = false);

    header.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      header.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // sync αριθμός κορυφών ↔ inputs
  useEffect(() => {
    setPairs((prev) => {
      const next = [...prev];
      if (vertices > prev.length) {
        for (let i = prev.length; i < vertices; i++) next.push({ lon: "", lat: "" });
      } else if (vertices < prev.length) {
        next.length = Math.max(0, vertices);
      }
      return next;
    });
  }, [vertices]);

  // helper: δημιουργία WKT από pairs
  const toWKT = (pp: Pair[]) => {
    const nums = pp
      .map((p) => [Number(p.lon), Number(p.lat)] as [number, number])
      .filter(([lon, lat]) => isFinite(lon) && isFinite(lat));
    if (nums.length < 3) return "";
    const ring = nums.map(([lon, lat]) => `${lon} ${lat}`);
    if (ring[0] !== ring[ring.length - 1]) ring.push(ring[0]);
    return `POLYGON((${ring.join(", ")}))`;
  };

  // προεπισκόπηση στο χάρτη (αν έχεις αποθηκεύσει global map)
  const previewFrom = (pp: Pair[] = pairs) => {
    const map = (window as any).__leafletMap as L.Map | undefined;
    if (!map) return; // προαιρετικό
    try {
      if (previewLayer.current) {
        map.removeLayer(previewLayer.current);
        previewLayer.current = null;
      }
      const pts = pp
        .map((p) => [Number(p.lat), Number(p.lon)] as [number, number])
        .filter(([la, lo]) => isFinite(la) && isFinite(lo));
      if (pts.length < 3) return;

      const poly = L.polygon(pts, { weight: 2, opacity: 1, fillOpacity: 0.15 });
      poly.addTo(map);
      previewLayer.current = poly;
      const b = poly.getBounds();
      if (b.isValid()) map.fitBounds(b, { padding: [20, 20] });
    } catch (e) {
      console.error("Preview error:", e);
    }
  };

  // clear preview όταν κλείνει
  useEffect(() => {
    if (open) return;
    const map = (window as any).__leafletMap as L.Map | undefined;
    if (map && previewLayer.current) {
      map.removeLayer(previewLayer.current);
      previewLayer.current = null;
    }
  }, [open]);

  // Parse CSV (lon,lat ανά γραμμή, δέχεται και κόμματα)
  const parseCsv = () => {
    const lines = csv
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const parsed: Pair[] = [];
    for (const line of lines) {
      const parts = line.replace(/;/g, " ").replace(/,/g, ".").split(/\s+/);
      if (parts.length < 2) continue;
      const lon = parts[0], lat = parts[1];
      if (isFinite(Number(lon)) && isFinite(Number(lat))) {
        parsed.push({ lon, lat });
      }
    }
    if (parsed.length >= 3) {
      setVertices(parsed.length);
      setPairs(parsed);
      previewFrom(parsed);
    } else {
      alert("Χρειάζονται τουλάχιστον 3 ζεύγη (lon lat) για πολύγωνο.");
    }
  };

  const onSubmit = async () => {
    if (!code.trim()) return alert("Δώσε κωδικό εγκατάστασης.");

    const nums = pairs
      .map((p) => ({ lon: Number(p.lon), lat: Number(p.lat) }))
      .filter((p) => isFinite(p.lon) && isFinite(p.lat));
    if (nums.length < 3) return alert("Χρειάζονται τουλάχιστον 3 έγκυρα σημεία.");

    const wkt = toWKT(pairs);
    const body = {
      code: code.trim(),
      power_max: Number(powerMax || 0),
      power_avg: Number(powerAvg || 0),
      region,
      // ✨ στέλνουμε ΚΑΙ coords ΚΑΙ wkt
      coords: nums.map(({ lon, lat }) => [lon, lat] as [number, number]),
      wkt,
    };

    try {
      const res = await fetch("/.netlify/functions/create-installation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text);

      // ενημέρωση layer
      window.dispatchEvent(new Event("reload-installations"));
      setOpen(false);
      onClose?.();

      // καθάρισε preview
      const map = (window as any).__leafletMap as L.Map | undefined;
      if (map && previewLayer.current) {
        map.removeLayer(previewLayer.current);
        previewLayer.current = null;
      }
    } catch (e: any) {
      alert("Αποτυχία καταχώρησης: " + (e?.message ?? e));
    }
  };

  const portalTarget = useMemo(() => document.body, []);

  const form = (
    <>
      <button style={fixedButton} onClick={() => setOpen(true)}>
        NEW INSTALLATION
      </button>

      <dialog ref={dlgRef} style={{ width: 560, maxWidth: "95vw" }}>
        <div
          ref={headerRef}
          style={{ cursor: "move", margin: "-8px -8px 8px", padding: "8px", background: "#f0f0f0" }}
        >
          <b>New Installation</b>
        </div>

        <div style={grid2Cols}>
          <label>Code</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} />

          <label>Vertices (≥3)</label>
          <input
            type="number"
            min={3}
            value={vertices}
            onChange={(e) => setVertices(Math.max(3, Number(e.target.value || 3)))}
          />

          <label>Region</label>
          <select value={region} onChange={(e) => setRegion(e.target.value as any)}>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <label>Power Max (kWh)</label>
          <input inputMode="decimal" value={powerMax} onChange={(e) => setPowerMax(e.target.value)} />

          <label>Power Avg (kWh)</label>
          <input inputMode="decimal" value={powerAvg} onChange={(e) => setPowerAvg(e.target.value)} />
        </div>

        <div style={{ marginTop: 10, ...labelStyle }}>
          Επικόλλησε lon,lat ανά γραμμή (δέχεται τελείες/κόμματα).
        </div>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={6}
          style={{ width: "100%", marginTop: 6 }}
        />
        <div style={btnBar}>
          <button onClick={parseCsv}>Parse CSV → Preview on map</button>
          <button onClick={() => setCsv("")}>Clear</button>
          <button onClick={() => previewFrom()}>Preview from inputs</button>
        </div>

        <div style={{ marginTop: 10, fontWeight: 600 }}>Coordinates (lon, lat)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {pairs.map((p, i) => (
            <div key={i} style={{ display: "contents" }}>
              <input
                placeholder="Longitude"
                value={p.lon}
                onChange={(e) => {
                  const v = e.target.value;
                  setPairs((prev) => {
                    const next = [...prev];
                    next[i] = { ...next[i], lon: v };
                    return next;
                  });
                }}
              />
              <input
                placeholder="Latitude"
                value={p.lat}
                onChange={(e) => {
                  const v = e.target.value;
                  setPairs((prev) => {
                    const next = [...prev];
                    next[i] = { ...next[i], lat: v };
                    return next;
                  });
                }}
              />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          <button onClick={() => setOpen(false)}>CANCEL</button>
          <button onClick={onSubmit}>ENTER</button>
        </div>
      </dialog>
    </>
  );

  return ReactDOM.createPortal(form, portalTarget);
}
