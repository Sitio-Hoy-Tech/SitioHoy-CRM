"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type HistoricoMes = { mes: string; mrr: number; unicos: number; ingresos: number; gastos: number; balance: number };
type Historico = {
  historico: HistoricoMes[];
  totales: { mrr: number; unicos: number; ingresos: number; gastos: number; balance: number };
};

function formatARS(n: number) {
  return n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function CajaHistoricoPage() {
  const router = useRouter();
  const [data, setData] = useState<Historico | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    fetch(`/api/caja/historico?_t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.json())
      .then(json => setData(json.historico ? json : null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <button type="button" onClick={() => router.push("/caja")}
          className="text-sm text-muted hover:text-heading mb-2 inline-block transition-colors">
          &larr; Volver a caja
        </button>
        <h1 className="text-2xl font-bold text-heading">Histórico de Caja</h1>
        <p className="text-sm text-muted mt-0.5">Ingresos y gastos de todos los meses</p>
      </div>

      {loading ? (
        <div className="text-muted text-center py-20">Cargando...</div>
      ) : !data || data.historico.length === 0 ? (
        <div className="text-muted text-center py-20">Sin datos históricos</div>
      ) : (() => {
        const count = data.historico.length;
        const totalPages = Math.ceil(count / limit);
        const from = (page - 1) * limit + 1;
        const to = Math.min(page * limit, count);
        const visibles = data.historico.slice((page - 1) * limit, page * limit);
        return (
        <>
          {/* Cards de totales acumulados */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-card rounded-xl border border-edge p-5">
              <p className="text-xs text-muted uppercase tracking-wider mb-1">Ingresos totales</p>
              <p className="text-2xl font-bold text-accent">${formatARS(data.totales.ingresos)}</p>
              <p className="text-xs text-muted mt-1">
                MRR ${formatARS(data.totales.mrr)} + ${formatARS(data.totales.unicos)} en pagos únicos
              </p>
            </div>
            <div className="bg-card rounded-xl border border-edge p-5">
              <p className="text-xs text-muted uppercase tracking-wider mb-1">Gastos totales</p>
              <p className="text-2xl font-bold text-red-400">${formatARS(data.totales.gastos)}</p>
              <p className="text-xs text-muted mt-1">{data.historico.length} meses</p>
            </div>
            <div className={`rounded-xl border p-5 ${data.totales.balance >= 0 ? "bg-accent-soft border-accent-border" : "bg-red-500/10 border-red-500/20"}`}>
              <p className="text-xs text-muted uppercase tracking-wider mb-1">Balance acumulado</p>
              <p className={`text-2xl font-bold ${data.totales.balance >= 0 ? "text-accent" : "text-red-400"}`}>
                {data.totales.balance >= 0 ? "+" : "-"}${formatARS(Math.abs(data.totales.balance))}
              </p>
              <p className="text-xs text-muted mt-1">
                {data.totales.ingresos > 0 ? `${Math.round((data.totales.balance / data.totales.ingresos) * 100)}% de margen` : "—"}
              </p>
            </div>
            <div className="bg-card rounded-xl border border-edge p-5">
              <p className="text-xs text-muted uppercase tracking-wider mb-1">Promedio mensual</p>
              <p className="text-2xl font-bold text-heading">${formatARS(data.totales.ingresos / data.historico.length)}</p>
              <p className="text-xs text-muted mt-1">de ingresos</p>
            </div>
          </div>

          {/* Tabla completa */}
          <div className="bg-card rounded-xl border border-edge">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted uppercase tracking-wider">
                    <th className="px-6 py-3 font-medium">Mes</th>
                    <th className="px-4 py-3 font-medium text-right">MRR</th>
                    <th className="px-4 py-3 font-medium text-right">Pagos únicos</th>
                    <th className="px-4 py-3 font-medium text-right">Ingresos</th>
                    <th className="px-4 py-3 font-medium text-right">Gastos</th>
                    <th className="px-6 py-3 font-medium text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map(h => (
                    <tr key={h.mes} className="border-t border-edge hover:bg-elevated transition-colors">
                      <td className="px-6 py-3 text-body font-medium capitalize">
                        {new Date(`${h.mes}-15`).toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-right text-body">${formatARS(h.mrr)}</td>
                      <td className="px-4 py-3 text-right text-body">
                        {h.unicos > 0 ? `$${formatARS(h.unicos)}` : <span className="text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-accent">${formatARS(h.ingresos)}</td>
                      <td className="px-4 py-3 text-right text-red-400">
                        {h.gastos > 0 ? `$${formatARS(h.gastos)}` : <span className="text-muted">—</span>}
                      </td>
                      <td className={`px-6 py-3 text-right font-semibold ${h.balance >= 0 ? "text-heading" : "text-red-400"}`}>
                        {h.balance >= 0 ? "" : "-"}${formatARS(Math.abs(h.balance))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-edge bg-elevated/50">
                    <td className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Total acumulado</td>
                    <td className="px-4 py-3 text-right font-semibold text-heading">${formatARS(data.totales.mrr)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-heading">${formatARS(data.totales.unicos)}</td>
                    <td className="px-4 py-3 text-right font-bold text-accent">${formatARS(data.totales.ingresos)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-400">${formatARS(data.totales.gastos)}</td>
                    <td className={`px-6 py-3 text-right font-bold ${data.totales.balance >= 0 ? "text-heading" : "text-red-400"}`}>
                      {data.totales.balance >= 0 ? "" : "-"}${formatARS(Math.abs(data.totales.balance))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-edge">
                <p className="text-sm text-muted">
                  Mostrando {from}–{to} de {count} meses
                </p>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-2 py-1 text-sm text-muted hover:text-heading disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    &lt;
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        page === p ? "bg-accent text-white" : "text-muted hover:bg-elevated"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="px-2 py-1 text-sm text-muted hover:text-heading disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
        );
      })()}
    </div>
  );
}
