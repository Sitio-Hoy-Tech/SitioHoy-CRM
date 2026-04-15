import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { clienteSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { getSessionUser } from "@/lib/api";

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

    let query = supabaseAdmin
      .from("clientes")
      .select(
        `*,
        contacto:contactos(id, nombre, apellido, email, telefono),
        plan:planes(id, nombre, precio),
        plantilla:plantillas(id, nombre),
        etiqueta_negocio:etiquetas_negocio(id, nombre),
        usuario_creador:usuarios!clientes_created_by_fkey(id, nombre, apellido)`,
        { count: "exact" }
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

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
    const parsed = clienteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Generar tenant_id único
    const tenant_id = `tenant_${parsed.data.dominio.replace(/[^a-zA-Z0-9]/g, "_")}`;

    // Verificar dominio único
    const { data: existing } = await supabaseAdmin
      .from("clientes")
      .select("id")
      .eq("dominio", parsed.data.dominio)
      .is("deleted_at", null)
      .single();

    if (existing) {
      return NextResponse.json({ error: "El dominio ya está registrado" }, { status: 409 });
    }

    const { data: cliente, error } = await supabaseAdmin
      .from("clientes")
      .insert({
        ...parsed.data,
        tenant_id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await registrarAuditoria({
      usuario_id: user.id,
      tabla_afectada: "clientes",
      registro_id: cliente.id,
      accion: "CREATE",
      cambios_nuevos: cliente,
    });

    revalidatePath("/");
    return NextResponse.json({ data: cliente }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
