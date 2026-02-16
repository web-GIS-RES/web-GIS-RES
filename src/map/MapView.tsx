// src/map/MapView.tsx
import { MapContainer, TileLayer, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useState } from "react";
import InstallationsLayer from "./InstallationsLayer";
import NewInstallation from "../ui/NewInstallation";

const UI_REGIONS = [
  "ΟΛΕΣ",
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

/** Μετατρέπει από την επιλογή UI σε τιμή για το API/layer */
function toRegionFilter(value: string): string {
  return value === "ΟΛΕΣ" ? "ALL" : value;
}

export default function MapView() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [regionUI, setRegionUI] = useState<string>("ΟΛΕΣ"); // αυτό δείχνουμε στο dropdown
  const [showForm, setShowForm] = useState(false);

  const regionFilter = toRegionFilter(regionUI); // αυτό περνάμε στο layer

  const bump = () => setRefreshKey((k) => k + 1);

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      {/* Dropdown Περιφέρειας: πάνω-αριστερά, δεξιά από τα zoom controls */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 58, // λίγο δεξιότερα από τα +/-
          zIndex: 1000,
          background: "rgba(255,255,255,0.9)",
          border: "1px solid #ccc",
          borderRadius: 6,
          padding: "4px 8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          pointerEvents: "auto",
        }}
      >
        <label style={{ fontSize: 12, marginRight: 6 }}>Περιφέρεια:</label>
        <select
          value={regionUI}
          onChange={(e) => setRegionUI(e.target.value)}
          style={{ fontSize: 12, padding: "4px 6px" }}
        >
          {UI_REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* NEW INSTALLATION button: πάνω-δεξιά */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 1000,
          pointerEvents: "auto",
        }}
      >
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid #ccc",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          NEW INSTALLATION
        </button>
      </div>

      <MapContainer
        center={[40.30, 21.80]}
        zoom={10}
        minZoom={5}
        maxZoom={18}
        zoomControl={false}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomControl position="topleft" />

        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Layer με φίλτρο περιφέρειας (ALL = όλες) και refresh όταν γίνεται INSERT */}
        <InstallationsLayer refreshKey={refreshKey} regionFilter={regionFilter} />
      </MapContainer>

      {showForm && (
        <NewInstallation
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            bump(); // άμεσο refresh για να εμφανιστεί το νέο πολύγωνο χωρίς reload
          }}
        />
      )}
    </div>
  );
}
