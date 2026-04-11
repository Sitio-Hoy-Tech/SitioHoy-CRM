import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { plantillaSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { getSessionUser } from "@/lib/api";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("plantillas")
      .select(`*, etiqueta_plantilla:etiquetas_plantillas(id, nombre)`)
      .is("deleted_at", null)
      .order("nombre");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const parsed = plantillaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("plantillas")
      .insert({
        ...parsed.data,
        etiqueta_plantilla_id: parsed.data.etiqueta_plantilla_id || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await registrarAuditoria({
      usuario_id: user.id,
      tabla_afectada: "plantillas",
      registro_id: data.id,
      accion: "CREATE",
      cambios_nuevos: data,
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
