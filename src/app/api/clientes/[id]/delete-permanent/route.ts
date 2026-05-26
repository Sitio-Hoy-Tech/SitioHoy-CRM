import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { supabaseSitioHoy } from "@/lib/supabase-sitiohoy";
import { registrarAuditoria } from "@/lib/audit";
import { getSessionUser } from "@/lib/api";

async function purgarTenant(tenant_id: string): Promise<void> {
  // — Órdenes y sub-tablas —
  const { data: orders } = await supabaseSitioHoy
    .from("orders")
    .select("id")
    .eq("tenant_id", tenant_id);

  const orderIds = (orders ?? []).map((o: { id: string }) => o.id);

  if (orderIds.length > 0) {
    await Promise.all([
      supabaseSitioHoy.from("order_events").delete().in("order_id", orderIds),
      supabaseSitioHoy.from("payment_events").delete().in("order_id", orderIds),
      supabaseSitioHoy.from("order_items").delete().in("order_id", orderIds),
    ]);
  }
  await supabaseSitioHoy.from("orders").delete().eq("tenant_id", tenant_id);

  // — Productos y sub-tablas —
  const { data: products } = await supabaseSitioHoy
    .from("products")
    .select("id")
    .eq("tenant_id", tenant_id);

  const productIds = (products ?? []).map((p: { id: string }) => p.id);

  if (productIds.length > 0) {
    await Promise.all([
      supabaseSitioHoy.from("product_images").delete().in("product_id", productIds),
      supabaseSitioHoy.from("product_variants").delete().in("product_id", productIds),
    ]);
  }
  await supabaseSitioHoy.from("products").delete().eq("tenant_id", tenant_id);

  // — Categorías y subcategorías —
  const { data: categories } = await supabaseSitioHoy
    .from("categories")
    .select("id")
    .eq("tenant_id", tenant_id);

  const categoryIds = (categories ?? []).map((c: { id: string }) => c.id);
  if (categoryIds.length > 0) {
    await supabaseSitioHoy.from("subcategories").delete().in("category_id", categoryIds);
  }
  await supabaseSitioHoy.from("categories").delete().eq("tenant_id", tenant_id);

  // — Resto de tablas con tenant_id —
  await Promise.all([
    supabaseSitioHoy.from("coupons").delete().eq("tenant_id", tenant_id),
    supabaseSitioHoy.from("contact_messages").delete().eq("tenant_id", tenant_id),
    supabaseSitioHoy.from("shipping_zones").delete().eq("tenant_id", tenant_id),
  ]);

  // — Usuarios vinculados al tenant —
  const { data: userTenants } = await supabaseSitioHoy
    .from("user_tenants")
    .select("user_id")
    .eq("tenant_id", tenant_id);

  await supabaseSitioHoy.from("user_tenants").delete().eq("tenant_id", tenant_id);

  const userIds = (userTenants ?? []).map((ut: { user_id: string }) => ut.user_id);
  await Promise.all(userIds.map((uid: string) => supabaseSitioHoy.auth.admin.deleteUser(uid)));

  // — Archivos de Storage —
  const { data: storageFiles } = await supabaseSitioHoy.storage
    .from("objects")
    .list(tenant_id);

  if (storageFiles && storageFiles.length > 0) {
    const paths = storageFiles.map((f: { name: string }) => `${tenant_id}/${f.name}`);
    await supabaseSitioHoy.storage.from("objects").remove(paths);
  }

  // — Tenant —
  await supabaseSitioHoy.from("tenants").delete().eq("id", tenant_id);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    const { id } = await params;

    const { data: cliente, error: fetchError } = await supabaseAdmin
      .from("clientes")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    // Purgar todo en SitioHoy si tiene tenant_id
    if (cliente.tenant_id) {
      try {
        await purgarTenant(cliente.tenant_id);
      } catch (err) {
        return NextResponse.json(
          { error: `Error purgando tenant: ${(err as Error).message}` },
          { status: 500 }
        );
      }
    }

    // Borrado permanente en el CRM
    const { error: deleteError } = await supabaseAdmin
      .from("clientes")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    await registrarAuditoria({
      usuario_id: user.id,
      tabla_afectada: "clientes",
      registro_id: id,
      accion: "DELETE",
      cambios_anteriores: cliente,
    });

    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
