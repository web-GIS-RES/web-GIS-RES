import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

const API = import.meta.env.VITE_SUPABASE_URL + "/rest/v1/v_areas_geojson";
const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function AreasLayer() {
  const map = useMap();

  useEffect(() => {
    // Δημιουργία ξεχωριστού pane για τα δεδομένα
    if (!map.getPane("areasPane")) {
      map.createPane("areasPane");
      const pane = map.getPane("areasPane");
      if (pane) pane.style.zIndex = "250"; // κάτω από markers draw-control
    }

    // GeoJSON layer
    const layer = L.geoJSON(undefined, {
      interactive: false, // μην πιάνει clicks (για να μην παρεμβαίνει στη σχεδίαση)
      pane: "areasPane",
      style: () => ({
        color: "blue",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.15
      }),
      pointToLayer: (_f, latlng) =>
        L.marker(latlng, { interactive: false }), // markers επίσης μη-διαδραστικοί
      onEachFeature: (f, l) => {
        const p = (f.properties ?? {}) as any;
        const n = p?.name ?? "—";
        l.bindPopup(`<b>${n}</b>`);
      }
    }).addTo(map);

    // Συνάρτηση φόρτωσης δεδομένων με BBOX
    const loadData = async () => {
      const b = map.getBounds();
      const q = `${API}?select=data&id=eq.id&bbox=st_makeenvelope(${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()},4326)`;
      try {
        const resp = await fetch(q, {
          headers: { apikey: API_KEY, Authorization: `Bearer ${API_KEY}` }
        });
        if (!resp.ok) {
          console.error("Supabase error", await resp.text());
          return;
        }
        const rows = await resp.json();
        layer.clearLayers();
        for (const r of rows) {
          if (r.data) layer.addData(r.data);
        }
      } catch (err) {
        console.error("Network error", err);
      }
    };

    loadData();

    // Reload όταν αλλάζει το BBOX
    map.on("moveend", loadData);
    // Reload όταν ζητήσει άλλο component (π.χ. μετά από draw)
    map.on("reload-areas", loadData);

    return () => {
      map.removeLayer(layer);
      map.off("moveend", loadData);
      map.off("reload-areas", loadData);
    };
  }, [map]);

  return null;
}
