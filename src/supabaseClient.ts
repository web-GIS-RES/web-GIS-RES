// src/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

// Τα δύο env πρέπει να υπάρχουν (τοπικά στο .env και στο Netlify Env Vars)
const url = import.meta.env.VITE_SUPABASE_URL!;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!;

if (!url || !anon) {
  // Χρήσιμο log στο build/runtime αν λείπουν
  // (Μην ρίχνεις exception για να μη “σπάσει” το build)
  // eslint-disable-next-line no-console
  console.warn("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(url, anon);
