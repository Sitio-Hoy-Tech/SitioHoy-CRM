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

// GET — cargar más mensajes (paginación hacia atrás)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ session_id: string }> }
) {
  const headers = corsHeaders();
  try {
    const tenantId = await verifyAndGetTenantId(request);
    if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401, headers });

    const { session_id } = await params;
    const before = request.nextUrl.searchParams.get("before");

    let query = supabaseAdmin
      .from("chat_messages")
      .select("id, sender_type, sender_name, content, created_at")
      .eq("session_id", session_id)
      .order("created_at", { ascending: false })
      .limit(51);

    if (before) query = query.lt("created_at", before);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers });

    const hasMore = (data?.length ?? 0) > 50;
    const messages = (data ?? []).slice(0, 50).reverse();

    return NextResponse.json({ messages, hasMore }, { headers });
  } catch (err) {
    console.error("[chat/messages GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500, headers });
  }
}

// POST — cliente envía mensaje
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ session_id: string }> }
) {
  const headers = corsHeaders();
  try {
    const tenantId = await verifyAndGetTenantId(request);
    if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401, headers });

    const { session_id } = await params;
    const body = await request.json();
    const content: string = (body?.content ?? "").trim();

    if (!content) {
      return NextResponse.json({ error: "Mensaje vacío" }, { status: 400, headers });
    }

    const { data: session } = await supabaseAdmin
      .from("chat_sessions")
      .select("id, status, cliente_id, unread_agent_count")
      .eq("id", session_id)
      .maybeSingle();

    if (!session) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404, headers });
    }
    if (session.status === "closed") {
      await supabaseAdmin
        .from("chat_sessions")
        .update({ status: "open", updated_at: new Date().toISOString() })
        .eq("id", session_id);
    }

    const { data: cliente } = await supabaseAdmin
      .from("clientes")
      .select("nombre_empresa")
      .eq("id", session.cliente_id)
      .maybeSingle();

    const { data: message, error: msgError } = await supabaseAdmin
      .from("chat_messages")
      .insert({
        session_id,
        sender_type: "client",
        sender_name: cliente?.nombre_empresa ?? "Cliente",
        content,
      })
      .select("id, sender_type, sender_name, content, created_at")
      .single();

    if (msgError || !message) {
      console.error("[chat/messages POST] insert error:", msgError);
      return NextResponse.json({ error: "Error al enviar" }, { status: 500, headers });
    }

    await supabaseAdmin
      .from("chat_sessions")
      .update({
        last_message_at: message.created_at,
        last_message_preview: content.slice(0, 120),
        updated_at: new Date().toISOString(),
        unread_agent_count: (session.unread_agent_count ?? 0) + 1,
      })
      .eq("id", session_id);

    return NextResponse.json({ message }, { status: 201, headers });
  } catch (err) {
    console.error("[chat/messages POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500, headers });
  }
}
