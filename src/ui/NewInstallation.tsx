// src/ui/NewInstallation.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import type L from "leaflet";

type Props = { map: L.Map | null };

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

type Pair = { lon: string; lat: string };

export default function NewInstallation({ map }: Props) {
  const dlgRef = useRef<HTMLDialogElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // form state
  const [code, setCode] = useState("");
  const [powerMax, setPowerMax] = useState<string>("");
  const [powerAvg, setPowerAvg] = useState<string>("");
  const [vertices, setVertices] = useState<number>(3);
  const [region, setRegion] = useState<typeof REGIONS[number]>("Δυτική Μακεδονία");
  const [pairs, setPairs] = useState<Pair[]>([{ lon: "", lat: "" }, { lon: "", lat: "" }, { lon: "", lat: "" }]);
  const [csv, setCsv] = useState("");

  // προσωρινό layer προεπισκόπησης
  const previewLayer = useRef<L.Layer | null>(null);

  // --- ανοίγει/κλείνει dialog
  useEffect(() => {
    const d = dlgRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // draggable header (ως προς την οθόνη)
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

  // συγχρονισμός πλήθους κορυφών με inputs
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

  // Parse csv (δέχεται και ελληνικούς δεκαδικούς με κόμμα)
  const parseCsv = () => {
    const lines = csv
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const parsed: Pair[] = [];
    for (const line of lines) {
      // 21,770 40,350  ή  21.770,40.350  ή  21.770 40.350
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
      previewFromInputs(parsed);
    } else {
      alert("Χρειάζονται τουλάχιστον 3 ζεύγη (lon lat) για πολύγωνο.");
    }
  };

  // χτίσιμο WKT από ζεύγη
  const toWKT = (pp: Pair[]) => {
    const coords = pp.map((p) => `${Number(p.lon)} ${Number(p.lat)}`);
    if (coords[0] !== coords[coords.length - 1]) coords.push(coords[0]); // κλείσιμο
    return `POLYGON((${coords.join(", ")}))`;
  };

  // Προεπισκόπηση πάνω στον χάρτη
  const previewFromInputs = (pp: Pair[] = pairs) => {
    if (!map) return;
    try {
      // καθάρισε παλιά
      if (previewLayer.current) {
        map.removeLayer(previewLayer.current as any);
        previewLayer.current = null;
      }
      // έλεγξε τιμές
      const pts = pp
        .map((p) => [Number(p.lat), Number(p.lon)] as [number, number])
        .filter(([la, lo]) => isFinite(la) && isFinite(lo));
      if (pts.length < 3) return;

      const poly = (window as any).L?.polygon(pts, {
        weight: 2,
        opacity: 1,
        fillOpacity: 0.15,
      });
      if (poly) {
        poly.addTo(map);
        previewLayer.current = poly;
        const b = poly.getBounds();
        if (b.isValid()) map.fitBounds(b, { padding: [20, 20] });
      }
    } catch (e) {
      console.error("Preview error:", e);
    }
  };

  // καθάρισε preview όταν κλείνει
  useEffect(() => {
    if (open) return;
    if (map && previewLayer.current) {
      map.removeLayer(previewLayer.current as any);
      previewLayer.current = null;
    }
  }, [open, map]);

  // Submit → Netlify Function
  const onSubmit = async () => {
    if (!code.trim()) return alert("Δώσε κωδικό εγκατάστασης.");
    const nums = pairs
      .map((p) => ({ lon: Number(p.lon), lat: Number(p.lat) }))
      .filter((p) => isFinite(p.lon) && isFinite(p.lat));
    if (nums.length < 3) return alert("Χρειάζονται τουλάχιστον 3 έγκυρα σημεία.");

    const wkt = toWKT(
      nums.map((n) => ({ lon: String(n.lon), lat: String(n.lat) }))
    );

    const body = {
      code: code.trim(),
      power_max: Number(powerMax || 0),
      power_avg: Number(powerAvg || 0),
      region,
      wkt,
    };

    try {
      const res = await fetch("/.netlify/functions/create-installation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      // refresh χάρτη
      window.dispatchEvent(new Event("reload-installations"));
      setOpen(false);
      // καθάρισε preview
      if (map && previewLayer.current) {
        map.removeLayer(previewLayer.current as any);
        previewLayer.current = null;
      }
    } catch (e: any) {
      alert("Αποτυχία καταχώρησης: " + (e?.message ?? e));
    }
  };

  // Portal target
  const portalTarget = useMemo(() => document.body, []);

  // UI
  const form = (
    <>
      <button
        style={{
          position: "fixed",
          right: 12,
          top: 12,
          zIndex: 1000,
          padding: "8px 12px",
        }}
        onClick={() => setOpen(true)}
      >
        NEW INSTALLATION
      </button>

      <dialog ref={dlgRef} style={{ width: 560, maxWidth: "95vw" }}>
        <div ref={headerRef} style={{ cursor: "move", margin: "-8px -8px 8px", padding: "8px", background: "#f0f0f0" }}>
          <b>New Installation</b>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8 }}>
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
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <label>Power Max (kWh)</label>
          <input inputMode="decimal" value={powerMax} onChange={(e) => setPowerMax(e.target.value)} />

          <label>Power Avg (kWh)</label>
          <input inputMode="decimal" value={powerAvg} onChange={(e) => setPowerAvg(e.target.value)} />
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
          Επικόλλησε lon,lat ανά γραμμή (δέχεται τελείες/κόμματα).
        </div>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={6}
          style={{ width: "100%", marginTop: 6 }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button onClick={parseCsv}>Parse CSV → Preview on map</button>
          <button onClick={() => previewFromInputs()}>Preview from inputs</button>
          <button onClick={() => { setCsv(""); }}>Clear</button>
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
                    const next = [...prev]; next[i] = { ...next[i], lon: v }; return next;
                  });
                }}
              />
              <input
                placeholder="Latitude"
                value={p.lat}
                onChange={(e) => {
                  const v = e.target.value;
                  setPairs((prev) => {
                    const next = [...prev]; next[i] = { ...next[i], lat: v }; return next;
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
