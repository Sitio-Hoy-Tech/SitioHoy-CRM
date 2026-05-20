import { NextRequest, NextResponse } from "next/server";
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

    let query = supabaseSitioHoy
      .from("contact_messages")
      .select("*, tenant:tenants(id, name, origin_phone, contact_email)", { count: "exact" })
      .neq("source", "contact_form")
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

    return NextResponse.json({ data, count });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
