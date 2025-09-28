import React, { useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

type Coord = { lon: number; lat: number };

const regions = [
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
];

function toWKT(coords: Coord[]): string {
  if (coords.length < 3) return "";
  const ring = [...coords, coords[0]]
    .map((c) => `${c.lon} ${c.lat}`)
    .join(", ");
  return `POLYGON((${ring}))`;
}

const NewInstallation: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const map = useMap();
  const [code, setCode] = useState("");
  const [powerMax, setPowerMax] = useState("");
  const [powerAvg, setPowerAvg] = useState("");
  const [region, setRegion] = useState("");
  const [coords, setCoords] = useState<Coord[]>([]);
  const [csvText, setCsvText] = useState("");

  const [previewLayer, setPreviewLayer] = useState<L.Layer | null>(null);

  const handleParseCSV = () => {
    const lines = csvText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const parsed: Coord[] = [];
    for (const line of lines) {
      const parts = line.split(/[\s,;]+/);
      if (parts.length >= 2) {
        const lon = parseFloat(parts[0].replace(",", "."));
        const lat = parseFloat(parts[1].replace(",", "."));
        if (!isNaN(lon) && !isNaN(lat)) parsed.push({ lon, lat });
      }
    }
    setCoords(parsed);
    previewOnMap(parsed);
  };

  const previewOnMap = (c: Coord[]) => {
    if (previewLayer) {
      map.removeLayer(previewLayer);
    }
    if (c.length >= 3) {
      const latlngs = c.map((p) => [p.lat, p.lon]) as [number, number][];
      const poly = L.polygon(latlngs, { color: "blue" }).addTo(map);
      map.fitBounds(poly.getBounds());
      setPreviewLayer(poly);
    }
  };

  const handleClear = () => {
    setCoords([]);
    setCsvText("");
    if (previewLayer) {
      map.removeLayer(previewLayer);
      setPreviewLayer(null);
    }
  };

  const handleSubmit = async () => {
    const nums = coords.filter(
      (c) => !isNaN(c.lon) && !isNaN(c.lat)
    );
    if (nums.length < 3) {
      alert("Αποτυχία καταχώρησης: Need >= 3 coords");
      return;
    }

    const body = {
      code,
      power_max: Number(powerMax || 0),
      power_avg: Number(powerAvg || 0),
      region,
      coords: nums.map(({ lon, lat }) => [lon, lat]),
      wkt: toWKT(nums),
    };

    try {
      const res = await fetch("/.netlify/functions/create-installation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      alert("Επιτυχής καταχώρηση!");
      onClose();
    } catch (err: any) {
      alert("Αποτυχία καταχώρησης: " + err.message);
    }
  };

  return (
    <div className="new-installation-form">
      <h3>New Installation</h3>

      <label>Code</label>
      <input value={code} onChange={(e) => setCode(e.target.value)} />

      <label>Vertices (≥3)</label>
      <input value={coords.length} readOnly />

      <label>Region</label>
      <select value={region} onChange={(e) => setRegion(e.target.value)}>
        <option value="">-- Επιλογή --</option>
        {regions.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      <label>Power Max (kWh)</label>
      <input
        value={powerMax}
        onChange={(e) => setPowerMax(e.target.value)}
      />

      <label>Power Avg (kWh)</label>
      <input
        value={powerAvg}
        onChange={(e) => setPowerAvg(e.target.value)}
      />

      <label>
        Επικόλλησε lon,lat ανά γραμμή (δέχεται τελείες/κόμματα).
      </label>
      <textarea
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
        rows={6}
      />

      <div className="buttons">
        <button onClick={handleParseCSV}>Parse CSV → Preview on map</button>
        <button onClick={handleClear}>Clear</button>
        <button onClick={() => previewOnMap(coords)}>Preview from inputs</button>
      </div>

      <h4>Coordinates (lon, lat)</h4>
      {coords.map((c, i) => (
        <div key={i}>
          <input
            value={c.lon}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              const newCoords = [...coords];
              newCoords[i] = { ...newCoords[i], lon: v };
              setCoords(newCoords);
            }}
          />
          <input
            value={c.lat}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              const newCoords = [...coords];
              newCoords[i] = { ...newCoords[i], lat: v };
              setCoords(newCoords);
            }}
          />
        </div>
      ))}

      <div className="buttons">
        <button onClick={onClose}>Cancel</button>
        <button onClick={handleSubmit}>Enter</button>
      </div>
    </div>
  );
};

export default NewInstallation;
