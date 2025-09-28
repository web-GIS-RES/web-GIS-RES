import type { Handler } from "@netlify/functions";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

// Payload που περιμένουμε από το frontend
type Payload = {
  code: string;
  power_max: number;
  power_avg: number;
  coords: [number, number][]; // [lon,lat] pairs
};

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body: Payload = JSON.parse(event.body || "{}");

    if (
      !body.code ||
      !Array.isArray(body.coords) ||
      body.coords.length < 3 ||
      typeof body.power_max !== "number" ||
      typeof body.power_avg !== "number"
    ) {
      return { statusCode: 400, body: "Invalid payload" };
    }

    // Κλήση στο RPC της βάσης
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/fn_insert_installation_json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
      body: JSON.stringify({
        p_code: body.code,
        p_power_max: body.power_max,
        p_power_avg: body.power_avg,
        p_coords: body.coords,
      }),
    });

    const text = await resp.text();

    if (!resp.ok) {
      return { statusCode: resp.status, body: text || "Insert failed" };
    }

    return { statusCode: 200, body: text }; // επιστρέφει το id (bigint) σαν string
  } catch (err: any) {
    return { statusCode: 500, body: err?.message ?? "Server error" };
  }
};
