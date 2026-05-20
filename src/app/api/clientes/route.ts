import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { supabaseSitioHoy } from "@/lib/supabase-sitiohoy";
import { revalidatePath } from "next/cache";
import { clienteSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { getSessionUser } from "@/lib/api";
import { tomarSnapshotMRR } from "@/lib/mrr";

// GET /api/clientes - Listar con filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || "";
    const plan_id = searchParams.get("plan_id") || "";
    const estado = searchParams.get("estado") || "";
    const etiqueta_negocio_id = searchParams.get("etiqueta_negocio_id") || "";
    const vencimiento_dias = searchParams.get("vencimiento_dias");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;
    const archived = searchParams.get("archived") === "true";

    let query = supabaseAdmin
      .from("clientes")
      .select(
        `*,
        contacto:contactos(id, nombre, apellido, email, telefono),
        plan:planes(id, nombre, precio),
        etiqueta_negocio:etiquetas_negocio(id, nombre),
        usuario_creador:usuarios!clientes_created_by_fkey(id, nombre, apellido)`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })

    if (archived) {
      query = query.not("deleted_at", "is", null);
    } else {
      query = query.is("deleted_at", null);
    }
    query = query.range(offset, offset + limit - 1);

    if (search) {
      query = query.or(
        `nombre_empresa.ilike.%${search}%,dominio.ilike.%${search}%`
      );
    }
    if (plan_id) query = query.eq("plan_id", plan_id);
    if (estado === "activo") query = query.eq("estado", true);
    if (estado === "inactivo") query = query.eq("estado", false);
    if (etiqueta_negocio_id) query = query.eq("etiqueta_negocio_id", etiqueta_negocio_id);
    if (vencimiento_dias) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + parseInt(vencimiento_dias));
      query = query.lte("fecha_vencimiento", futureDate.toISOString());
      query = query.gte("fecha_vencimiento", new Date().toISOString());
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, count });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/clientes - Crear
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = await request.json();

    // Extraer credenciales de auth (no son campos del CRM)
    const { email: authEmail, password: authPassword, ...crmBody } = body;

    if (!authEmail || !authPassword) {
      return NextResponse.json(
        { error: "Email y contraseña del panel son requeridos" },
        { status: 400 }
      );
    }
    if (authPassword.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const parsed = clienteSchema.safeParse(crmBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verificar dominio único en el CRM (solo si se proporcionó)
    if (parsed.data.dominio) {
      const { data: existing } = await supabaseAdmin
        .from("clientes")
        .select("id")
        .eq("dominio", parsed.data.dominio)
        .is("deleted_at", null)
        .single();

      if (existing) {
        return NextResponse.json({ error: "El dominio ya está registrado" }, { status: 409 });
      }
    }

    // Generar UUID real para el tenant
    const tenant_id = crypto.randomUUID();

    // Obtener el nombre del plan para mapearlo al valor de SitioHoy
    const { data: planData } = await supabaseAdmin
      .from("planes")
      .select("nombre")
      .eq("id", parsed.data.plan_id)
      .single();

    // ── 1. Crear tenant en SitioHoy ──────────────────────────────────────────
    const slugBase = parsed.data.dominio ?? parsed.data.nombre_empresa;
    const slug = slugBase.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const planNombre = (planData?.nombre ?? "").toLowerCase();
    const maxProducts = planNombre.includes("empresa")
      ? null
      : planNombre.includes("emprendimiento")
      ? 200
      : 50;
    const { error: tenantError } = await supabaseSitioHoy
      .from("tenants")
      .insert({
        id: tenant_id,
        name: parsed.data.nombre_empresa,
        slug,
        url: parsed.data.dominio ? `https://${parsed.data.dominio}` : null,
        plan: planNombre || "esencial",
        status: "active",
        max_products: maxProducts,
      });

    if (tenantError) {
      return NextResponse.json(
        { error: `Error creando tenant: ${tenantError.message}` },
        { status: 500 }
      );
    }

    // ── 2. Crear usuario de authentication en SitioHoy ───────────────────────
    const { data: authData, error: authError } = await supabaseSitioHoy.auth.admin.createUser({
      email: authEmail,
      password: authPassword,
      email_confirm: true,
    });

    if (authError) {
      await supabaseSitioHoy.from("tenants").delete().eq("id", tenant_id);
      return NextResponse.json(
        { error: `Error creando usuario: ${authError.message}` },
        { status: 500 }
      );
    }

    const authUserId = authData.user.id;

    // ── 3. Vincular usuario al tenant (user_tenants + user_id en tenants) ────
    const [utResult] = await Promise.all([
      supabaseSitioHoy
        .from("user_tenants")
        .insert({ user_id: authUserId, tenant_id, role: "owner" }),
      supabaseSitioHoy
        .from("tenants")
        .update({ user_id: authUserId })
        .eq("id", tenant_id),
    ]);

    if (utResult.error) {
      // Rollback auth user y tenant
      await supabaseSitioHoy.auth.admin.deleteUser(authUserId);
      await supabaseSitioHoy.from("tenants").delete().eq("id", tenant_id);
      return NextResponse.json(
        { error: `Error vinculando usuario al tenant: ${utResult.error.message}` },
        { status: 500 }
      );
    }

    // ── 4. Crear cliente en el CRM ────────────────────────────────────────────
    const { data: cliente, error: clienteError } = await supabaseAdmin
      .from("clientes")
      .insert({
        ...parsed.data,
        tenant_id,
        created_by: user.id,
      })
      .select()
      .single();

    if (clienteError) {
      await supabaseSitioHoy.from("user_tenants").delete().eq("tenant_id", tenant_id);
      await supabaseSitioHoy.auth.admin.deleteUser(authUserId);
      await supabaseSitioHoy.from("tenants").delete().eq("id", tenant_id);
      return NextResponse.json({ error: clienteError.message }, { status: 500 });
    }

    await registrarAuditoria({
      usuario_id: user.id,
      tabla_afectada: "clientes",
      registro_id: cliente.id,
      accion: "CREATE",
      cambios_nuevos: cliente,
    });

    await tomarSnapshotMRR();
    revalidatePath("/");
    return NextResponse.json({ data: cliente }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
