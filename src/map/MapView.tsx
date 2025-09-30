import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import InstallationsLayer from "./InstallationsLayer";
import { useState } from "react";
import NewInstallation from "../ui/NewInstallation";

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

export type RegionName = (typeof REGIONS)[number] | "ALL";

export default function MapView() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [regionFilter, setRegionFilter] = useState<RegionName>("ALL");

  const bump = () => setRefreshKey((k) => k + 1);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <MapContainer
        center={[40.300982, 21.789813]}
        zoom={11}
        minZoom={9}
        maxZoom={18}
        zoomControl={true}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <InstallationsLayer refreshKey={refreshKey} regionFilter={regionFilter} />
      </MapContainer>

      {/* Dropdown φίλτρο περιφέρειας — επάνω αριστερά, δεξιότερα από τα zoom controls */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 60, // τα zoom είναι στο ~10px, οπότε 60px το “προσπερνάει”
          zIndex: 1000,
          background: "rgba(255,255,255,0.85)",
          border: "1px solid #ccc",
          borderRadius: 6,
          padding: "4px 8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          pointerEvents: "auto",
        }}
      >
        <label style={{ fontSize: 12, color: "#333", marginRight: 6 }}>
          Περιφέρεια:
        </label>
        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value as RegionName)}
          style={{
            fontSize: 12,
            padding: "4px 6px",
            borderRadius: 4,
            border: "1px solid #bbb",
            background: "white",
          }}
        >
          <option value="ALL">Όλες</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* NEW INSTALLATION — επάνω δεξιά, λίγο αριστερά από zoom-out όταν είναι δεξιά */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 60,
          zIndex: 1000,
          pointerEvents: "auto",
        }}
      >
        <NewInstallation onCreated={bump} />
      </div>
    </div>
  );
}
