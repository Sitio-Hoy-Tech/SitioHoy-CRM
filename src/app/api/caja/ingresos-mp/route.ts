import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type CuentaIngreso = {
  id: string | null;
  nombre: string;
  mrr: number;
  cantidad: number;
  unicos: number;
  total: number;
};

// GET /api/caja/ingresos-mp?mes=YYYY-MM - Ingresos del mes desglosados por cuenta de Mercado Pago
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const mes = searchParams.get("mes"); // YYYY-MM, defaults to current month

    const now = new Date();
    const [year, month] = mes
      ? mes.split("-").map(Number)
      : [now.getFullYear(), now.getMonth() + 1];

    const mesActualStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const esMesActual = `${year}-${String(month).padStart(2, "0")}` === mesActualStr;

    const cuentas: Record<string, CuentaIngreso> = {};
    const getCuenta = (cuenta: { id: string; nombre: string } | null) => {
      const key = cuenta?.id ?? "sin_cuenta";
      if (!cuentas[key]) {
        cuentas[key] = { id: cuenta?.id ?? null, nombre: cuenta?.nombre ?? "Sin cuenta MP", mrr: 0, cantidad: 0, unicos: 0, total: 0 };
      }
      return cuentas[key];
    };

    // MRR por cuenta: en vivo para el mes actual, snapshot para meses pasados
    let mrrDisponible = true;
    if (esMesActual) {
      const { data: clientes } = await supabaseAdmin
        .from("clientes")
        .select("id, plan:planes(precio), mp_cuenta:mp_cuentas(id, nombre)")
        .is("deleted_at", null)
        .eq("estado", true)
        .eq("pago_unico", false)
        .not("plan_id", "is", null);

      for (const c of (clientes ?? []) as Array<{
        plan: { precio: string } | null;
        mp_cuenta: { id: string; nombre: string } | null;
      }>) {
        if (!c.plan) continue;
        const cuenta = getCuenta(c.mp_cuenta);
        cuenta.mrr += Number(c.plan.precio);
        cuenta.cantidad += 1;
      }
    } else {
      const fechaMes = `${year}-${String(month).padStart(2, "0")}-01`;
      const { data: snapshot } = await supabaseAdmin
        .from("caja_mrr_snapshots")
        .select("detalle_cuentas")
        .eq("mes", fechaMes)
        .maybeSingle();

      const detalle = snapshot?.detalle_cuentas as Array<{
        id: string | null;
        nombre: string;
        total: number;
        cantidad: number;
      }> | null;

      if (detalle) {
        for (const d of detalle) {
          const cuenta = getCuenta(d.id ? { id: d.id, nombre: d.nombre } : null);
          cuenta.mrr += Number(d.total);
          cuenta.cantidad += d.cantidad;
        }
      } else {
        // Snapshot anterior a la incorporación del desglose por cuenta
        mrrDisponible = false;
      }
    }

    // Pagos únicos del mes, atribuidos a la cuenta MP actual del cliente
    const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const unicosDesde = ymd(new Date(year, month - 1, 1));
    const unicosHasta = ymd(new Date(year, month, 1)); // exclusivo

    const { data: unicos } = await supabaseAdmin
      .from("clientes")
      .select("precio_pago_unico, plan:planes(precio), mp_cuenta:mp_cuentas(id, nombre)")
      .is("deleted_at", null)
      .eq("pago_unico", true)
      .gte("fecha_pago", unicosDesde)
      .lt("fecha_pago", unicosHasta);

    for (const c of (unicos ?? []) as Array<{
      precio_pago_unico: string | null;
      plan: { precio: string } | null;
      mp_cuenta: { id: string; nombre: string } | null;
    }>) {
      const monto = c.precio_pago_unico != null ? Number(c.precio_pago_unico) : c.plan ? Number(c.plan.precio) : 0;
      getCuenta(c.mp_cuenta).unicos += monto;
    }

    const lista = Object.values(cuentas)
      .map(c => ({ ...c, total: c.mrr + c.unicos }))
      .sort((a, b) => b.total - a.total);

    const totales = lista.reduce(
      (acc, c) => ({ mrr: acc.mrr + c.mrr, unicos: acc.unicos + c.unicos, total: acc.total + c.total }),
      { mrr: 0, unicos: 0, total: 0 }
    );

    return NextResponse.json({ cuentas: lista, totales, mrrDisponible });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
