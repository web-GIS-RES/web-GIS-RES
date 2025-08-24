import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import AreasLayer from "./AreasLayer";
import DrawGeometries from "./DrawGeometries";
import L from "leaflet";

// Fix για default marker icons στο Vite
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

export default function MapView() {
  return (
    <MapContainer center={[40.3, 21.8]} zoom={8} style={{ height: "100vh" }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <AreasLayer />
      <DrawGeometries />
    </MapContainer>
  );
}
