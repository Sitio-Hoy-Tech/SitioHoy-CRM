import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { plantillaSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { getSessionUser } from "@/lib/api";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from("plantillas")
      .select(`*, etiqueta_plantilla:etiquetas_plantillas(id, nombre)`)
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !data) return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    const { id } = await params;
    const body = await request.json();
    const parsed = plantillaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { data: anterior } = await supabaseAdmin
      .from("plantillas").select("*").eq("id", id).is("deleted_at", null).single();
    if (!anterior) return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });

    const { data, error } = await supabaseAdmin
      .from("plantillas")
      .update({
        ...parsed.data,
        etiqueta_plantilla_id: parsed.data.etiqueta_plantilla_id || null,
      })
      .eq("id", id).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await registrarAuditoria({
      usuario_id: user.id, tabla_afectada: "plantillas", registro_id: id,
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

    const { data: anterior } = await supabaseAdmin
      .from("plantillas").select("*").eq("id", id).is("deleted_at", null).single();
    if (!anterior) return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });

    const { error } = await supabaseAdmin
      .from("plantillas").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await registrarAuditoria({
      usuario_id: user.id, tabla_afectada: "plantillas", registro_id: id,
      accion: "DELETE", cambios_anteriores: anterior,
    });

    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
