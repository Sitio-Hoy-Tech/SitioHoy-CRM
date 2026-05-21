import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/api";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getSessionUser();
    const { id } = await params;

    const { data } = await supabaseAdmin
      .from("chat_sessions")
      .select("id, status, cliente:clientes(nombre_empresa)")
      .eq("id", id)
      .maybeSingle();

    if (!data) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const cliente = data.cliente as { nombre_empresa: string } | null;
    return NextResponse.json({ nombre_empresa: cliente?.nombre_empresa ?? "Cliente" });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
