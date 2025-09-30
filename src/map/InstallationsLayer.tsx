import { useEffect, useState } from "react";
import { GeoJSON } from "react-leaflet";
import { supabase } from "../supabaseClient";

type Props = {
  refreshKey: number;
  regionFilter?: string | null;
};

const InstallationsLayer: React.FC<Props> = ({ refreshKey, regionFilter }) => {
  const [features, setFeatures] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      let query = supabase
        .from("installations_view")
        .select("id, code, power_max, power_avg, area_m2, region, geom");

      if (regionFilter && regionFilter !== "ALL") {
        query = query.eq("region", regionFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching installations:", error);
        return;
      }

      if (data) {
        const geojson = data.map((row: any) => ({
          type: "Feature",
          geometry: row.geom,
          properties: {
            id: row.id,
            code: row.code,
            power_max: row.power_max,
            power_avg: row.power_avg,
            area_m2: row.area_m2,
            region: row.region,
          },
        }));
        setFeatures(geojson);
      }
    };

    fetchData();
  }, [refreshKey, regionFilter]);

  return features.length > 0 ? (
    <GeoJSON
      key={refreshKey}
      data={{
        type: "FeatureCollection",
        features,
      }}
      onEachFeature={(feature, layer) => {
        if (feature.properties) {
          const { code, power_max, power_avg, area_m2, region } =
            feature.properties;
          layer.bindPopup(`
            <b>Code:</b> ${code}<br/>
            <b>Power Max:</b> ${power_max} kW<br/>
            <b>Power Avg:</b> ${power_avg} kW<br/>
            <b>Area:</b> ${area_m2} m²<br/>
            <b>Region:</b> ${region}
          `);
        }
      }}
    />
  ) : null;
};

export default InstallationsLayer;
