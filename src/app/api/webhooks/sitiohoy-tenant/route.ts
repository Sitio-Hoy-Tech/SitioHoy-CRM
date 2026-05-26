import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseSitioHoy } from "@/lib/supabase-sitiohoy";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { type?: string; record?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.type && body.type !== "INSERT") {
    return NextResponse.json({ ok: true });
  }

  const tenant = body.record;
  if (!tenant?.id || !tenant?.name) {
    return NextResponse.json({ ok: true });
  }

  const tenantId = tenant.id as string;
  const tenantName = tenant.name as string;
  const tenantUrl = (tenant.url as string | null) ?? null;
  const tenantPlan = ((tenant.plan as string) || "esencial").toLowerCase();
  const contactEmail = (tenant.contact_email as string | null) ?? null;
  const originName = (tenant.origin_name as string | null) ?? null;
  const originPhone =
    (tenant.origin_phone as string | null) ??
    (tenant.whatsapp as string | null) ??
    null;

  const supabaseCRM = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Idempotencia: si ya existe un cliente con este tenant_id, no hacer nada
  const { data: existing } = await supabaseCRM
    .from("clientes")
    .select("id")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Obtener email del dueño desde SitioHoy si no está en contact_email
  let ownerEmail = contactEmail;
  if (!ownerEmail) {
    try {
      const { data: userTenant } = await supabaseSitioHoy
        .from("user_tenants")
        .select("user_id")
        .eq("tenant_id", tenantId)
        .eq("role", "owner")
        .maybeSingle();

      if (userTenant?.user_id) {
        const { data: authData } = await supabaseSitioHoy.auth.admin.getUserById(
          userTenant.user_id
        );
        ownerEmail = authData.user?.email ?? null;
      }
    } catch {
      // no-op: el email queda null
    }
  }

  // Buscar FKs requeridas en el CRM en paralelo
  const [estadoRes, planRes, etiquetaRes] = await Promise.all([
    supabaseCRM
      .from("estados_contacto")
      .select("id")
      .eq("nombre", "Cliente")
      .single(),
    supabaseCRM
      .from("planes")
      .select("id")
      .ilike("nombre", tenantPlan)
      .maybeSingle(),
    supabaseCRM
      .from("etiquetas_negocio")
      .select("id")
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .single(),
  ]);

  if (!estadoRes.data) {
    console.error("[webhook/sitiohoy-tenant] Estado 'Cliente' no encontrado");
    return NextResponse.json(
      { error: "Estado 'Cliente' no encontrado en CRM" },
      { status: 500 }
    );
  }
  if (!etiquetaRes.data) {
    console.error("[webhook/sitiohoy-tenant] Sin etiquetas de negocio");
    return NextResponse.json(
      { error: "No hay etiquetas de negocio configuradas en el CRM" },
      { status: 500 }
    );
  }

  // Fallback al primer plan disponible si el nombre no coincide exactamente
  let planId: string;
  if (planRes.data) {
    planId = planRes.data.id;
  } else {
    const { data: firstPlan } = await supabaseCRM
      .from("planes")
      .select("id")
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!firstPlan) {
      console.error("[webhook/sitiohoy-tenant] Sin planes configurados");
      return NextResponse.json(
        { error: "No hay planes configurados en el CRM" },
        { status: 500 }
      );
    }
    planId = firstPlan.id;
  }

  const dominio = tenantUrl
    ? tenantUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : null;

  // Crear contacto
  const { data: contacto, error: contactoError } = await supabaseCRM
    .from("contactos")
    .insert({
      nombre: originName || tenantName,
      email: ownerEmail,
      telefono: originPhone,
      estado_id: estadoRes.data.id,
      etiqueta_negocio_id: etiquetaRes.data.id,
      origen: "SitioHoy",
    })
    .select("id")
    .single();

  if (contactoError || !contacto) {
    console.error("[webhook/sitiohoy-tenant] Error creando contacto:", contactoError?.message);
    return NextResponse.json(
      { error: `Error creando contacto: ${contactoError?.message}` },
      { status: 500 }
    );
  }

  // Crear cliente
  const { error: clienteError } = await supabaseCRM.from("clientes").insert({
    nombre_empresa: tenantName,
    contacto_id: contacto.id,
    dominio,
    plan_id: planId,
    etiqueta_negocio_id: etiquetaRes.data.id,
    tenant_id: tenantId,
    fecha_pago: new Date().toISOString(),
  });

  if (clienteError) {
    // Rollback: borrar el contacto recién creado
    await supabaseCRM.from("contactos").delete().eq("id", contacto.id);
    console.error("[webhook/sitiohoy-tenant] Error creando cliente:", clienteError.message);
    return NextResponse.json(
      { error: `Error creando cliente: ${clienteError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
