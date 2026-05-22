import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSubscription, verifyWebhookSignature } from "@/lib/mercadopago";

function addOneMonth(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  return d;
}

async function getAccessTokenForSubscription(mp_subscription_id: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("clientes")
    .select("mp_cuenta_id, mp_cuentas(access_token)")
    .eq("mp_subscription_id", mp_subscription_id)
    .is("deleted_at", null)
    .single();

  return (data?.mp_cuentas as { access_token: string } | null)?.access_token ?? null;
}

// POST /api/webhooks/mercadopago
export async function POST(request: NextRequest) {
  try {
    const xSignature = request.headers.get("x-signature") ?? "";
    const xRequestId = request.headers.get("x-request-id") ?? "";

    const ts = xSignature.match(/ts=([^,]+)/)?.[1] ?? "";
    const v1 = xSignature.match(/v1=([^,]+)/)?.[1] ?? "";

    const body = await request.json();
    const dataId: string = body?.data?.id ?? "";
    const topic: string = body?.type ?? "";

    if (ts && v1 && dataId) {
      const valid = verifyWebhookSignature({ dataId, requestId: xRequestId, ts, v1 });
      if (!valid) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    // Subscription status changes
    if (topic === "preapproval" && dataId) {
      const accessToken = await getAccessTokenForSubscription(dataId);
      if (!accessToken) return NextResponse.json({ received: true });

      const subscription = await getSubscription(dataId, accessToken);

      const { data: cliente } = await supabaseAdmin
        .from("clientes")
        .select("id, fecha_vencimiento, mp_status")
        .eq("mp_subscription_id", dataId)
        .is("deleted_at", null)
        .single();

      if (!cliente) return NextResponse.json({ received: true });

      const updates: Record<string, unknown> = { mp_status: subscription.status };

      if (subscription.status === "authorized" && cliente.mp_status !== "authorized") {
        const base = cliente.fecha_vencimiento ? new Date(cliente.fecha_vencimiento) : new Date();
        updates.fecha_vencimiento = addOneMonth(base).toISOString();
      }

      await supabaseAdmin.from("clientes").update(updates).eq("id", cliente.id);
    }

    // Recurring payment approved → extend vencimiento
    if (topic === "payment" && dataId) {
      const accessToken = await getAccessTokenForSubscription(dataId);
      if (accessToken) {
        const res = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
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
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ received: true });
  }
}
