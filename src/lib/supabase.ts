import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente con service_role para operaciones del backend (bypasea RLS)
// IMPORTANTE: Solo se inicializa en el servidor
export const supabaseAdmin = 
  typeof window === 'undefined' 
    ? createClient(supabaseUrl, supabaseServiceKey)
    : (null as any);

// Cliente público para el frontend (respeta RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
