import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  descripcion: z.string().optional().default(""),
  email_titular: z.string().email("Email inválido").optional().or(z.literal("")).transform(v => v || null),
  access_token: z.string().min(1, "Access token requerido"),
  public_key: z.string().optional().or(z.literal("")).transform(v => v || null),
  webhook_secret: z.string().optional().or(z.literal("")).transform(v => v || null),
  activo: z.boolean().default(true),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getSessionUser();
    const { id } = await params;
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("mp_cuentas")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, nombre, descripcion, activo, created_at, updated_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getSessionUser();
    const { id } = await params;

    // Desasignar el cuenta_id de clientes antes de eliminar
    await supabaseAdmin
      .from("clientes")
      .update({ mp_cuenta_id: null })
      .eq("mp_cuenta_id", id);

    const { error } = await supabaseAdmin.from("mp_cuentas").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
