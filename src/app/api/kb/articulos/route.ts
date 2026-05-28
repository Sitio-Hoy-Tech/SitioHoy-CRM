import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { kbArticuloSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { requireAdmin } from "@/lib/api";

function toSlug(str: string) {
  return str.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const categoria_id = searchParams.get("categoria_id");
    const search = searchParams.get("search") || "";

    let query = supabaseAdmin
      .from("kb_articulos")
      .select("*, categoria:kb_categorias(id, nombre, slug, icono), usuario_creador:usuarios!kb_articulos_created_by_fkey(id, nombre, apellido)")
      .is("deleted_at", null)
      .order("posicion")
      .order("titulo");

    if (categoria_id) query = query.eq("categoria_id", categoria_id);
    if (search) query = query.or(`titulo.ilike.%${search}%,resumen.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const body = await request.json();
    const parsed = kbArticuloSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const slug = toSlug(parsed.data.titulo);

    const { data, error } = await supabaseAdmin
      .from("kb_articulos")
      .insert({ ...parsed.data, slug, created_by: user.id, updated_by: user.id })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await registrarAuditoria({
      usuario_id: user.id,
      tabla_afectada: "kb_articulos",
      registro_id: data.id,
      accion: "CREATE",
      cambios_nuevos: data,
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "FORBIDDEN")
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
