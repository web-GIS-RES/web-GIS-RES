import { MapContainer, TileLayer, ZoomControl, ScaleControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import InstallationsLayer from "./InstallationsLayer";
import NewInstallation from "../ui/NewInstallation";

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
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ScaleControl position="bottomleft" />
        <ZoomControl position="topright" />

        {/* ΜΕΣΑ στο MapContainer */}
        <InstallationsLayer />
      </MapContainer>

      {/* Dialog (χωρίς react-leaflet hooks) */}
      <NewInstallation />
    </div>
  );
}
