import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/api";

export async function GET() {
  try {
    await getSessionUser();

    const { data, error } = await supabaseAdmin
      .from("chat_sessions")
      .select("*, cliente:clientes(id, nombre_empresa)")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await getSessionUser();

    const body = await request.json();
    const cliente_id: string = body?.cliente_id ?? "";

    if (!cliente_id) {
      return NextResponse.json({ error: "cliente_id requerido" }, { status: 400 });
    }

    // Reuse existing open session if it exists
    const { data: existing } = await supabaseAdmin
      .from("chat_sessions")
      .select("id")
      .eq("cliente_id", cliente_id)
      .eq("status", "open")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ data: existing });
    }

    const { data, error } = await supabaseAdmin
      .from("chat_sessions")
      .insert({ cliente_id, status: "open" })
      .select("*, cliente:clientes(id, nombre_empresa)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
