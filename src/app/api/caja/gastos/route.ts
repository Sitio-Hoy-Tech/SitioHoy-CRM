import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/api";
import { registrarAuditoria } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const mes = searchParams.get("mes"); // YYYY-MM
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("caja_gastos")
      .select("*, creador:usuarios(id, nombre, apellido)", { count: "exact" })
      .is("deleted_at", null)
      .order("fecha", { ascending: false })
      .range(offset, offset + limit - 1);

    if (mes) {
      const [year, month] = mes.split("-");
      const from = `${year}-${month}-01`;
      const to = new Date(Number(year), Number(month), 0).toISOString().split("T")[0];
      query = query.gte("fecha", from).lte("fecha", to);
    }

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data, count });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const { descripcion, monto, categoria, fecha, notas } = body;

    if (!descripcion || !monto || !fecha) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("caja_gastos")
      .insert({ descripcion, monto: Number(monto), categoria: categoria || "otros", fecha, notas: notas || null, created_by: user.id })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await registrarAuditoria({
      usuario_id: user.id,
      tabla_afectada: "caja_gastos",
      registro_id: data.id,
      accion: "CREATE",
      cambios_nuevos: data,
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
