import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { supabaseSitioHoy } from "@/lib/supabase-sitiohoy";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const source = searchParams.get("source") || "";
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const dateFrom = searchParams.get("date_from") || "";
    const dateTo = searchParams.get("date_to") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("tickets")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (source) query = query.eq("source", source);
    if (status) query = query.eq("status", status);
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,message.ilike.%${search}%`);
    }
    if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00`);
    if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Batch-fetch tenant info from SitioHoy
    const tenantIds = [...new Set((data || []).map((t: { tenant_id: string }) => t.tenant_id).filter(Boolean))];
    const tenantById: Record<string, { id: string; name: string; origin_phone: string | null; contact_email: string | null }> = {};

    if (tenantIds.length > 0) {
      const { data: tenants } = await supabaseSitioHoy
        .from("tenants")
        .select("id, name, origin_phone, contact_email")
        .in("id", tenantIds);
      for (const t of (tenants || []) as { id: string; name: string; origin_phone: string | null; contact_email: string | null }[]) {
        tenantById[t.id] = t;
      }
    }

    // Batch-fetch CRM contact phones for all tenant_ids in this page
    const phoneByTenantId: Record<string, string | null> = {};

    if (tenantIds.length > 0) {
      const { data: clientes } = await supabaseAdmin
        .from("clientes")
        .select("tenant_id, contacto_id")
        .in("tenant_id", tenantIds)
        .is("deleted_at", null);

      const contactoIds = [
        ...new Set(
          ((clientes || []) as { tenant_id: string; contacto_id: string | null }[])
            .map((c) => c.contacto_id)
            .filter(Boolean)
        ),
      ];

      if (contactoIds.length > 0) {
        const { data: contactos } = await supabaseAdmin
          .from("contactos")
          .select("id, telefono")
          .in("id", contactoIds);

        const phoneByContactoId = Object.fromEntries(
          ((contactos || []) as { id: string; telefono: string | null }[]).map((c) => [c.id, c.telefono])
        );
        for (const c of (clientes || []) as { tenant_id: string; contacto_id: string | null }[]) {
          if (c.tenant_id && c.contacto_id) {
            phoneByTenantId[c.tenant_id] = phoneByContactoId[c.contacto_id] ?? null;
          }
        }
      }
    }

    const enriched = ((data || []) as { tenant_id: string; [key: string]: unknown }[]).map((ticket) => ({
      ...ticket,
      tenant: tenantById[ticket.tenant_id] ?? null,
      crm_phone: phoneByTenantId[ticket.tenant_id] ?? null,
    }));

    return NextResponse.json({ data: enriched, count });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
