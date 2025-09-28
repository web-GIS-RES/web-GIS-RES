import { useEffect, useState } from "react";
import { MapContainer, TileLayer, ZoomControl, ScaleControl, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import InstallationsLayer from "./InstallationsLayer";
import NewInstallation from "../ui/NewInstallation";
import RegionFilter from "../ui/RegionFilter"; // αν δεν έχεις το αρχείο, αφαίρεσέ το import

// Προαιρετικό: εκθέτουμε το map global για preview polygons
function SetGlobalMap() {
  const map = useMap();
  useEffect(() => {
    (window as any).__leafletMap = map;
  }, [map]);
  return null;
}

export default function MapView() {
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((k) => k + 1);

  const center: [number, number] = [39.2, 22.0];

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      {/* Προαιρετικό floating φίλτρο περιφέρειας */}
      {typeof RegionFilter === "function" ? <RegionFilter /> : null}

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

        {/* Layer που φορτώνει τα installations και ξαναφορτώνει όταν αλλάζει το refreshKey */}
        <InstallationsLayer refreshKey={refreshKey} />
      </MapContainer>

      {/* Dialog εισαγωγής — στο onCreated αυξάνουμε το refreshKey */}
      <NewInstallation onCreated={bump} />
    </div>
  );
}
