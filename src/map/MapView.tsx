import { useEffect, useState } from "react";
import { MapContainer, TileLayer, ZoomControl, ScaleControl, useMap } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import InstallationsLayer from "./InstallationsLayer";
import NewInstallation from "../ui/NewInstallation";

// Μικρό helper που «πιάνει» το Leaflet map από το context και το γυρνάει στο parent
function MapRefSetter({ onMap }: { onMap: (m: LeafletMap) => void }) {
  const map = useMap();
  useEffect(() => {
    onMap(map);
  }, [map, onMap]);
  return null;
}

export default function MapView() {
  const center: [number, number] = [39.2, 22.0];
  const [map, setMap] = useState<LeafletMap | null>(null);

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
        {/* Περνάμε το πραγματικό Leaflet map στο state */}
        <MapRefSetter onMap={setMap} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ScaleControl position="bottomleft" />
        <ZoomControl position="topright" />

        {/* Η δική σου έκδοση του InstallationsLayer θέλει prop `map` */}
        {map && <InstallationsLayer map={map} />}
      </MapContainer>

      {/* Το dialog δεν χρησιμοποιεί react-leaflet hooks */}
      <NewInstallation />
    </div>
  );
}
