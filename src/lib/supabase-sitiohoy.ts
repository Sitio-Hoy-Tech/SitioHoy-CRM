import { createClient } from "@supabase/supabase-js";

const url = process.env.SITIOHOY_SUPABASE_URL!;
const key = process.env.SITIOHOY_SUPABASE_SERVICE_ROLE_KEY!;

// Server-side only — bypasses RLS on the SitioHoy platform DB
export const supabaseSitioHoy =
  typeof window === "undefined"
    ? createClient(url, key)
    : (null as any);
