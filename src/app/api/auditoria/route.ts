import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const tabla = searchParams.get("tabla") || "";
    const usuario_id = searchParams.get("usuario_id") || "";
    const accion = searchParams.get("accion") || "";
    const fecha_desde = searchParams.get("fecha_desde") || "";
    const fecha_hasta = searchParams.get("fecha_hasta") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("audit_log")
      .select(
        `*, usuario:usuarios!audit_log_usuario_id_fkey(id, nombre, apellido)`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (tabla) query = query.eq("tabla_afectada", tabla);
    if (usuario_id) query = query.eq("usuario_id", usuario_id);
    if (accion) query = query.eq("accion", accion);
    if (fecha_desde) query = query.gte("created_at", fecha_desde);
    if (fecha_hasta) query = query.lte("created_at", fecha_hasta);

    const { data, error, count } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data, count });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
