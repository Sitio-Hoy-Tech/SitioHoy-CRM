import { NextRequest, NextResponse } from "next/server";
import { supabaseSitioHoy } from "@/lib/supabase-sitiohoy";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenant_id: string }> }
) {
  const { tenant_id } = await params;

  // 1. Obtener el owner_id del tenant
  const { data: tenant, error: tenantError } = await supabaseSitioHoy
    .from("tenants")
    .select("id, user_id, owner_id, created_by")
    .eq("id", tenant_id)
    .single();

  if (tenantError || !tenant) {
    return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
  }

  const ownerId: string | null =
    (tenant as any).user_id ??
    (tenant as any).owner_id ??
    (tenant as any).created_by ??
    null;

  // 2. Obtener todos los user_id vinculados al tenant desde user_tenants
  const { data: userTenants } = await supabaseSitioHoy
    .from("user_tenants")
    .select("user_id, role")
    .eq("tenant_id", tenant_id);

  const userTenantMap = new Map<string, string>(
    (userTenants ?? []).map((ut: { user_id: string; role: string }) => [ut.user_id, ut.role])
  );

  // 3. Construir el set de IDs únicos (user_tenants + owner fallback)
  const userIds = new Set<string>(userTenantMap.keys());
  if (ownerId) userIds.add(ownerId);

  if (userIds.size === 0) {
    return NextResponse.json({ data: [] });
  }

  // 4. Obtener cada usuario por ID desde auth
  const users = await Promise.all(
    Array.from(userIds).map(async (uid) => {
      const { data } = await supabaseSitioHoy.auth.admin.getUserById(uid);
      return data?.user ?? null;
    })
  );

  const tenantUsers = users
    .filter((u): u is NonNullable<typeof u> => u !== null)
    .map((u) => ({
      id: u.id,
      email: u.email ?? null,
      phone: u.phone ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      is_owner: u.id === ownerId,
    }));

  return NextResponse.json({ data: tenantUsers });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenant_id: string }> }
) {
  const { tenant_id } = await params;
  const body = await request.json();
  const { email, password } = body as { email?: string; password?: string };

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email y contraseña son requeridos" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 6 caracteres" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseSitioHoy.auth.admin.createUser({
    email,
    password,
    app_metadata: { tenant_id },
    email_confirm: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Vincular también en user_tenants
  await supabaseSitioHoy
    .from("user_tenants")
    .insert({ user_id: data.user.id, tenant_id, role: "member" });

  return NextResponse.json(
    { data: { id: data.user.id, email: data.user.email } },
    { status: 201 }
  );
}
