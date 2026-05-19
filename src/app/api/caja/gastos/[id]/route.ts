import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/api";
import { registrarAuditoria } from "@/lib/audit";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    const body = await request.json();
    const { descripcion, monto, categoria, fecha, notas } = body;

    const { data: anterior } = await supabaseAdmin
      .from("caja_gastos").select().eq("id", id).single();

    const { data, error } = await supabaseAdmin
      .from("caja_gastos")
      .update({ descripcion, monto: Number(monto), categoria, fecha, notas: notas || null })
      .eq("id", id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await registrarAuditoria({
      usuario_id: user.id,
      tabla_afectada: "caja_gastos",
      registro_id: id,
      accion: "UPDATE",
      cambios_anteriores: anterior,
      cambios_nuevos: data,
    });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();

    const { data: anterior } = await supabaseAdmin
      .from("caja_gastos").select().eq("id", id).single();

    const { error } = await supabaseAdmin
      .from("caja_gastos")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await registrarAuditoria({
      usuario_id: user.id,
      tabla_afectada: "caja_gastos",
      registro_id: id,
      accion: "DELETE",
      cambios_anteriores: anterior,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
