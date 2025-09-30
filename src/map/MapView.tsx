import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import InstallationsLayer from "./InstallationsLayer";
import { useState } from "react";
import NewInstallation from "../ui/NewInstallation";

export default function MapView() {
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((k) => k + 1);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh", // 100% του viewport ύψους
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
        {/* Βασικά πλακίδια για να φαίνεται ο χάρτης */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <InstallationsLayer refreshKey={refreshKey} />
      </MapContainer>

      {/* Μετακινημένο κουμπί NEW INSTALLATION ώστε να μην ακουμπά τα zoom controls */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 60, // λίγο αριστερότερα από τα zoom controls
          zIndex: 1000,
          pointerEvents: "auto",
        }}
      >
        <NewInstallation onCreated={bump} />
      </div>
    </div>
  );
}
