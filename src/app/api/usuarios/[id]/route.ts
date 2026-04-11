import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { registrarAuditoria } from "@/lib/audit";
import { getSessionUser } from "@/lib/api";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    const { id } = await params;
    const body = await request.json();

    const { data: anterior } = await supabaseAdmin
      .from("usuarios")
      .select("id, nombre, apellido, email, rol, estado")
      .eq("id", id).is("deleted_at", null).single();
    if (!anterior) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    if (body.nombre) updateData.nombre = body.nombre;
    if (body.apellido) updateData.apellido = body.apellido;
    if (body.rol) updateData.rol = body.rol;
    if (typeof body.estado === "boolean") updateData.estado = body.estado;

    const { data, error } = await supabaseAdmin
      .from("usuarios")
      .update(updateData)
      .eq("id", id)
      .select("id, nombre, apellido, email, rol, estado, created_at, updated_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await registrarAuditoria({
      usuario_id: user.id, tabla_afectada: "usuarios", registro_id: id,
      accion: "UPDATE", cambios_anteriores: anterior, cambios_nuevos: data,
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
    const user = await getSessionUser();
    const { id } = await params;

    if (user.id === id) {
      return NextResponse.json({ error: "No podés eliminarte a vos mismo" }, { status: 400 });
    }

    const { data: anterior } = await supabaseAdmin
      .from("usuarios")
      .select("id, nombre, apellido, email, rol")
      .eq("id", id).is("deleted_at", null).single();
    if (!anterior) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const { error } = await supabaseAdmin
      .from("usuarios").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await registrarAuditoria({
      usuario_id: user.id, tabla_afectada: "usuarios", registro_id: id,
      accion: "DELETE", cambios_anteriores: anterior,
    });

    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
