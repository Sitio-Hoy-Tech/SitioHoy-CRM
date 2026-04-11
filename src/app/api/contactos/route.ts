import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { contactoSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { getSessionUser } from "@/lib/api";

// GET /api/contactos - Listar con filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || "";
    const estado_id = searchParams.get("estado_id") || "";
    const etiqueta_negocio_id = searchParams.get("etiqueta_negocio_id") || "";
    const origen = searchParams.get("origen") || "";
    const fecha_desde = searchParams.get("fecha_desde") || "";
    const fecha_hasta = searchParams.get("fecha_hasta") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("contactos")
      .select(
        `*,
        estado:estados_contacto(id, nombre),
        etiqueta_negocio:etiquetas_negocio(id, nombre),
        usuario_creador:usuarios!contactos_created_by_fkey(id, nombre, apellido)`,
        { count: "exact" }
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(
        `nombre.ilike.%${search}%,apellido.ilike.%${search}%,email.ilike.%${search}%`
      );
    }
    if (estado_id) query = query.eq("estado_id", estado_id);
    if (etiqueta_negocio_id) query = query.eq("etiqueta_negocio_id", etiqueta_negocio_id);
    if (origen) query = query.eq("origen", origen);
    if (fecha_desde) query = query.gte("fecha_contacto", fecha_desde);
    if (fecha_hasta) query = query.lte("fecha_contacto", fecha_hasta);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, count });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/contactos - Crear
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const parsed = contactoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { data: contacto, error } = await supabaseAdmin
      .from("contactos")
      .insert({
        ...parsed.data,
        etiqueta_negocio_id: parsed.data.etiqueta_negocio_id || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await registrarAuditoria({
      usuario_id: user.id,
      tabla_afectada: "contactos",
      registro_id: contacto.id,
      accion: "CREATE",
      cambios_nuevos: contacto,
    });

    return NextResponse.json({ data: contacto }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
