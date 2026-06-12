import { supabaseAdmin } from "./supabase";

export async function tomarSnapshotMRR() {
  const { data: clientes } = await supabaseAdmin
    .from("clientes")
    .select("id, plan:planes(id, nombre, precio), mp_cuenta:mp_cuentas(id, nombre)")
    .is("deleted_at", null)
    .eq("estado", true)
    .eq("pago_unico", false)
    .not("plan_id", "is", null);

  const lista = (clientes ?? []) as Array<{
    id: string;
    plan: { id: string; nombre: string; precio: string } | null;
    mp_cuenta: { id: string; nombre: string } | null;
  }>;

  const mrr = lista.reduce((sum, c) => sum + (c.plan ? Number(c.plan.precio) : 0), 0);
  const totalClientes = lista.length;

  const detallePorPlan: Record<string, { nombre: string; precio: number; cantidad: number }> = {};
  for (const c of lista) {
    if (!c.plan) continue;
    if (!detallePorPlan[c.plan.id]) {
      detallePorPlan[c.plan.id] = { nombre: c.plan.nombre, precio: Number(c.plan.precio), cantidad: 0 };
    }
    detallePorPlan[c.plan.id].cantidad += 1;
  }

  // Desglose por cuenta de Mercado Pago; los clientes sin cuenta asignada van a un bucket aparte
  const detallePorCuenta: Record<string, { id: string | null; nombre: string; total: number; cantidad: number }> = {};
  for (const c of lista) {
    if (!c.plan) continue;
    const key = c.mp_cuenta?.id ?? "sin_cuenta";
    if (!detallePorCuenta[key]) {
      detallePorCuenta[key] = { id: c.mp_cuenta?.id ?? null, nombre: c.mp_cuenta?.nombre ?? "Sin cuenta MP", total: 0, cantidad: 0 };
    }
    detallePorCuenta[key].total += Number(c.plan.precio);
    detallePorCuenta[key].cantidad += 1;
  }

  const now = new Date();
  const mes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  await supabaseAdmin.from("caja_mrr_snapshots").upsert(
    {
      mes,
      mrr,
      total_clientes: totalClientes,
      detalle: Object.values(detallePorPlan),
      detalle_cuentas: Object.values(detallePorCuenta),
    },
    { onConflict: "mes" }
  );
}
