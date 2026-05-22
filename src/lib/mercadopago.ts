const MP_API = "https://api.mercadopago.com";

function authHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

export interface MPSubscription {
  id: string;
  status: string;
  init_point: string;
  preapproval_plan_id: string | null;
  reason: string;
  payer_email: string;
  auto_recurring: {
    frequency: number;
    frequency_type: string;
    transaction_amount: number;
    currency_id: string;
  };
}

export async function createSubscription(opts: {
  reason: string;
  payerEmail: string;
  amount: number;
  backUrl: string;
  accessToken: string;
}): Promise<MPSubscription> {
  const res = await fetch(`${MP_API}/preapproval`, {
    method: "POST",
    headers: authHeaders(opts.accessToken),
    body: JSON.stringify({
      reason: opts.reason,
      payer_email: opts.payerEmail,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: opts.amount,
        currency_id: "ARS",
      },
      back_url: opts.backUrl,
      status: "pending",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MP createSubscription error ${res.status}: ${err}`);
  }
  return res.json();
}

export async function getSubscription(id: string, accessToken: string): Promise<MPSubscription> {
  const res = await fetch(`${MP_API}/preapproval/${id}`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error(`MP getSubscription error ${res.status}`);
  return res.json();
}

export async function cancelSubscription(id: string, accessToken: string): Promise<void> {
  await fetch(`${MP_API}/preapproval/${id}`, {
    method: "PUT",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ status: "cancelled" }),
  });
}

export function verifyWebhookSignature(opts: {
  dataId: string;
  requestId: string;
  ts: string;
  v1: string;
  secret?: string;
}): boolean {
  const secret = opts.secret ?? process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // skip in dev if not configured

  const { createHmac } = require("crypto");
  const manifest = `id:${opts.dataId};request-id:${opts.requestId};ts:${opts.ts}`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  return expected === opts.v1;
}
