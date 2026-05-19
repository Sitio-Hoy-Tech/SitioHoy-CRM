import { NextRequest, NextResponse } from "next/server";
import { supabaseSitioHoy } from "@/lib/supabase-sitiohoy";
import { supabaseAdmin } from "@/lib/supabase";
import { registrarAuditoria } from "@/lib/audit";
import { getSessionUser } from "@/lib/api";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseSitioHoy
      .from("contact_messages")
      .select(`*,
        tenant:tenants(
          id, name, slug, url, plan, status, max_products,
          origin_name, origin_phone, origin_address, origin_city,
          origin_postal_code, origin_state, contact_email
        )`)
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Buscar el cliente CRM vinculado por tenant_id
    let crmCliente = null;
    if (data?.tenant_id) {
      const { data: cliente } = await supabaseAdmin
        .from("clientes")
        .select("id, nombre_empresa")
        .eq("tenant_id", data.tenant_id)
        .is("deleted_at", null)
        .maybeSingle();
      crmCliente = cliente;
    }

    return NextResponse.json({ data: { ...data, crm_cliente: crmCliente } });
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

    // Obtener estado anterior para la auditoría
    const { data: anterior } = await supabaseSitioHoy
      .from("contact_messages")
      .select("id, status, name, email, source, tenant_id")
      .eq("id", id)
      .single();

    const { data, error } = await supabaseSitioHoy
      .from("contact_messages")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await registrarAuditoria({
      usuario_id: user.id,
      tabla_afectada: "contact_messages",
      registro_id: id,
      accion: "UPDATE",
      cambios_anteriores: anterior ? { status: anterior.status } : null,
      cambios_nuevos: { status },
    });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
