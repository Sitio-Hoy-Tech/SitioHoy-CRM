import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { supabaseSitioHoy } from "@/lib/supabase-sitiohoy";
import { clienteSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { getSessionUser } from "@/lib/api";
import { tomarSnapshotMRR } from "@/lib/mrr";

function dominioToUrl(dominio: string | null | undefined): string | null {
  if (!dominio) return null;
  const clean = dominio.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${clean}`;
}

function maxProductsForPlan(planNombre: string): number | null {
  const n = planNombre.toLowerCase();
  if (n.includes("empresa")) return null;
  if (n.includes("emprendimiento")) return 200;
  return 50;
}

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
        etiqueta_negocio:etiquetas_negocio(id, nombre),
        usuario_creador:usuarios!clientes_created_by_fkey(id, nombre, apellido),
        mp_cuenta:mp_cuentas(id, nombre, descripcion, activo)`
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

    // Sincronizar campos en SitioHoy
    if (anterior.tenant_id) {
      const shUpdate: Record<string, unknown> = {};

      // Plan y max_products
      if (parsed.data.plan_id) {
        const { data: planData } = await supabaseAdmin
          .from("planes")
          .select("nombre")
          .eq("id", parsed.data.plan_id)
          .single();

        if (planData) {
          shUpdate.plan = planData.nombre.toLowerCase();
          shUpdate.max_products = maxProductsForPlan(planData.nombre);
        }
      }

      // URL cuando cambia el dominio
      if (parsed.data.dominio !== anterior.dominio) {
        shUpdate.url = dominioToUrl(parsed.data.dominio);
      }

      // current_period_end cuando cambia la fecha de pago
      if (parsed.data.fecha_pago !== anterior.fecha_pago && cliente.fecha_vencimiento) {
        shUpdate.current_period_end = cliente.fecha_vencimiento;
      }

      if (Object.keys(shUpdate).length > 0) {
        const { error: shError } = await supabaseSitioHoy
          .from("tenants")
          .update(shUpdate)
          .eq("id", anterior.tenant_id);

        if (shError) {
          console.error("[SitioHoy sync] Error actualizando tenant:", shError.message);
        }
      }
    }

    await registrarAuditoria({
      usuario_id: user.id,
      tabla_afectada: "clientes",
      registro_id: id,
      accion: "UPDATE",
      cambios_anteriores: anterior,
      cambios_nuevos: cliente,
    });

    // Solo tomar snapshot si cambiaron el plan o el estado
    const planCambio = anterior?.plan_id !== cliente?.plan_id;
    const estadoCambio = anterior?.estado !== cliente?.estado;
    if (planCambio || estadoCambio) await tomarSnapshotMRR();

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

    await tomarSnapshotMRR();
    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
