import { useEffect, useState } from "react";

const REGIONS = [
  "— Όλες —",
  "Ανατολική Μακεδονία και Θράκη",
  "Κεντρική Μακεδονία",
  "Δυτική Μακεδονία",
  "Ήπειρος",
  "Θεσσαλία",
  "Ιόνια Νησιά",
  "Δυτική Ελλάδα",
  "Στερεά Ελλάδα",
  "Αττική",
  "Πελοπόννησος",
  "Βόρειο Αιγαίο",
  "Νότιο Αιγαίο",
  "Κρήτη",
] as const;

export default function RegionFilter() {
  const [value, setValue] = useState<string>(() => {
    const v = (window as any).__selectedRegion as string | undefined;
    return v ?? "— Όλες —";
  });

  useEffect(() => {
    (window as any).__selectedRegion = value === "— Όλες —" ? null : value;
    window.dispatchEvent(new Event("region-changed"));
  }, [value]);

  return (
    <div
      style={{
        position: "absolute",
        top: 10,
        left: 10,
        zIndex: 1000,
        background: "white",
        padding: 8,
        borderRadius: 6,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        fontSize: 14,
      }}
    >
      <div style={{ marginBottom: 4, fontWeight: 600 }}>Περιφέρεια</div>
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{ minWidth: 260, padding: 6 }}
      >
        {REGIONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
    </div>
  );
}
