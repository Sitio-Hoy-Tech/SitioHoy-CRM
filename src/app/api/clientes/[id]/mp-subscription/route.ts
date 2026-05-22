import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/api";
import { createSubscription } from "@/lib/mercadopago";
import { registrarAuditoria } from "@/lib/audit";

// POST /api/clientes/[id]/mp-subscription
// Crea (o regenera) la suscripción de MercadoPago para un cliente,
// usando el access token de la cuenta MP asignada al cliente.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    const { id } = await params;

    const { data: cliente, error } = await supabaseAdmin
      .from("clientes")
      .select(
        "id, nombre_empresa, mp_subscription_id, mp_cuenta_id, plan:planes(precio), contacto:contactos(email)"
      )
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const plan = cliente.plan as { precio: number } | null;
    const contacto = cliente.contacto as { email: string | null } | null;

    if (!plan?.precio) {
      return NextResponse.json({ error: "El cliente no tiene plan asignado" }, { status: 400 });
    }
    if (!contacto?.email) {
      return NextResponse.json(
        { error: "El contacto del cliente no tiene email registrado" },
        { status: 400 }
      );
    }

    // Obtener el access token: primero desde la cuenta asignada, luego env var como fallback
    let accessToken: string;

    if (!cliente.mp_cuenta_id) {
      return NextResponse.json(
        { error: "El cliente no tiene una cuenta MP asignada" },
        { status: 400 }
      );
    }

    const { data: cuenta } = await supabaseAdmin
      .from("mp_cuentas")
      .select("access_token, activo")
      .eq("id", cliente.mp_cuenta_id)
      .single();

    if (!cuenta) {
      return NextResponse.json({ error: "Cuenta MP no encontrada" }, { status: 404 });
    }
    if (!cuenta.activo) {
      return NextResponse.json(
        { error: "La cuenta MP asignada está inactiva" },
        { status: 400 }
      );
    }
    accessToken = cuenta.access_token;

    const backUrl = `${process.env.SITIOHOY_APP_URL ?? "https://admin.sitiohoy.com.ar"}/admin/mi-plan`;

    const subscription = await createSubscription({
      reason: `Suscripción SitioHoy — ${cliente.nombre_empresa}`,
      payerEmail: contacto.email,
      amount: Number(plan.precio),
      backUrl,
      accessToken,
    });

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("clientes")
      .update({
        mp_subscription_id: subscription.id,
        mp_init_point: subscription.init_point,
        mp_status: subscription.status,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await registrarAuditoria({
      usuario_id: user.id,
      tabla_afectada: "clientes",
      registro_id: id,
      accion: "UPDATE",
      cambios_anteriores: { mp_subscription_id: cliente.mp_subscription_id },
      cambios_nuevos: {
        mp_subscription_id: subscription.id,
        mp_init_point: subscription.init_point,
        mp_status: subscription.status,
      },
    });

    return NextResponse.json({
      data: {
        mp_subscription_id: updated.mp_subscription_id,
        mp_init_point: updated.mp_init_point,
        mp_status: updated.mp_status,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
