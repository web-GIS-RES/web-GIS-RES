import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L, { GeoJSON } from "leaflet";
import { fetchAreasBBox } from "../lib/supa";

export default function AreasLayer() {
  const map = useMap();
  const layerRef = useRef<GeoJSON | null>(null);

  useEffect(() => {
    const layer = L.geoJSON(undefined, {
      style: () => ({ weight: 2, opacity: 1, fillOpacity: 0.15 }),
      pointToLayer: (f, latlng) => L.marker(latlng),
      onEachFeature: (f, l) => {
        const p = (f.properties ?? {}) as any;
        const n = p?.name ?? "—";
        l.bindPopup(`<b>${n}</b>`);
      }
    });
    layer.addTo(map);
    layerRef.current = layer;

    const load = async () => {
      const b = map.getBounds();
      const fc = await fetchAreasBBox([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
      layer.clearLayers().addData(fc as any);
    };

    load(); // αρχικό
    map.on("moveend", load);

    const reload = () => load();       // custom event μετά το POST
    map.on("reload-areas", reload);

    return () => {
      map.off("moveend", load);
      map.off("reload-areas", reload);
      map.removeLayer(layer);
    };
  }, [map]);

  return null;
}
