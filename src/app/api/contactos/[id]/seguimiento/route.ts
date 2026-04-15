import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { seguimientoSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { getSessionUser } from "@/lib/api";

// GET /api/contactos/[id]/seguimiento
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabaseAdmin
      .from("seguimiento_contactos")
      .select(
        `*,
        usuario_creador:usuarios!seguimiento_contactos_created_by_fkey(id, nombre, apellido)`,
        { count: "exact" }
      )
      .eq("contacto_id", id)
      .is("deleted_at", null)
      .order("fecha_seguimiento", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, count });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/contactos/[id]/seguimiento
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    const { id } = await params;
    const body = await request.json();
    const parsed = seguimientoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { data: seguimiento, error } = await supabaseAdmin
      .from("seguimiento_contactos")
      .insert({
        contacto_id: id,
        notas: parsed.data.notas,
        fecha_seguimiento: parsed.data.fecha_seguimiento || new Date().toISOString(),
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await registrarAuditoria({
      usuario_id: user.id,
      tabla_afectada: "seguimiento_contactos",
      registro_id: seguimiento.id,
      accion: "CREATE",
      cambios_nuevos: seguimiento,
    });

    revalidatePath("/");
    return NextResponse.json({ data: seguimiento }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
