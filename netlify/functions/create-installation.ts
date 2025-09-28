// netlify/functions/create-installation.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import wellknown from "wellknown"; // αν το χρησιμοποιείς, αλλιώς κάνε δικό σου WKT/GeoJSON
// (δεν είναι υποχρεωτικό· φτιάχνουμε μόνοι μας το polygon από coords)

type Body = {
  code: string;
  power_max: number;
  power_avg: number;
  region: string; // Περιφέρεια (string που να ταιριάζει στο ENUM)
  coords: [number, number][]; // [lon, lat] pairs
};

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!; // server key

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false }
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body || "{}") as Body;

    if (!body.code?.trim()) return { statusCode: 400, body: "Missing code" };
    if (!Array.isArray(body.coords) || body.coords.length < 3) {
      return { statusCode: 400, body: "Need >= 3 coords" };
    }
    if (!body.region) return { statusCode: 400, body: "Missing region" };

    // Κλείσε το δαχτυλίδι αν δεν είναι κλειστό
    const first = body.coords[0];
    const last = body.coords[body.coords.length - 1];
    const closed = last[0] === first[0] && last[1] === first[1];
    const ring = closed ? body.coords : [...body.coords, first];

    // Φτιάξε WKT POLYGON (lon lat)
    const wkt = `POLYGON((${ring.map(([x, y]) => `${x} ${y}`).join(", ")}))`;

    // insert
    const { error } = await supabase.rpc("insert_installation_wkt", {
      p_code: body.code.trim(),
      p_power_max: body.power_max,
      p_power_avg: body.power_avg,
      p_region: body.region,        // ΝΕΟ
      p_wkt: wkt
    });

    if (error) {
      return { statusCode: 400, body: `Insert failed: ${error.message}` };
    }

    return { statusCode: 200, body: "ok" };
  } catch (err: any) {
    return { statusCode: 400, body: err?.message ?? "Bad request" };
  }
};
