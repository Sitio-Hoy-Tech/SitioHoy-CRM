"use client";

import { useEffect, useState } from "react";

type CuentaIngreso = {
  id: string | null;
  nombre: string;
  mrr: number;
  cantidad: number;
  unicos: number;
  total: number;
};

type IngresosMp = {
  cuentas: CuentaIngreso[];
  totales: { mrr: number; unicos: number; total: number };
  mrrDisponible: boolean;
};

function formatARS(n: number) {
  return n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function IngresosPorCuentaMp({ mes }: { mes: string }) {
  const [result, setResult] = useState<{ mes: string; data: IngresosMp | null } | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/caja/ingresos-mp?mes=${mes}&_t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.json())
      .then(json => {
        if (!cancelado) setResult({ mes, data: json.cuentas ? json : null });
      })
      .catch(() => {
        if (!cancelado) setResult({ mes, data: null });
      });
    return () => { cancelado = true; };
  }, [mes]);

  const loading = result?.mes !== mes;
  const data = loading ? null : result!.data;

  return (
    <div className="bg-card rounded-xl border border-edge p-6">
      <h2 className="text-sm font-semibold text-heading mb-4">Ingresos por cuenta MP</h2>
      {loading ? (
        <p className="text-sm text-muted">Cargando...</p>
      ) : !data || data.cuentas.length === 0 ? (
        <p className="text-sm text-muted">Sin ingresos este mes</p>
      ) : (
        <>
          {!data.mrrDisponible && (
            <p className="text-xs text-muted mb-3">
              Sin desglose de MRR por cuenta para este mes (anterior a la incorporación del seguimiento por cuenta).
            </p>
          )}
          <div className="space-y-3">
            {data.cuentas.map(c => {
              const pct = data.totales.total > 0 ? (c.total / data.totales.total) * 100 : 0;
              return (
                <div key={c.id ?? "sin_cuenta"}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className={`font-medium ${c.id ? "text-body" : "text-muted"}`}>{c.nombre}</span>
                    <span className="text-muted text-xs">
                      {c.cantidad > 0 && `${c.cantidad} ${c.cantidad === 1 ? "cliente" : "clientes"} · MRR $${formatARS(c.mrr)}`}
                      {c.unicos > 0 && `${c.cantidad > 0 ? " + " : ""}$${formatARS(c.unicos)} únicos`}
                      {" = "}
                      <span className="text-heading font-semibold">${formatARS(c.total)}</span>
                    </span>
                  </div>
                  <div className="w-full bg-elevated rounded-full h-1.5 overflow-hidden">
                    <div className="bg-accent h-full rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-edge text-sm">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Total</span>
            <span className="text-heading font-bold">${formatARS(data.totales.total)}</span>
          </div>
        </>
      )}
    </div>
  );
}
