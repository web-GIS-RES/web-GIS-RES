// src/map/MapView.tsx
import { MapContainer, TileLayer, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useState } from "react";
import InstallationsLayer from "./InstallationsLayer";
import NewInstallation from "../ui/NewInstallation";

const REGIONS = [
  "ΟΛΕΣ",
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

export default function MapView() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedRegion, setSelectedRegion] = useState<string>("ΟΛΕΣ");
  const [showForm, setShowForm] = useState(false);

  const bump = () => setRefreshKey((k) => k + 1);

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      {/* Dropdown Περιφέρειας: πάνω-αριστερά, δεξιά από τα zoom controls */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 58,
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
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          style={{ fontSize: 12, padding: "4px 6px" }}
        >
          {REGIONS.map((r) => (
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Περάσματα προς τη στρώση */}
        <InstallationsLayer
          refreshKey={refreshKey}
          selectedRegion={selectedRegion}
        />
      </MapContainer>

      {showForm && (
        <NewInstallation
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            bump(); // ανανέωση layer ώστε να εμφανιστεί αμέσως το νέο πολύγωνο
          }}
        />
      )}
    </div>
  );
}
