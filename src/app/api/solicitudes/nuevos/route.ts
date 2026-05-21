import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { count, error } = await supabaseAdmin
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .or("status.eq.new,status.is.null");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: count ?? 0 });
}
