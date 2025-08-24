import type { Handler } from "@netlify/functions";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  try {
    const body = JSON.parse(event.body ?? "{}");
    const { name, properties, geometry } = body;

    if (!geometry || !geometry.type || !geometry.coordinates) {
      return { statusCode: 400, body: "Invalid GeoJSON geometry" };
    }

    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/fn_insert_area_geojson`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_ROLE,
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE}`
      },
      body: JSON.stringify({
        _name: name ?? null,
        _properties: properties ?? {},
        _geojson: geometry
      })
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return { statusCode: resp.status, body: txt };
    }
    const id = await resp.json();
    return { statusCode: 200, body: JSON.stringify({ id }) };
  } catch (e:any) {
    return { statusCode: 500, body: e?.message ?? "Server error" };
  }
};
