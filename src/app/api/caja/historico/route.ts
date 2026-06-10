import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/caja/historico - Ingresos y gastos de todos los meses con datos
export async function GET() {
  try {
    const now = new Date();
    const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [snapshotsRes, unicosRes, gastosRes, clientesRes] = await Promise.all([
      supabaseAdmin.from("caja_mrr_snapshots").select("mes, mrr"),
      supabaseAdmin
        .from("clientes")
        .select("fecha_pago, precio_pago_unico, plan:planes(precio)")
        .is("deleted_at", null)
        .eq("pago_unico", true),
      supabaseAdmin.from("caja_gastos").select("fecha, monto").is("deleted_at", null),
      supabaseAdmin
        .from("clientes")
        .select("id, plan:planes(precio)")
        .is("deleted_at", null)
        .eq("estado", true)
        .eq("pago_unico", false)
        .not("plan_id", "is", null),
    ]);

    // MRR por mes: snapshots para meses pasados, cálculo en vivo para el actual
    const mrrPorMes: Record<string, number> = {};
    for (const s of (snapshotsRes.data ?? []) as Array<{ mes: string; mrr: string }>) {
      mrrPorMes[String(s.mes).slice(0, 7)] = Number(s.mrr);
    }
    mrrPorMes[mesActual] = ((clientesRes.data ?? []) as Array<{ plan: { precio: string } | null }>)
      .reduce((sum, c) => sum + (c.plan ? Number(c.plan.precio) : 0), 0);

    // Pagos únicos por mes (según fecha_pago, precio personalizado con plan como fallback)
    const unicosPorMes: Record<string, number> = {};
    for (const c of (unicosRes.data ?? []) as Array<{
      fecha_pago: string;
      precio_pago_unico: string | null;
      plan: { precio: string } | null;
    }>) {
      const key = String(c.fecha_pago).slice(0, 7);
      const monto = c.precio_pago_unico != null ? Number(c.precio_pago_unico) : c.plan ? Number(c.plan.precio) : 0;
      unicosPorMes[key] = (unicosPorMes[key] ?? 0) + monto;
    }

    // Gastos por mes
    const gastosPorMes: Record<string, number> = {};
    for (const g of (gastosRes.data ?? []) as Array<{ fecha: string; monto: string }>) {
      const key = String(g.fecha).slice(0, 7);
      gastosPorMes[key] = (gastosPorMes[key] ?? 0) + Number(g.monto);
    }

    const meses = [...new Set([
      ...Object.keys(mrrPorMes),
      ...Object.keys(unicosPorMes),
      ...Object.keys(gastosPorMes),
    ])]
      .filter(k => k <= mesActual)
      .sort()
      .reverse();

    const historico = meses.map(mes => {
      const mrr = mrrPorMes[mes] ?? 0;
      const unicos = unicosPorMes[mes] ?? 0;
      const gastos = gastosPorMes[mes] ?? 0;
      return { mes, mrr, unicos, ingresos: mrr + unicos, gastos, balance: mrr + unicos - gastos };
    });

    const totales = historico.reduce(
      (acc, m) => ({
        mrr: acc.mrr + m.mrr,
        unicos: acc.unicos + m.unicos,
        ingresos: acc.ingresos + m.ingresos,
        gastos: acc.gastos + m.gastos,
        balance: acc.balance + m.balance,
      }),
      { mrr: 0, unicos: 0, ingresos: 0, gastos: 0, balance: 0 }
    );

    return NextResponse.json({ historico, totales });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
