import { MapContainer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import InstallationsLayer from "./InstallationsLayer";
import { useState } from "react";
import NewInstallation from "../ui/NewInstallation";

export default function MapView() {
  const [refreshKey, setRefreshKey] = useState(0);

  const bump = () => setRefreshKey((k) => k + 1);

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      <MapContainer
        center={[40.300982, 21.789813]}
        zoom={11}
        minZoom={9}
        maxZoom={18}
        zoomControl={true}
        style={{ width: "100%", height: "100%" }}
      >
        <InstallationsLayer refreshKey={refreshKey} />
      </MapContainer>

      {/* Τοποθέτηση του κουμπιού NEW INSTALLATION λίγο πιο αριστερά */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "60px", // αντί για 10px ώστε να μην ακουμπά τα zoom controls
          zIndex: 1000,
        }}
      >
        <NewInstallation onCreated={bump} />
      </div>
    </div>
  );
}
