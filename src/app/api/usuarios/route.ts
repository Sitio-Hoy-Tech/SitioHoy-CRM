import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import { usuarioSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { getSessionUser } from "@/lib/api";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("usuarios")
      .select("id, nombre, apellido, email, rol, estado, created_at, updated_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const parsed = usuarioSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from("usuarios").select("id").eq("email", parsed.data.email).single();
    if (existing) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
    }

    const password_hash = await bcrypt.hash(parsed.data.password, 12);

    const { data, error } = await supabaseAdmin
      .from("usuarios")
      .insert({
        nombre: parsed.data.nombre,
        apellido: parsed.data.apellido,
        email: parsed.data.email,
        password_hash,
        rol: parsed.data.rol,
      })
      .select("id, nombre, apellido, email, rol, estado, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await registrarAuditoria({
      usuario_id: user.id,
      tabla_afectada: "usuarios",
      registro_id: data.id,
      accion: "CREATE",
      cambios_nuevos: { nombre: data.nombre, apellido: data.apellido, email: data.email, rol: data.rol },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
