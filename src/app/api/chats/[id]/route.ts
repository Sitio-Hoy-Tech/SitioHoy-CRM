import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/api";

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

    if (body?.status) {
      const status: string = body.status;
      if (!["open", "closed", "pending"].includes(status)) {
        return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
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

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
