import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/api";

const PAGE_SIZE = 50;

function buildPreview(content: string): string {
  try {
    const p = JSON.parse(content);
    if (p.__type === "attachment" && p.name) {
      return (p.mime as string)?.startsWith("image/") ? `📷 ${p.name}` : `📎 ${p.name}`;
    }
  } catch { /* not JSON */ }
  return content.slice(0, 120);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getSessionUser();
    const { id } = await params;
    const before = request.nextUrl.searchParams.get("before");

    let query = supabaseAdmin
      .from("chat_messages")
      .select("*")
      .eq("session_id", id)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE + 1);

    if (before) query = query.lt("created_at", before);

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const hasMore = (data?.length ?? 0) > PAGE_SIZE;
    const messages = (data ?? []).slice(0, PAGE_SIZE).reverse();

    return NextResponse.json({ data: messages, hasMore });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    const { id } = await params;
    const body = await request.json();
    const content: string = (body?.content ?? "").trim();

    if (!content) {
      return NextResponse.json({ error: "El mensaje no puede estar vacío" }, { status: 400 });
    }

    const { data: message, error } = await supabaseAdmin
      .from("chat_messages")
      .insert({
        session_id: id,
        sender_type: "agent",
        sender_name: user.name ?? "Agente",
        content,
      })
      .select()
      .single();

    if (error || !message) {
      return NextResponse.json({ error: error?.message ?? "Error al enviar" }, { status: 500 });
    }

    await supabaseAdmin
      .from("chat_sessions")
      .update({
        last_message_at: message.created_at,
        last_message_preview: buildPreview(content),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({ data: message }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
