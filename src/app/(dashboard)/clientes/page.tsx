"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import Modal from "@/components/common/Modal";
import Toast from "@/components/common/Toast";
import DatePicker from "@/components/common/DatePicker";
import FiltersBar from "@/components/common/FiltersBar";
import type { Cliente, Plan, EtiquetaNegocio } from "@/types";

export default function ClientesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [search, setSearch] = useState("");
  const [planId, setPlanId] = useState("");
  const [estado, setEstado] = useState("");
  const [etiquetaId, setEtiquetaId] = useState("");
  const [vencimientoDias, setVencimientoDias] = useState("");

  const [planes, setPlanes] = useState<Plan[]>([]);
  const [etiquetas, setEtiquetas] = useState<EtiquetaNegocio[]>([]);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (search) params.set("search", search);
    if (planId) params.set("plan_id", planId);
    if (estado) params.set("estado", estado);
    if (etiquetaId) params.set("etiqueta_negocio_id", etiquetaId);
    if (vencimientoDias) params.set("vencimiento_dias", vencimientoDias);

    const res = await fetch(`/api/clientes?${params}`);
    const json = await res.json();
    setClientes(json.data || []);
    setCount(json.count || 0);
    setLoading(false);
  }, [page, search, planId, estado, etiquetaId, vencimientoDias]);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  useEffect(() => {
    fetch("/api/catalogos/planes").then(r => r.json()).then(j => setPlanes(j.data || []));
    fetch("/api/catalogos/etiquetas-negocio").then(r => r.json()).then(j => setEtiquetas(j.data || []));
  }, []);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const res = await fetch(`/api/clientes/${deleteId}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteId(null);
    if (res.ok) {
      setToast({ message: "Cliente archivado", type: "success" });
      fetchClientes();
    } else {
      setToast({ message: "Error al archivar", type: "error" });
    }
  }

  function diasParaVencer(fechaVencimiento: string) {
    const hoy = new Date();
    const vence = new Date(fechaVencimiento);
    return Math.ceil((vence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  }

  const totalPages = Math.ceil(count / limit);
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, count);
  const hasActiveFilters = !!(search || planId || estado || etiquetaId || vencimientoDias);

  const clearFilters = () => {
    setSearch(""); setPlanId(""); setEstado("");
    setEtiquetaId(""); setVencimientoDias(""); setPage(1);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-heading">Clientes</h1>
          <Link
            href="/clientes/archivados"
            className="text-xs text-muted hover:text-heading border border-edge hover:border-edge/60 px-2.5 py-1 rounded-full transition-colors"
          >
            Archivados
          </Link>
        </div>
        <Link href="/clientes/nuevo">
          <Button>+ Nuevo cliente</Button>
        </Link>
      </div>

      <FiltersBar onClear={clearFilters} showClear={hasActiveFilters}>
        <div className="relative group">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            placeholder="Buscar empresa o contacto..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className={`w-48 bg-input border rounded-lg pl-9 pr-3.5 py-2 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all ${
              search ? "border-accent/50 ring-1 ring-accent/20" : "border-edge"
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            options={planes.map(p => ({ value: p.id, label: p.nombre }))}
            placeholder="Plan"
            value={planId}
            onChange={(e) => { setPlanId(e.target.value); setPage(1); }}
            className={`!py-2 !h-auto min-w-[140px] ${planId ? "border-accent/50 ring-1 ring-accent/20" : ""}`}
          />
          <Select
            options={[
              { value: "activo", label: "Activo" },
              { value: "inactivo", label: "Inactivo" },
            ]}
            placeholder="Estado"
            value={estado}
            onChange={(e) => { setEstado(e.target.value); setPage(1); }}
            className={`!py-2 !h-auto min-w-[140px] ${estado ? "border-accent/50 ring-1 ring-accent/20" : ""}`}
          />
          <Select
            options={etiquetas.map(e => ({ value: e.id, label: e.nombre }))}
            placeholder="Etiqueta"
            value={etiquetaId}
            onChange={(e) => { setEtiquetaId(e.target.value); setPage(1); }}
            className={`!py-2 !h-auto min-w-[140px] ${etiquetaId ? "border-accent/50 ring-1 ring-accent/20" : ""}`}
          />
          <DatePicker
            placeholder="Vencimiento"
            value={vencimientoDias}
            onChange={(val) => { setVencimientoDias(val); setPage(1); }}
            className={`!py-2 !h-auto w-36 ${vencimientoDias ? "border-accent/50 ring-1 ring-accent/20" : ""}`}
          />
        </div>
      </FiltersBar>

      <div className="bg-card rounded-xl border border-edge overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge">
                <th className="text-left px-4 py-3 font-medium text-muted">Empresa</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Contacto</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Dominio</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Etiqueta</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Vencimiento</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-muted">Cargando...</td></tr>
              ) : clientes.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-muted">No hay clientes</td></tr>
              ) : (
                clientes.map((c) => {
                  const dias = c.fecha_vencimiento ? diasParaVencer(c.fecha_vencimiento) : null;
                  return (
                    <tr key={c.id} className="border-b border-edge hover:bg-elevated transition-colors">
                      <td className="px-4 py-3 font-medium text-heading">{c.nombre_empresa}</td>
                      <td className="px-4 py-3 text-body">
                        {c.contacto ? `${c.contacto.nombre} ${c.contacto.apellido || ""}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-body">{c.dominio}</td>
                      <td className="px-4 py-3 text-body">{c.plan?.nombre || "-"}</td>
                      <td className="px-4 py-3 text-body">{c.etiqueta_negocio?.nombre || "-"}</td>
                      <td className="px-4 py-3">
                        {c.pago_unico ? (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/15 text-purple-400 border border-purple-500/20">
                            Pago único
                          </span>
                        ) : c.fecha_vencimiento ? (
                          <span className={`text-sm ${dias !== null && dias <= 0 ? "text-red-400" : "text-body"}`}>
                            {new Date(c.fecha_vencimiento).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          c.estado
                            ? "bg-accent-soft text-accent border border-accent-border"
                            : dias !== null && dias <= 0
                            ? "bg-red-500/15 text-red-400 border border-red-500/20"
                            : "bg-elevated text-muted border border-edge"
                        }`}>
                          {c.estado ? "Activo" : dias !== null && dias <= 0 ? "Vencido" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => router.push(`/clientes/${c.id}`)}
                            className="p-1.5 rounded-md text-muted hover:text-heading hover:bg-elevated transition-colors"
                            title="Ver detalle"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteId(c.id)}
                            className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger-soft transition-colors"
                            title="Archivar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776M12 12.75l-3 3m3-3 3 3m-3-3v7.5" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {count > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-edge">
            <p className="text-sm text-muted">
              Mostrando {from}–{to} de {count} clientes
            </p>
            {totalPages > 1 && (
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
            )}
          </div>
        )}
      </div>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Archivar cliente">
        <p className="text-sm text-body mb-4">
          El cliente quedará archivado y no aparecerá en la lista activa. Podés restaurarlo desde{" "}
          <Link href="/clientes/archivados" className="text-accent hover:underline">Clientes archivados</Link>.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>Archivar</Button>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
