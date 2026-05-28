import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { kbCategoriaSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { requireAdmin } from "@/lib/api";

function toSlug(str: string) {
  return str.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("kb_categorias")
      .select("*")
      .is("deleted_at", null)
      .order("posicion")
      .order("nombre");

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
    const parsed = kbCategoriaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const slug = toSlug(parsed.data.nombre);

    const { data, error } = await supabaseAdmin
      .from("kb_categorias")
      .insert({ ...parsed.data, slug })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await registrarAuditoria({
      usuario_id: user.id,
      tabla_afectada: "kb_categorias",
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
