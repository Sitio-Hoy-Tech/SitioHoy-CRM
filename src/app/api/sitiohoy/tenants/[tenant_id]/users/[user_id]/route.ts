import { NextRequest, NextResponse } from "next/server";
import { supabaseSitioHoy } from "@/lib/supabase-sitiohoy";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenant_id: string; user_id: string }> }
) {
  const { user_id } = await params;
  const body = await request.json();

  const update: { email?: string; password?: string } = {};
  if (body.email) update.email = body.email;
  if (body.password) {
    if ((body.password as string).length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }
    update.password = body.password;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No hay campos para actualizar" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseSitioHoy.auth.admin.updateUserById(
    user_id,
    update
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: { id: data.user.id, email: data.user.email },
  });
}
