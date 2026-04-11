import { supabaseAdmin } from "./supabase";

export async function registrarAuditoria(params: {
  usuario_id: string;
  tabla_afectada: string;
  registro_id: string;
  accion: "CREATE" | "UPDATE" | "DELETE";
  cambios_anteriores?: Record<string, unknown> | null;
  cambios_nuevos?: Record<string, unknown> | null;
}) {
  await supabaseAdmin.from("audit_log").insert({
    usuario_id: params.usuario_id,
    tabla_afectada: params.tabla_afectada,
    registro_id: params.registro_id,
    accion: params.accion,
    cambios_anteriores: params.cambios_anteriores ?? null,
    cambios_nuevos: params.cambios_nuevos ?? null,
  });
}
