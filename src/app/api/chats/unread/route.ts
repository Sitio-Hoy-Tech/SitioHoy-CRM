import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/api";

export async function GET() {
  try {
    await getSessionUser();

    const { data, error } = await supabaseAdmin
      .from("chat_sessions")
      .select("unread_agent_count")
      .gt("unread_agent_count", 0);

    if (error) return NextResponse.json({ count: 0 });

    const total = data?.reduce((sum: number, s: { unread_agent_count: number }) => sum + (s.unread_agent_count ?? 0), 0) ?? 0;
    return NextResponse.json({ count: total });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
