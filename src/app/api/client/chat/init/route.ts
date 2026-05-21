import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { supabaseSitioHoy } from "@/lib/supabase-sitiohoy";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
  const headers = corsHeaders();
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401, headers });
    }
    const token = authHeader.slice(7);

    const { data: { user }, error: authError } = await supabaseSitioHoy.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401, headers });
    }

    // Obtener tenant_id desde la tabla user_tenants de SitioHoy
    const { data: userTenant } = await supabaseSitioHoy
      .from("user_tenants")
      .select("tenant_id")
      .eq("user_id", user.id)
      .single();

    if (!userTenant?.tenant_id) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404, headers });
    }

    const tenantId = userTenant.tenant_id;

    const { data: cliente } = await supabaseAdmin
      .from("clientes")
      .select("id, nombre_empresa")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado en el CRM" }, { status: 404, headers });
    }

    // Buscar sesión activa existente (open o pending)
    const { data: existing } = await supabaseAdmin
      .from("chat_sessions")
      .select("id, status")
      .eq("cliente_id", cliente.id)
      .in("status", ["open", "pending"])
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    let sessionId: string;

    if (existing) {
      sessionId = existing.id;
    } else {
      // Reabrir la primera sesión cerrada del cliente en lugar de crear una nueva
      const { data: closedSession } = await supabaseAdmin
        .from("chat_sessions")
        .select("id")
        .eq("cliente_id", cliente.id)
        .eq("status", "closed")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (closedSession) {
        await supabaseAdmin
          .from("chat_sessions")
          .update({ status: "open", updated_at: new Date().toISOString() })
          .eq("id", closedSession.id);
        sessionId = closedSession.id;
      } else {
        const { data: newSession, error: createError } = await supabaseAdmin
          .from("chat_sessions")
          .insert({
            cliente_id: cliente.id,
            tenant_id: tenantId,
            status: "open",
          })
          .select("id")
          .single();

        if (createError || !newSession) {
          return NextResponse.json({ error: "Error al crear sesión" }, { status: 500, headers });
        }
        sessionId = newSession.id;
      }
    }

    // Actualizar tenant_id en sesiones existentes que lo tengan vacío
    await supabaseAdmin
      .from("chat_sessions")
      .update({ tenant_id: tenantId })
      .eq("id", sessionId)
      .is("tenant_id", null);

    // Cargar últimos 50 mensajes
    const { data: messages } = await supabaseAdmin
      .from("chat_messages")
      .select("id, sender_type, sender_name, content, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: sessionData } = await supabaseAdmin
      .from("chat_sessions")
      .select("status")
      .eq("id", sessionId)
      .single();

    return NextResponse.json(
      {
        session_id: sessionId,
        status: sessionData?.status ?? "open",
        cliente_nombre: cliente.nombre_empresa,
        messages: (messages ?? []).reverse(),
      },
      { headers }
    );
  } catch (err) {
    console.error("[chat/init]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500, headers });
  }
}
