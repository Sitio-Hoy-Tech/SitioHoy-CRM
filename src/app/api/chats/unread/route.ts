import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/api";

export async function GET() {
  try {
    await getSessionUser();

    const [unreadRes, pendingRes] = await Promise.all([
      supabaseAdmin
        .from("chat_sessions")
        .select("unread_agent_count")
        .gt("unread_agent_count", 0),
      supabaseAdmin
        .from("chat_sessions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);

    if (unreadRes.error) return NextResponse.json({ count: 0, pending_count: 0 });

    const total = unreadRes.data?.reduce(
      (sum: number, s: { unread_agent_count: number }) => sum + (s.unread_agent_count ?? 0),
      0
    ) ?? 0;
    const pending_count = pendingRes.count ?? 0;

    return NextResponse.json({ count: total, pending_count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
