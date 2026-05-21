import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { supabaseSitioHoy } from "@/lib/supabase-sitiohoy";
import { corsHeaders } from "@/lib/cors";

async function verifyAndGetTenantId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);

  const { data: { user }, error } = await supabaseSitioHoy.auth.getUser(token);
  if (error || !user) return null;

  const { data: userTenant } = await supabaseSitioHoy
    .from("user_tenants")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single();

  return userTenant?.tenant_id ?? null;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ session_id: string }> }
) {
  const headers = corsHeaders();
  try {
    const tenantId = await verifyAndGetTenantId(request);
    if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401, headers });

    const { session_id } = await params;

    const { data: session } = await supabaseAdmin
      .from("chat_sessions")
      .select("id, status, tenant_id")
      .eq("id", session_id)
      .maybeSingle();

    if (!session) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404, headers });
    }

    if (session.tenant_id !== tenantId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403, headers });
    }

    if (session.status === "pending") {
      return NextResponse.json({ ok: true, status: "pending" }, { headers });
    }

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("chat_sessions")
      .update({ status: "pending", pending_since: now, updated_at: now })
      .eq("id", session_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers });

    return NextResponse.json({ ok: true, status: "pending" }, { headers });
  } catch (err) {
    console.error("[chat/request-support]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500, headers });
  }
}
