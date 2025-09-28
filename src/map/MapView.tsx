import { useEffect } from "react";
import { MapContainer, TileLayer, ZoomControl, ScaleControl, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import InstallationsLayer from "./InstallationsLayer";
import NewInstallation from "../ui/NewInstallation";

// Γράφει το Leaflet map global (προαιρετικό για προεπισκοπήσεις)
function SetGlobalMap() {
  const map = useMap();
  useEffect(() => {
    (window as any).__leafletMap = map;
  }, [map]);
  return null;
}

export default function MapView() {
  const center: [number, number] = [39.2, 22.0];

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      <MapContainer
        center={center}
        zoom={7}
        minZoom={5}
        maxZoom={18}
        zoomControl={false}
        style={{ width: "100%", height: "100%" }}
      >
        <SetGlobalMap />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ScaleControl position="bottomleft" />
        <ZoomControl position="topright" />

        {/* Layer που φορτώνει/φιλτράρει τα installations από Supabase */}
        <InstallationsLayer />
      </MapContainer>

      {/* Dialog εισαγωγής — onClose προαιρετικό */}
      <NewInstallation />
    </div>
  );
}
