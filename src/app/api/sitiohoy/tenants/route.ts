import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { supabaseSitioHoy } from "@/lib/supabase-sitiohoy";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tenant_id = searchParams.get("tenant_id")?.trim();

  if (!tenant_id) {
    return NextResponse.json({ error: "tenant_id es requerido" }, { status: 400 });
  }

  const { data: tenant, error } = await supabaseSitioHoy
    .from("tenants")
    .select("*")
    .eq("id", tenant_id)
    .single();

  if (error || !tenant) {
    return NextResponse.json(
      { error: "Tenant no encontrado", detail: error?.message ?? null },
      { status: 404 }
    );
  }

  // Verificar si ya existe un cliente en el CRM con este tenant_id
  const { data: existing } = await supabaseAdmin
    .from("clientes")
    .select("id")
    .eq("tenant_id", tenant_id)
    .is("deleted_at", null)
    .single();

  const userId = (tenant as any).user_id ?? (tenant as any).owner_id ?? (tenant as any).created_by ?? null;
  let ownerEmail: string | null = null;
  if (userId) {
    try {
      const { data: authData } = await supabaseSitioHoy.auth.admin.getUserById(userId);
      ownerEmail = authData.user?.email ?? null;
    } catch {
      // non-fatal
    }
  }

  return NextResponse.json({
    data: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      url: tenant.url,
      plan: tenant.plan,
      status: tenant.status,
      max_products: tenant.max_products,
      _owner_email: ownerEmail,
      _ya_importado: !!existing,
    },
  });
}
