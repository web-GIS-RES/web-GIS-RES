import { useState, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

type Coord = { lon: string; lat: string };

/** Κανονικοποιεί αριθμητικά strings με τελείες/κόμματα/χιλιάδες σε μορφή με δεκαδική τελεία. */
function normalizeNumber(input: string): string {
  let s = input.trim().replace(/\s+/g, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      // Κόμμα ως δεκαδικό → βγάλε τελείες (χιλιάδες) και κάνε κόμματα → τελείες
      s = s.replace(/\./g, "").replace(/,/g, ".");
    } else {
      // Τελεία ως δεκαδικό → βγάλε κόμματα (χιλιάδες)
      s = s.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    // Μόνο κόμμα → θεωρείται δεκαδικό
    s = s.replace(/,/g, ".");
  }
  // Αφαίρεση υπολοίπων thousand separators τύπου 1.234.567
  s = s.replace(/(\d)\.(?=\d{3}(\D|$))/g, "$1");
  return s;
}

/** Μετατρέπει κείμενο CSV (lon,lat ανά γραμμή) σε λίστα Coord. Αγνοεί header lon/lat. */
function parseCsvToCoords(text: string): Coord[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const looksLikeHeader = (l: string) => /\blon|lng\b/i.test(l) && /\blat\b/i.test(l);
  const start = lines.length > 0 && looksLikeHeader(lines[0]) ? 1 : 0;

  const coords: Coord[] = [];
  for (let i = start; i < lines.length; i++) {
    const parts = lines[i].split(/[;, \t]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) continue;
    coords.push({ lon: normalizeNumber(parts[0]), lat: normalizeNumber(parts[1]) });
  }
  return coords;
}

export default function NewInstallation() {
  const map = useMap();
  const previewRef = useRef<L.Polygon | null>(null);

  const [code, setCode] = useState("");
  const [powerMax, setPowerMax] = useState<string>("");
  const [powerAvg, setPowerAvg] = useState<string>("");
  const [vertices, setVertices] = useState<number>(3);
  const [coords, setCoords] = useState<Coord[]>([
    { lon: "", lat: "" },
    { lon: "", lat: "" },
    { lon: "", lat: "" },
  ]);

  const [csvText, setCsvText] = useState<string>("");

  const dlgRef = useRef<HTMLDialogElement>(null);
  const open = () => dlgRef.current?.showModal();

  const clearPreview = () => {
    if (previewRef.current) {
      map.removeLayer(previewRef.current);
      previewRef.current = null;
    }
  };

  const close = () => {
    clearPreview();
    dlgRef.current?.close();
  };

  const toLatLngs = (list: Coord[]) =>
    list.map((c) => L.latLng(Number(c.lat), Number(c.lon)));

  const drawPreview = (list: Coord[]) => {
    clearPreview();
    if (list.length < 3) return;

    // Γρήγορο validation πριν το draw
    for (const c of list) {
      const lon = Number(c.lon);
      const lat = Number(c.lat);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
      if (lon < -180 || lon > 180 || lat < -90 || lat > 90) return;
    }

    previewRef.current = L.polygon(toLatLngs(list), {
      color: "#ff9800",
      weight: 2,
      fillOpacity: 0.2,
      dashArray: "6 4",
      interactive: false,
    }).addTo(map);

    try {
      map.fitBounds(previewRef.current.getBounds(), { padding: [20, 20] });
    } catch {
      // ignore
    }
  };

  const onChangeVertices = (n: number) => {
    const val = Math.max(3, (n | 0));
    setVertices(val);
    setCoords((prev) => {
      const next = prev.slice(0, val);
      while (next.length < val) next.push({ lon: "", lat: "" });
      return next;
    });
    const filled = coords.slice(0, val).filter((c) => c.lon && c.lat);
    if (filled.length >= 3) drawPreview(coords.slice(0, val));
  };

  const updateCoord = (index: number, key: "lon" | "lat", value: string) => {
    setCoords((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const parseCsv = () => {
    const parsed = parseCsvToCoords(csvText);
    if (parsed.length < 3) {
      alert("Δώσε τουλάχιστον 3 γραμμές με lon,lat");
      return;
    }
    setCoords(parsed);
    setVertices(parsed.length);
    drawPreview(parsed);
  };

  const pasteFromClipboard = async () => {
    try {
      const txt = await navigator.clipboard.readText();
      setCsvText(txt);
      const parsed = parseCsvToCoords(txt);
      if (parsed.length >= 3) {
        setCoords(parsed);
        setVertices(parsed.length);
        drawPreview(parsed);
      }
    } catch {
      alert("Δεν επιτράπηκε πρόσβαση στο clipboard.");
    }
  };

  const validate = () => {
    if (!code.trim()) return "Code is required";
    const pm = Number(powerMax);
    const pa = Number(powerAvg);
    if (!Number.isFinite(pm) || !Number.isFinite(pa)) return "Power values must be numbers";
    if (coords.length < 3) return "Χρειάζονται τουλάχιστον 3 κορυφές";
    for (let i = 0; i < coords.length; i++) {
      const lon = Number(coords[i].lon);
      const lat = Number(coords[i].lat);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return `Invalid lon/lat at row ${i + 1}`;
      if (lon < -180 || lon > 180) return `Lon out of range at row ${i + 1}`;
      if (lat < -90 || lat > 90) return `Lat out of range at row ${i + 1}`;
    }
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      alert(err);
      return;
    }

    const payload = {
      code: code.trim(),
      power_max: Number(powerMax),
      power_avg: Number(powerAvg),
      coords: coords.map((c) => [Number(c.lon), Number(c.lat)]) as [number, number][],
    };

    try {
      const resp = await fetch("/.netlify/functions/create-installation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const txt = await resp.text();
      if (!resp.ok) {
        alert("Insert failed: " + txt);
        return;
      }
      close(); // κλείσιμο modal + καθάρισμα preview
      window.dispatchEvent(new CustomEvent("reload-installations"));
    } catch (error: any) {
      alert("Network error: " + (error?.message ?? "unknown"));
    }
  };

  return (
    <>
      <button
        onClick={open}
        style={{
          position: "absolute",
          zIndex: 1000,
          top: 12,
          right: 12,
          padding: "8px 12px",
          background: "#1976d2",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        NEW INSTALLATION
      </button>

      <dialog ref={dlgRef} style={{ width: 640, padding: 16 }}>
        <form onSubmit={onSubmit}>
          <h3 style={{ marginTop: 0 }}>New Installation</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
            <label>
              Code<br />
              <input value={code} onChange={(e) => setCode(e.target.value)} required />
            </label>
            <label>
              Vertices (≥3)<br />
              <input
                type="number"
                min={3}
                value={vertices}
                onChange={(e) => onChangeVertices(Number(e.target.value))}
              />
            </label>
            <label>
              Power Max<br />
              <input inputMode="decimal" value={powerMax} onChange={(e) => setPowerMax(e.target.value)} required />
            </label>
            <label>
              Power Avg<br />
              <input inputMode="decimal" value={powerAvg} onChange={(e) => setPowerAvg(e.target.value)} required />
            </label>
          </div>

          <hr />

          {/* CSV Paste panel */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
            <div>
              <b>Paste lon,lat (ένα ζεύγος ανά γραμμή)</b>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                Παραδείγματα: <code>21.50,40.30</code> ή <code>21.50;40.30</code> ή <code>21.50 40.30</code>
              </div>
            </div>
            <textarea
              rows={6}
              placeholder={`lon,lat
21.50,40.30
21.60,40.30
21.60,40.40`}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              style={{ width: "100%" }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={pasteFromClipboard}>Paste from Clipboard</button>
              <button type="button" onClick={parseCsv} style={{ background: "#1976d2", color: "white" }}>
                Parse CSV → Preview on map
              </button>
              <button type="button" onClick={clearPreview}>Clear preview</button>
              <button type="button" onClick={() => drawPreview(coords)} title="Preview from current inputs">
                Preview from inputs
              </button>
            </div>
          </div>

          <hr />

          {/* Manual inputs preview/edit */}
          <div>
            <b>Coordinates (lon, lat)</b>
            <div style={{ maxHeight: 240, overflow: "auto", marginTop: 8 }}>
              {coords.map((c, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <input
                    placeholder={`lon ${i + 1}`}
                    inputMode="decimal"
                    value={c.lon}
                    onChange={(e) => updateCoord(i, "lon", e.target.value)}
                    required
                  />
                  <input
                    placeholder={`lat ${i + 1}`}
                    inputMode="decimal"
                    value={c.lat}
                    onChange={(e) => updateCoord(i, "lat", e.target.value)}
                    required
                  />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <button type="button" onClick={close}>CANCEL</button>
            <button type="submit" style={{ background: "#1976d2", color: "white" }}>ENTER</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
