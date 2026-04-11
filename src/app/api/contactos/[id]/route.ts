import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { contactoSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { getSessionUser } from "@/lib/api";

// GET /api/contactos/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from("contactos")
      .select(
        `*,
        estado:estados_contacto(id, nombre),
        etiqueta_negocio:etiquetas_negocio(id, nombre),
        usuario_creador:usuarios!contactos_created_by_fkey(id, nombre, apellido)`
      )
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PUT /api/contactos/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    const { id } = await params;
    const body = await request.json();
    const parsed = contactoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Obtener datos anteriores para auditoría
    const { data: anterior } = await supabaseAdmin
      .from("contactos")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (!anterior) {
      return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
    }

    const { data: contacto, error } = await supabaseAdmin
      .from("contactos")
      .update({
        ...parsed.data,
        etiqueta_negocio_id: parsed.data.etiqueta_negocio_id || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await registrarAuditoria({
      usuario_id: user.id,
      tabla_afectada: "contactos",
      registro_id: id,
      accion: "UPDATE",
      cambios_anteriores: anterior,
      cambios_nuevos: contacto,
    });

    return NextResponse.json({ data: contacto });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/contactos/[id] (soft delete)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    const { id } = await params;

    const { data: anterior } = await supabaseAdmin
      .from("contactos")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (!anterior) {
      return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from("contactos")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await registrarAuditoria({
      usuario_id: user.id,
      tabla_afectada: "contactos",
      registro_id: id,
      accion: "DELETE",
      cambios_anteriores: anterior,
    });

    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
