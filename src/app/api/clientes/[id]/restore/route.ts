import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { registrarAuditoria } from "@/lib/audit";
import { getSessionUser } from "@/lib/api";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    const { id } = await params;

    const { data: anterior, error: fetchError } = await supabaseAdmin
      .from("clientes")
      .select("*")
      .eq("id", id)
      .not("deleted_at", "is", null)
      .single();

    if (fetchError || !anterior) {
      return NextResponse.json({ error: "Cliente archivado no encontrado" }, { status: 404 });
    }

    const { data: cliente, error } = await supabaseAdmin
      .from("clientes")
      .update({ deleted_at: null })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await registrarAuditoria({
      usuario_id: user.id,
      tabla_afectada: "clientes",
      registro_id: id,
      accion: "UPDATE",
      cambios_anteriores: anterior,
      cambios_nuevos: cliente,
    });

    return NextResponse.json({ data: cliente });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
