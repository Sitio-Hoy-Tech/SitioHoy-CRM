import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { clienteSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { getSessionUser } from "@/lib/api";

// GET /api/clientes/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from("clientes")
      .select(
        `*,
        contacto:contactos(id, nombre, apellido, email, telefono,
          estado:estados_contacto(id, nombre)
        ),
        plan:planes(id, nombre, beneficios, precio),
        plantilla:plantillas(id, nombre),
        etiqueta_negocio:etiquetas_negocio(id, nombre),
        usuario_creador:usuarios!clientes_created_by_fkey(id, nombre, apellido)`
      )
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PUT /api/clientes/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    const { id } = await params;
    const body = await request.json();
    const parsed = clienteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { data: anterior } = await supabaseAdmin
      .from("clientes")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (!anterior) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    // Verificar dominio único si cambió y no está vacío
    if (parsed.data.dominio && parsed.data.dominio !== anterior.dominio) {
      const { data: existing } = await supabaseAdmin
        .from("clientes")
        .select("id")
        .eq("dominio", parsed.data.dominio)
        .is("deleted_at", null)
        .neq("id", id)
        .single();

      if (existing) {
        return NextResponse.json({ error: "El dominio ya está registrado" }, { status: 409 });
      }
    }

    const { data: cliente, error } = await supabaseAdmin
      .from("clientes")
      .update(parsed.data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await registrarAuditoria({
      usuario_id: user.id,
      tabla_afectada: "clientes",
      registro_id: id,
      accion: "UPDATE",
      cambios_anteriores: anterior,
      cambios_nuevos: cliente,
    });

    return NextResponse.json({ data: cliente });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/clientes/[id] (soft delete)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    const { id } = await params;

    const { data: anterior } = await supabaseAdmin
      .from("clientes")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (!anterior) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from("clientes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await registrarAuditoria({
      usuario_id: user.id,
      tabla_afectada: "clientes",
      registro_id: id,
      accion: "DELETE",
      cambios_anteriores: anterior,
    });

    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
