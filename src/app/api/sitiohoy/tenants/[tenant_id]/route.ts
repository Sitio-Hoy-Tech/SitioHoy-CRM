import { NextRequest, NextResponse } from "next/server";
import { supabaseSitioHoy } from "@/lib/supabase-sitiohoy";

const ALLOWED_UPDATE = [
  "name", "slug", "url", "plan", "status", "max_products",
  "origin_name", "origin_phone", "origin_address", "origin_city",
  "origin_postal_code", "origin_state",
  "correo_argentino_customer_id",
  "mp_access_token", "mp_public_key",
  "resend_api_key",
  "envia_access_token",
  "revalidation_secret",
] as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenant_id: string }> }
) {
  const { tenant_id } = await params;

  const { data: tenant, error } = await supabaseSitioHoy
    .from("tenants")
    .select("*")
    .eq("id", tenant_id)
    .single();

  if (error || !tenant) {
    return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
  }

  // Fetch owner email/phone from auth.users
  let ownerEmail: string | null = null;
  let ownerPhone: string | null = null;
  try {
    // Common column names for the FK to auth.users
    const userId = (tenant as any).user_id ?? (tenant as any).owner_id ?? (tenant as any).created_by;
    if (userId) {
      const { data: authData } = await supabaseSitioHoy.auth.admin.getUserById(userId);
      ownerEmail = authData.user?.email ?? null;
      ownerPhone = authData.user?.phone ?? null;
    }
  } catch {
    // auth.users unavailable — non-fatal
  }

  let stats: {
    products: number;
    products_active: number;
    orders: number;
    revenue: number;
    orders_by_status: Record<string, number>;
  } = { products: 0, products_active: 0, orders: 0, revenue: 0, orders_by_status: {} };

  try {
    const [prodAllRes, prodActiveRes, orderRes] = await Promise.all([
      supabaseSitioHoy
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant_id),
      supabaseSitioHoy
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant_id)
        .eq("active", true),
      supabaseSitioHoy
        .from("orders")
        .select("status, total")
        .eq("tenant_id", tenant_id),
    ]);

    stats.products = prodAllRes.count ?? 0;
    stats.products_active = prodActiveRes.count ?? 0;
    stats.orders = orderRes.data?.length ?? 0;
    stats.revenue = (orderRes.data ?? []).reduce(
      (sum: number, o: { total: unknown }) => sum + (Number(o.total) || 0),
      0
    );

    const byStatus: Record<string, number> = {};
    for (const o of orderRes.data ?? []) {
      const s = (o as { status: string }).status || "unknown";
      byStatus[s] = (byStatus[s] || 0) + 1;
    }
    stats.orders_by_status = byStatus;
  } catch {
    // Stats unavailable — non-fatal
  }

  return NextResponse.json({
    data: { ...tenant, _stats: stats, _owner_email: ownerEmail, _owner_phone: ownerPhone },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenant_id: string }> }
) {
  const { tenant_id } = await params;
  const body = await request.json();

  const update: Record<string, unknown> = {};
  for (const key of ALLOWED_UPDATE) {
    if (key in body) {
      update[key] = body[key] === "" ? null : body[key];
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
  }

  const { data, error } = await supabaseSitioHoy
    .from("tenants")
    .update(update)
    .eq("id", tenant_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
