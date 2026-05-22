import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSubscription, verifyWebhookSignature } from "@/lib/mercadopago";

function addOneMonth(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  return d;
}

// POST /api/webhooks/mercadopago/[cuenta_id]
// Webhook específico por cuenta MP. Configurar esta URL en el panel de developers de MP.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cuenta_id: string }> }
) {
  try {
    const { cuenta_id } = await params;

    const { data: cuenta } = await supabaseAdmin
      .from("mp_cuentas")
      .select("id, access_token, webhook_secret, activo")
      .eq("id", cuenta_id)
      .single();

    if (!cuenta?.activo) {
      return NextResponse.json({ received: true });
    }

    const xSignature = request.headers.get("x-signature") ?? "";
    const xRequestId = request.headers.get("x-request-id") ?? "";
    const ts = xSignature.match(/ts=([^,]+)/)?.[1] ?? "";
    const v1 = xSignature.match(/v1=([^,]+)/)?.[1] ?? "";

    const body = await request.json();
    const dataId: string = body?.data?.id ?? "";
    const topic: string = body?.type ?? "";

    // Validar firma con el secret específico de la cuenta
    if (ts && v1 && dataId && cuenta.webhook_secret) {
      const valid = verifyWebhookSignature({
        dataId,
        requestId: xRequestId,
        ts,
        v1,
        secret: cuenta.webhook_secret,
      });
      if (!valid) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    if (topic === "preapproval" && dataId) {
      const subscription = await getSubscription(dataId, cuenta.access_token);

      const { data: cliente } = await supabaseAdmin
        .from("clientes")
        .select("id, fecha_vencimiento, mp_status")
        .eq("mp_subscription_id", dataId)
        .is("deleted_at", null)
        .single();

      if (cliente) {
        const updates: Record<string, unknown> = { mp_status: subscription.status };

        if (subscription.status === "authorized" && cliente.mp_status !== "authorized") {
          const base = cliente.fecha_vencimiento ? new Date(cliente.fecha_vencimiento) : new Date();
          updates.fecha_vencimiento = addOneMonth(base).toISOString();
        }

        await supabaseAdmin.from("clientes").update(updates).eq("id", cliente.id);
      }
    }

    if (topic === "payment" && dataId) {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
        headers: { Authorization: `Bearer ${cuenta.access_token}` },
      });

      if (res.ok) {
        const payment = await res.json();

        if (
          payment.payment_type_id === "recurring_payment" &&
          payment.status === "approved" &&
          payment.metadata?.preapproval_id
        ) {
          const { data: cliente } = await supabaseAdmin
            .from("clientes")
            .select("id, fecha_vencimiento")
            .eq("mp_subscription_id", payment.metadata.preapproval_id)
            .is("deleted_at", null)
            .single();

          if (cliente) {
            const base = cliente.fecha_vencimiento ? new Date(cliente.fecha_vencimiento) : new Date();
            await supabaseAdmin
              .from("clientes")
              .update({ fecha_vencimiento: addOneMonth(base).toISOString() })
              .eq("id", cliente.id);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ received: true });
  }
}
