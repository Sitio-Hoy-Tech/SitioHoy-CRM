"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import Input from "@/components/common/Input";
import Toast from "@/components/common/Toast";
import SearchableSelect from "@/components/common/SearchableSelect";
import DatePicker from "@/components/common/DatePicker";
import MonthPicker from "@/components/common/MonthPicker";

const CATEGORIAS = [
  { value: "infraestructura", label: "Infraestructura" },
  { value: "herramientas", label: "Herramientas / SaaS" },
  { value: "marketing", label: "Marketing" },
  { value: "sueldos", label: "Sueldos / Contratistas" },
  { value: "impuestos", label: "Impuestos / Tasas" },
  { value: "servicios", label: "Servicios" },
  { value: "otros", label: "Otros" },
];

const CATEGORIA_COLORS: Record<string, string> = {
  infraestructura: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  herramientas:    "bg-purple-500/15 text-purple-400 border-purple-500/20",
  marketing:       "bg-pink-500/15 text-pink-400 border-pink-500/20",
  sueldos:         "bg-orange-500/15 text-orange-400 border-orange-500/20",
  impuestos:       "bg-red-500/15 text-red-400 border-red-500/20",
  servicios:       "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  otros:           "bg-elevated text-muted border-edge",
};

type Gasto = {
  id: string;
  descripcion: string;
  monto: number;
  categoria: string;
  fecha: string;
  notas: string | null;
};

type Resumen = {
  mrr: number;
  ingresosUnicos: number;
  ingresos: number;
  pagosUnicos: Array<{ empresa: string; plan: string; monto: number; fecha: string }>;
  totalGastos: number;
  balance: number;
  totalClientes: number;
  ingresosPorPlan: Array<{ nombre: string; precio: number; cantidad: number }>;
  gastosPorCategoria: Record<string, number>;
  tendencia: Array<{ mes: string; ingresos: number; gastos: number }>;
};

type HistoricoMes = { mes: string; mrr: number; unicos: number; ingresos: number; gastos: number; balance: number };
type Historico = {
  historico: HistoricoMes[];
  totales: { mrr: number; unicos: number; ingresos: number; gastos: number; balance: number };
};

const EMPTY_FORM = { descripcion: "", monto: "", categoria: "otros", fecha: "", notas: "" };

function getMesActual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatARS(n: number) {
  return n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function CajaPage() {
  const [mes, setMes] = useState(getMesActual);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingGasto, setEditingGasto] = useState<Gasto | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Gasto | null>(null);

  const [historico, setHistorico] = useState<Historico | null>(null);

  const fetchData = useCallback(async (mesActual: string) => {
    setLoading(true);
    const t = Date.now();
    const [resRes, gastosRes, histRes] = await Promise.all([
      fetch(`/api/caja/resumen?mes=${mesActual}&_t=${t}`, { cache: "no-store" }).then(r => r.json()),
      fetch(`/api/caja/gastos?mes=${mesActual}&limit=100&_t=${t}`, { cache: "no-store" }).then(r => r.json()),
      fetch(`/api/caja/historico?_t=${t}`, { cache: "no-store" }).then(r => r.json()),
    ]);
    setResumen(resRes);
    setGastos(gastosRes.data || []);
    setHistorico(histRes.historico ? histRes : null);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(mes); }, [mes, fetchData]);

  function openCreate() {
    setEditingGasto(null);
    const today = new Date().toISOString().split("T")[0];
    setForm({ ...EMPTY_FORM, fecha: today });
    setShowForm(true);
  }

  function openEdit(g: Gasto) {
    setEditingGasto(g);
    setForm({
      descripcion: g.descripcion,
      monto: String(g.monto),
      categoria: g.categoria,
      fecha: g.fecha,
      notas: g.notas || "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = { ...form, monto: Number(form.monto) };
    const url = editingGasto ? `/api/caja/gastos/${editingGasto.id}` : "/api/caja/gastos";
    const method = editingGasto ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setToast({ message: json.error || "Error al guardar", type: "error" }); return; }
    setShowForm(false);
    setToast({ message: editingGasto ? "Gasto actualizado" : "Gasto registrado", type: "success" });
    fetchData(mes);
  }

  async function handleDelete(g: Gasto) {
    setDeletingId(g.id);
    const res = await fetch(`/api/caja/gastos/${g.id}`, { method: "DELETE" });
    setDeletingId(null);
    setConfirmDelete(null);
    if (res.ok) { setToast({ message: "Gasto eliminado", type: "success" }); fetchData(mes); }
    else { setToast({ message: "Error al eliminar", type: "error" }); }
  }

  const mesLabel = new Date(`${mes}-15`).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const maxTendencia = resumen ? Math.max(...resumen.tendencia.map(t => Math.max(t.ingresos, t.gastos)), 1) : 1;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-heading capitalize">Caja</h1>
          <p className="text-sm text-muted mt-0.5 capitalize">{mesLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <MonthPicker value={mes} onChange={setMes} />
          <Button onClick={openCreate}>+ Registrar gasto</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-muted text-center py-20">Cargando...</div>
      ) : resumen && (
        <>
          {/* Cards resumen */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-card rounded-xl border border-edge p-5">
              <p className="text-xs text-muted uppercase tracking-wider mb-1">Ingresos del mes</p>
              <p className="text-2xl font-bold text-accent">${formatARS(resumen.ingresos)}</p>
              <p className="text-xs text-muted mt-1">
                MRR ${formatARS(resumen.mrr)} ({resumen.totalClientes} {resumen.totalClientes === 1 ? "cliente" : "clientes"})
                {resumen.ingresosUnicos > 0 && ` + $${formatARS(resumen.ingresosUnicos)} en pagos únicos`}
              </p>
            </div>
            <div className="bg-card rounded-xl border border-edge p-5">
              <p className="text-xs text-muted uppercase tracking-wider mb-1">Gastos del mes</p>
              <p className="text-2xl font-bold text-red-400">${formatARS(resumen.totalGastos)}</p>
              <p className="text-xs text-muted mt-1">{gastos.length} registros</p>
            </div>
            <div className={`rounded-xl border p-5 ${resumen.balance >= 0 ? "bg-accent-soft border-accent-border" : "bg-red-500/10 border-red-500/20"}`}>
              <p className="text-xs text-muted uppercase tracking-wider mb-1">Balance neto</p>
              <p className={`text-2xl font-bold ${resumen.balance >= 0 ? "text-accent" : "text-red-400"}`}>
                {resumen.balance >= 0 ? "+" : ""}${formatARS(resumen.balance)}
              </p>
              <p className="text-xs text-muted mt-1">
                {resumen.ingresos > 0 ? `${Math.round((resumen.balance / resumen.ingresos) * 100)}% de margen` : "—"}
              </p>
            </div>
            <div className="bg-card rounded-xl border border-edge p-5">
              <p className="text-xs text-muted uppercase tracking-wider mb-1">Ticket promedio</p>
              <p className="text-2xl font-bold text-heading">
                ${resumen.totalClientes > 0 ? formatARS(resumen.mrr / resumen.totalClientes) : "0"}
              </p>
              <p className="text-xs text-muted mt-1">por cliente / mes</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* LEFT: tendencia + breakdown ingresos */}
            <div className="col-span-2 space-y-6">

              {/* Gráfico de barras — tendencia 6 meses */}
              <div className="bg-card rounded-xl border border-edge p-6">
                <h2 className="text-sm font-semibold text-heading mb-5">Tendencia últimos 6 meses</h2>
                <div className="flex items-end gap-3 h-40">
                  {resumen.tendencia.map((t) => (
                    <div key={t.mes} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex items-end gap-1 h-32">
                        <div
                          className="flex-1 bg-accent/20 rounded-t-sm transition-all duration-500"
                          style={{ height: `${(t.ingresos / maxTendencia) * 100}%`, minHeight: t.ingresos > 0 ? "4px" : "0" }}
                          title={`Ingresos: $${formatARS(t.ingresos)}`}
                        />
                        <div
                          className="flex-1 bg-red-400/30 rounded-t-sm transition-all duration-500"
                          style={{ height: `${(t.gastos / maxTendencia) * 100}%`, minHeight: t.gastos > 0 ? "4px" : "0" }}
                          title={`Gastos: $${formatARS(t.gastos)}`}
                        />
                      </div>
                      <span className="text-[10px] text-muted capitalize">{t.mes}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="w-3 h-3 rounded-sm bg-accent/30 inline-block" /> Ingresos
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="w-3 h-3 rounded-sm bg-red-400/30 inline-block" /> Gastos
                  </span>
                </div>
              </div>

              {/* Desglose por plan */}
              <div className="bg-card rounded-xl border border-edge p-6">
                <h2 className="text-sm font-semibold text-heading mb-4">Ingresos por plan</h2>
                {resumen.ingresosPorPlan.length === 0 ? (
                  <p className="text-sm text-muted">Sin clientes activos</p>
                ) : (
                  <div className="space-y-3">
                    {resumen.ingresosPorPlan.sort((a, b) => b.precio * b.cantidad - a.precio * a.cantidad).map(p => {
                      const total = p.precio * p.cantidad;
                      const pct = resumen.mrr > 0 ? (total / resumen.mrr) * 100 : 0;
                      return (
                        <div key={p.nombre}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-body font-medium">{p.nombre}</span>
                            <span className="text-muted text-xs">{p.cantidad} clientes × ${formatARS(p.precio)} = <span className="text-heading font-semibold">${formatARS(total)}</span></span>
                          </div>
                          <div className="w-full bg-elevated rounded-full h-1.5 overflow-hidden">
                            <div className="bg-accent h-full rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {resumen.pagosUnicos.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-edge">
                    <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Pagos únicos del mes</h3>
                    <div className="space-y-2">
                      {resumen.pagosUnicos.map((p, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-body font-medium">
                            {p.empresa} <span className="text-muted text-xs font-normal">({p.plan} · {new Date(p.fecha).toLocaleDateString("es-AR", { timeZone: "UTC" })})</span>
                          </span>
                          <span className="text-heading font-semibold">${formatARS(p.monto)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: gastos por categoría + lista */}
            <div className="space-y-6">
              {/* Gastos por categoría */}
              {Object.keys(resumen.gastosPorCategoria).length > 0 && (
                <div className="bg-card rounded-xl border border-edge p-5">
                  <h2 className="text-sm font-semibold text-heading mb-4">Gastos por categoría</h2>
                  <div className="space-y-2.5">
                    {Object.entries(resumen.gastosPorCategoria)
                      .sort(([, a], [, b]) => b - a)
                      .map(([cat, total]) => {
                        const info = CATEGORIAS.find(c => c.value === cat);
                        const pct = resumen.totalGastos > 0 ? (total / resumen.totalGastos) * 100 : 0;
                        return (
                          <div key={cat}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-body">{info?.label ?? cat}</span>
                              <span className="text-heading font-medium">${formatARS(total)}</span>
                            </div>
                            <div className="w-full bg-elevated rounded-full h-1 overflow-hidden">
                              <div className="bg-red-400/60 h-full rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Lista gastos */}
              <div className="bg-card rounded-xl border border-edge">
                <div className="flex items-center justify-between px-5 py-4 border-b border-edge">
                  <h2 className="text-sm font-semibold text-heading">Gastos registrados</h2>
                  <button onClick={openCreate} className="text-xs text-accent hover:underline">+ Agregar</button>
                </div>
                {gastos.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted">Sin gastos este mes</div>
                ) : (
                  <ul className="divide-y divide-edge">
                    {gastos.map(g => {
                      const catLabel = CATEGORIAS.find(c => c.value === g.categoria)?.label ?? g.categoria;
                      const catColor = CATEGORIA_COLORS[g.categoria] ?? CATEGORIA_COLORS.otros;
                      return (
                        <li key={g.id} className="px-5 py-3.5 hover:bg-elevated transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-heading truncate">{g.descripcion}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${catColor}`}>
                                  {catLabel}
                                </span>
                                <span className="text-xs text-muted">
                                  {new Date(`${g.fecha}T12:00:00`).toLocaleDateString("es-AR")}
                                </span>
                              </div>
                              {g.notas && <p className="text-xs text-muted mt-1 line-clamp-1">{g.notas}</p>}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-sm font-semibold text-red-400">${formatARS(g.monto)}</span>
                              <button
                                onClick={() => openEdit(g)}
                                className="text-muted hover:text-accent transition-colors"
                                title="Editar"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setConfirmDelete(g)}
                                className="text-muted hover:text-red-400 transition-colors"
                                title="Eliminar"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Histórico de ingresos */}
          {historico && historico.historico.length > 0 && (
            <div className="bg-card rounded-xl border border-edge mt-6">
              <div className="flex items-center justify-between px-6 py-4 border-b border-edge">
                <h2 className="text-sm font-semibold text-heading">Histórico</h2>
                {historico.historico.length > 2 && (
                  <Link href="/caja/historico" className="text-xs text-accent hover:underline">
                    Ver historial completo ({historico.historico.length} meses) →
                  </Link>
                )}
              </div>
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
                    {historico.historico.slice(0, 2).map(h => (
                      <tr
                        key={h.mes}
                        className={`border-t border-edge hover:bg-elevated transition-colors ${h.mes === mes ? "bg-elevated/50" : ""}`}
                      >
                        <td className="px-6 py-3 text-body capitalize">
                          <button onClick={() => setMes(h.mes)} className="hover:text-accent transition-colors capitalize">
                            {new Date(`${h.mes}-15`).toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
                          </button>
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
                      <td className="px-4 py-3 text-right font-semibold text-heading">${formatARS(historico.totales.mrr)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-heading">${formatARS(historico.totales.unicos)}</td>
                      <td className="px-4 py-3 text-right font-bold text-accent">${formatARS(historico.totales.ingresos)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-red-400">${formatARS(historico.totales.gastos)}</td>
                      <td className={`px-6 py-3 text-right font-bold ${historico.totales.balance >= 0 ? "text-heading" : "text-red-400"}`}>
                        {historico.totales.balance >= 0 ? "" : "-"}${formatARS(Math.abs(historico.totales.balance))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal crear/editar gasto */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingGasto ? "Editar gasto" : "Registrar gasto"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Descripción"
            required
            value={form.descripcion}
            onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
            placeholder="Ej: Hostinger anual, Resend Pro..."
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Monto ($)"
              type="number"
              required
              min="0.01"
              step="0.01"
              value={form.monto}
              onChange={e => setForm(p => ({ ...p, monto: e.target.value }))}
              placeholder="0.00"
            />
            <DatePicker
              label="Fecha"
              required
              value={form.fecha}
              onChange={val => setForm(p => ({ ...p, fecha: val }))}
            />
          </div>
          <SearchableSelect
            label="Categoría"
            options={CATEGORIAS}
            value={form.categoria}
            onChange={val => setForm(p => ({ ...p, categoria: val }))}
            placeholder="Seleccionar categoría"
          />
          <div>
            <label className="block text-sm font-medium text-body mb-1.5">Notas <span className="text-muted font-normal">(opcional)</span></label>
            <textarea
              value={form.notas}
              onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
              rows={2}
              placeholder="Detalles adicionales..."
              className="w-full bg-input border border-edge rounded-lg px-3 py-2 text-sm text-heading placeholder:text-muted focus:outline-none focus:border-accent transition-colors resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>{editingGasto ? "Guardar cambios" : "Registrar"}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal confirmar borrado */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Eliminar gasto">
        <p className="text-sm text-body mb-4">
          ¿Eliminar <span className="font-semibold text-heading">{confirmDelete?.descripcion}</span> por <span className="font-semibold text-red-400">${formatARS(confirmDelete?.monto ?? 0)}</span>?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button variant="danger" loading={deletingId === confirmDelete?.id} onClick={() => confirmDelete && handleDelete(confirmDelete)}>
            Eliminar
          </Button>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
