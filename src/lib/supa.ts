export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
export const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export async function fetchAreasBBox(bbox: [number, number, number, number]) {
  const [minx, miny, maxx, maxy] = bbox;
  const url = `${SUPABASE_URL}/rest/v1/rpc/fn_areas_bbox?minx=${minx}&miny=${miny}&maxx=${maxx}&maxy=${maxy}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`
    }
  });
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  return {
    type: "FeatureCollection",
    features: rows.map((r: any) => ({
      type: "Feature",
      id: r.id,
      properties: { name: r.name, ...r.properties },
      geometry: r.geometry
    }))
  };
}
