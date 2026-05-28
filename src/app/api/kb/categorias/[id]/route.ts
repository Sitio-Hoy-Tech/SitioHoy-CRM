import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { kbCategoriaSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { requireAdmin } from "@/lib/api";

function toSlug(str: string) {
  return str.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from("kb_categorias")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !data) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
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
    const user = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = kbCategoriaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { data: anterior } = await supabaseAdmin
      .from("kb_categorias").select("*").eq("id", id).is("deleted_at", null).single();
    if (!anterior) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const slug = toSlug(parsed.data.nombre);

    const { data, error } = await supabaseAdmin
      .from("kb_categorias")
      .update({ ...parsed.data, slug })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await registrarAuditoria({
      usuario_id: user.id,
      tabla_afectada: "kb_categorias",
      registro_id: id,
      accion: "UPDATE",
      cambios_anteriores: anterior,
      cambios_nuevos: data,
    });

    return NextResponse.json({ data });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "FORBIDDEN")
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { id } = await params;

    const { data: anterior } = await supabaseAdmin
      .from("kb_categorias").select("*").eq("id", id).is("deleted_at", null).single();
    if (!anterior) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const { error } = await supabaseAdmin
      .from("kb_categorias")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await registrarAuditoria({
      usuario_id: user.id,
      tabla_afectada: "kb_categorias",
      registro_id: id,
      accion: "DELETE",
      cambios_anteriores: anterior,
    });

    return NextResponse.json({ data: { success: true } });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "FORBIDDEN")
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
