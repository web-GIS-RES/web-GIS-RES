// netlify/functions/create-installation.ts
import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

type Body = {
  code: string;
  power_max?: number;
  power_avg?: number;
  region?: string | null;
  coords?: [number, number][]; // [lon, lat]
  wkt?: string;                 // POLYGON((lon lat, ...))
};

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE!; // server-only key

const supabase = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false },
});

const REGIONS = new Set([
  "Ανατολική Μακεδονία και Θράκη",
  "Κεντρική Μακεδονία",
  "Δυτική Μακεδονία",
  "Ήπειρος",
  "Θεσσαλία",
  "Ιόνιες Νήσοι",
  "Δυτική Ελλάδα",
  "Στερεά Ελλάδα",
  "Αττική",
  "Πελοπόννησος",
  "Βόρειο Αιγαίο",
  "Νότιο Αιγαίο",
  "Κρήτη",
]);

function json(status: number, payload: any) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

function coordsToWkt(coords: [number, number][]) {
  if (!Array.isArray(coords) || coords.length < 3) {
    throw new Error("Need >= 3 coords");
  }
  // lon,lat -> "lon lat"
  const ring: string[] = coords.map(([lon, lat]) => `${lon} ${lat}`);
  // κλείσε δακτύλιο αν δεν είναι κλειστός
  if (ring[0] !== ring[ring.length - 1]) ring.push(ring[0]);
  return `POLYGON((${ring.join(", ")}))`;
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { error: "Method not allowed" });
    }
    if (!supabaseUrl || !serviceRole) {
      return json(500, { error: "Missing Supabase env" });
    }

    let body: Body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { error: "Invalid JSON" });
    }

    const code = (body.code || "").toString().trim();
    if (!code) return json(400, { error: "Missing code" });

    const power_max = Number(body.power_max ?? 0);
    const power_avg = Number(body.power_avg ?? 0);

    // region είναι προαιρετικό – αν δοθεί, κάνε έναν απλό έλεγχο τιμών
    const region =
      typeof body.region === "string" && body.region.trim()
        ? body.region.trim()
        : null;
    if (region && !REGIONS.has(region)) {
      return json(400, { error: "Invalid region value" });
    }

    // Προετοιμασία WKT
    let wkt = (body.wkt || "").toString().trim();
    if (!/^POLYGON\s*\(/i.test(wkt)) {
      // δεν έχει έγκυρο WKT -> προσπάθησε από coords
      if (!body.coords) return json(400, { error: "Need >= 3 coords or a valid WKT POLYGON" });
      try {
        wkt = coordsToWkt(body.coords);
      } catch (e: any) {
        return json(400, { error: e?.message || "Invalid coords" });
      }
    }

    // --- INSERT μέσω RPC ---
    // 1η προσπάθεια: παράμετροι με πρόθεμα p_
    let rpc = await supabase.rpc("api_insert_installation", {
      p_code: code,
      p_power_max: power_max,
      p_power_avg: power_avg,
      p_region: region,
      p_wkt: wkt,
    });

    // Fallback: χωρίς πρόθεμα p_ (αν η function έχει ορίσει άλλα ονόματα)
    if (rpc.error) {
      rpc = await supabase.rpc("api_insert_installation", {
        code,
        power_max,
        power_avg,
        region,
        wkt,
      });
    }

    if (rpc.error) {
      // Επέστρεψε καθαρό μήνυμα στον client (θα το δεις στο Network/Response)
      return json(400, { error: rpc.error.message });
    }

    // Κάποιες εκδόσεις μπορεί να επιστρέφουν id, άλλες void.
    return json(200, { ok: true, id: rpc.data ?? null });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
};

export default handler;
