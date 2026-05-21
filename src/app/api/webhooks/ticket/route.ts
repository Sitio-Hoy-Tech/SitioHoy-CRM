import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { record?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { record } = body;

  if (!record || record.source === "contact_form") {
    return NextResponse.json({ ok: true });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase.from("tickets").insert({
    id: record.id,
    tenant_id: record.tenant_id,
    name: record.name,
    email: record.email,
    phone: record.phone ?? null,
    message: record.message,
    source: record.source ?? null,
    status: record.status ?? "new",
    created_at: record.created_at,
    updated_at: record.updated_at,
  });

  if (error) {
    console.error("[webhook/ticket] insert error:", error.message, error.details);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
