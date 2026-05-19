import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const mes = searchParams.get("mes"); // YYYY-MM, defaults to current month

    const now = new Date();
    const [year, month] = mes
      ? mes.split("-").map(Number)
      : [now.getFullYear(), now.getMonth() + 1];

    const fechaDesde = `${year}-${String(month).padStart(2, "0")}-01`;
    const fechaHasta = new Date(year, month, 0).toISOString().split("T")[0];

    const mesActualStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const esMesActual = `${year}-${String(month).padStart(2, "0")}` === mesActualStr;

    let mrr = 0;
    let totalClientes = 0;
    let ingresosPorPlan: Array<{ nombre: string; precio: number; cantidad: number }> = [];

    if (esMesActual) {
      // Mes actual: calcular en vivo
      const { data: clientes } = await supabaseAdmin
        .from("clientes")
        .select("id, plan:planes(id, nombre, precio)")
        .is("deleted_at", null)
        .eq("estado", true)
        .not("plan_id", "is", null);

      const lista = (clientes ?? []) as Array<{
        id: string;
        plan: { id: string; nombre: string; precio: string } | null;
      }>;

      mrr = lista.reduce((sum, c) => sum + (c.plan ? Number(c.plan.precio) : 0), 0);
      totalClientes = lista.length;

      const detalle: Record<string, { nombre: string; precio: number; cantidad: number }> = {};
      for (const c of lista) {
        if (!c.plan) continue;
        if (!detalle[c.plan.id]) detalle[c.plan.id] = { nombre: c.plan.nombre, precio: Number(c.plan.precio), cantidad: 0 };
        detalle[c.plan.id].cantidad += 1;
      }
      ingresosPorPlan = Object.values(detalle);
    } else {
      // Mes pasado: usar snapshot
      const { data: snapshot } = await supabaseAdmin
        .from("caja_mrr_snapshots")
        .select("mrr, total_clientes, detalle")
        .eq("mes", fechaDesde)
        .maybeSingle();

      if (snapshot) {
        mrr = Number(snapshot.mrr);
        totalClientes = snapshot.total_clientes;
        ingresosPorPlan = (snapshot.detalle as typeof ingresosPorPlan) ?? [];
      }
    }

    // Gastos del mes seleccionado
    const { data: gastos } = await supabaseAdmin
      .from("caja_gastos")
      .select("id, descripcion, monto, categoria, fecha")
      .is("deleted_at", null)
      .gte("fecha", fechaDesde)
      .lte("fecha", fechaHasta);

    const totalGastos = (gastos ?? []).reduce((sum: number, g: { monto: string | number }) => sum + Number(g.monto), 0);

    const gastosPorCategoria: Record<string, number> = {};
    for (const g of gastos ?? []) {
      gastosPorCategoria[g.categoria] = (gastosPorCategoria[g.categoria] ?? 0) + Number(g.monto);
    }

    // Últimos 6 meses para el gráfico de tendencia
    const tendencia: Array<{ mes: string; ingresos: number; gastos: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const label = d.toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
      const desde = `${y}-${String(m).padStart(2, "0")}-01`;
      const hasta = new Date(y, m, 0).toISOString().split("T")[0];
      const esCurrent = `${y}-${String(m).padStart(2, "0")}` === mesActualStr;

      const [gMes, snapMes] = await Promise.all([
        supabaseAdmin.from("caja_gastos").select("monto").is("deleted_at", null).gte("fecha", desde).lte("fecha", hasta),
        esCurrent ? Promise.resolve({ data: null }) : supabaseAdmin.from("caja_mrr_snapshots").select("mrr").eq("mes", desde).maybeSingle(),
      ]);

      const ingresosMes = esCurrent ? mrr : (snapMes.data ? Number((snapMes.data as { mrr: number }).mrr) : 0);

      tendencia.push({
        mes: label,
        ingresos: ingresosMes,
        gastos: ((gMes.data ?? []) as Array<{ monto: string }>).reduce((s, g) => s + Number(g.monto), 0),
      });
    }

    return NextResponse.json({
      mrr,
      totalGastos,
      balance: mrr - totalGastos,
      totalClientes,
      ingresosPorPlan,
      gastosPorCategoria,
      tendencia,
      periodo: { desde: fechaDesde, hasta: fechaHasta },
    });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
