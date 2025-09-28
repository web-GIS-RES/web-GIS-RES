import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import InstallationsLayer from "../layers/InstallationsLayer";
import NewInstallation from "../ui/NewInstallation";

function LayersAndUI() {
  // bridge: μετατρέπουμε το window event σε leaflet event
  const map = useMap();
  // άκουσε το custom event από τη φόρμα:
  window.addEventListener("reload-installations", () => map.fire("reload-installations"));
  return (
    <>
      <InstallationsLayer />
      <NewInstallation />
    </>
  );
}

export default function MapView() {
  return (
    <MapContainer center={[38.0, 23.7]} zoom={7} style={{ width: "100%", height: "100vh" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LayersAndUI />
    </MapContainer>
  );
}
