import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/api";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getSessionUser();
    const { id } = await params;

    // Limpiar imágenes del storage antes de borrar los mensajes
    const { data: files } = await supabaseAdmin.storage.from("chat-images").list(id);
    if (files?.length) {
      const paths = files.map((f: { name: string }) => `${id}/${f.name}`);
      await supabaseAdmin.storage.from("chat-images").remove(paths);
    }

    await supabaseAdmin.from("chat_messages").delete().eq("session_id", id);

    const { error } = await supabaseAdmin
      .from("chat_sessions")
      .delete()
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getSessionUser();
    const { id } = await params;
    const body = await request.json();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body?.markRead) {
      updates.unread_agent_count = 0;
    }

    let reopening = false;
    let closing = false;

    if (body?.status) {
      const status: string = body.status;
      if (!["open", "closed", "pending"].includes(status)) {
        return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
      }

      if (status === "open" || status === "closed") {
        const { data: current } = await supabaseAdmin
          .from("chat_sessions")
          .select("status")
          .eq("id", id)
          .single();
        if (status === "open" && current?.status === "closed") reopening = true;
        if (status === "closed" && current?.status !== "closed") closing = true;
      }

      updates.status = status;
      if (status !== "pending") updates.pending_since = null;
    }

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: "Sin cambios válidos" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("chat_sessions")
      .update(updates)
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (reopening) {
      const { error: reopenErr } = await supabaseAdmin.from("chat_messages").insert({
        session_id: id,
        sender_type: "system",
        sender_name: null,
        content: "__session_reopened__",
      });
      if (reopenErr) console.error("[chat/reopen] system message insert failed:", reopenErr.message);
    }

    if (closing) {
      const { error: closeErr } = await supabaseAdmin.from("chat_messages").insert({
        session_id: id,
        sender_type: "system",
        sender_name: null,
        content: "__session_closed__",
      });
      if (closeErr) console.error("[chat/close] system message insert failed:", closeErr.message);

      // Limpiar imágenes del storage de la sesión usando la Storage API
      const { data: files } = await supabaseAdmin.storage.from("chat-images").list(id);
      if (files?.length) {
        const paths = files.map((f: { name: string }) => `${id}/${f.name}`);
        await supabaseAdmin.storage.from("chat-images").remove(paths);
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
