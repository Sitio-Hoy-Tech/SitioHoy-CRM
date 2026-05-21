import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { supabaseSitioHoy } from "@/lib/supabase-sitiohoy";
import { registrarAuditoria } from "@/lib/audit";
import { getSessionUser } from "@/lib/api";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from("tickets")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch tenant info from SitioHoy
    let tenant = null;
    if (data?.tenant_id) {
      const { data: t } = await supabaseSitioHoy
        .from("tenants")
        .select("id, name, slug, url, plan, status, max_products, origin_name, origin_phone, origin_address, origin_city, origin_postal_code, origin_state, contact_email")
        .eq("id", data.tenant_id)
        .maybeSingle();
      tenant = t;
    }

    // Buscar el cliente CRM vinculado por tenant_id
    let crmCliente = null;
    if (data?.tenant_id) {
      const { data: cliente } = await supabaseAdmin
        .from("clientes")
        .select("id, nombre_empresa, contacto_id")
        .eq("tenant_id", data.tenant_id)
        .is("deleted_at", null)
        .maybeSingle();

      if (cliente) {
        let telefono: string | null = null;
        if (cliente.contacto_id) {
          const { data: contacto } = await supabaseAdmin
            .from("contactos")
            .select("telefono")
            .eq("id", cliente.contacto_id)
            .maybeSingle();
          telefono = contacto?.telefono ?? null;
        }
        crmCliente = { id: cliente.id, nombre_empresa: cliente.nombre_empresa, contacto: { telefono } };
      }
    }

    return NextResponse.json({ data: { ...data, tenant, crm_cliente: crmCliente } });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: "Estado requerido" }, { status: 400 });
    }

    const user = await getSessionUser();

    const { data: anterior } = await supabaseAdmin
      .from("tickets")
      .select("id, status, name, email, source, tenant_id")
      .eq("id", id)
      .single();

    const { data, error } = await supabaseAdmin
      .from("tickets")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await registrarAuditoria({
      usuario_id: user.id,
      tabla_afectada: "tickets",
      registro_id: id,
      accion: "UPDATE",
      cambios_anteriores: anterior ? { status: anterior.status } : null,
      cambios_nuevos: { status, name: anterior?.name ?? null, email: anterior?.email ?? null },
    });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
