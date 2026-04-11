"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Modal from "@/components/common/Modal";
import Toast from "@/components/common/Toast";
import DatePicker from "@/components/common/DatePicker";
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
      setToast({ message: "Cliente eliminado", type: "success" });
      fetchClientes();
    } else {
      setToast({ message: "Error al eliminar", type: "error" });
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

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[--text-primary]">Clientes</h1>
        <Link href="/clientes/nuevo">
          <Button>+ Nuevo cliente</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-48 bg-[--bg-input] border border-[--border-primary] rounded-lg pl-9 pr-3.5 py-2 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:outline-none focus:ring-2 focus:ring-[--accent]/30 focus:border-[--accent] transition-all"
          />
        </div>
        <Select
          options={planes.map(p => ({ value: p.id, label: p.nombre }))}
          placeholder="Plan"
          value={planId}
          onChange={(e) => { setPlanId(e.target.value); setPage(1); }}
        />
        <Select
          options={[
            { value: "activo", label: "Activo" },
            { value: "inactivo", label: "Inactivo" },
          ]}
          placeholder="Estado"
          value={estado}
          onChange={(e) => { setEstado(e.target.value); setPage(1); }}
        />
        <Select
          options={etiquetas.map(e => ({ value: e.id, label: e.nombre }))}
          placeholder="Etiqueta"
          value={etiquetaId}
          onChange={(e) => { setEtiquetaId(e.target.value); setPage(1); }}
        />
        <DatePicker
          placeholder="Vencimiento"
          value={vencimientoDias}
          onChange={(val) => { setVencimientoDias(val); setPage(1); }}
        />
      </div>

      <div className="bg-[--bg-card] rounded-xl border border-[--border-primary] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[--border-primary]">
                <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Empresa</th>
                <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Contacto</th>
                <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Dominio</th>
                <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Etiqueta</th>
                <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Vencimiento</th>
                <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-[--text-muted]">Cargando...</td>
                </tr>
              ) : clientes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-[--text-muted]">No hay clientes</td>
                </tr>
              ) : (
                clientes.map((c) => {
                  const dias = c.fecha_vencimiento ? diasParaVencer(c.fecha_vencimiento) : null;
                  return (
                    <tr key={c.id} className="border-b border-[--border-primary] hover:bg-[--bg-elevated] transition-colors">
                      <td className="px-4 py-3 font-medium text-[--text-primary]">{c.nombre_empresa}</td>
                      <td className="px-4 py-3 text-[--text-secondary]">
                        {c.contacto ? `${c.contacto.nombre} ${c.contacto.apellido || ""}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-[--text-secondary]">{c.dominio}</td>
                      <td className="px-4 py-3 text-[--text-secondary]">{c.plan?.nombre || "-"}</td>
                      <td className="px-4 py-3 text-[--text-secondary]">{c.etiqueta_negocio?.nombre || "-"}</td>
                      <td className="px-4 py-3">
                        {c.fecha_vencimiento && (
                          <span className={`text-sm ${
                            dias !== null && dias <= 0 ? "text-red-400" : "text-[--text-secondary]"
                          }`}>
                            {new Date(c.fecha_vencimiento).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          c.estado
                            ? "bg-[--accent-soft] text-[--accent] border border-[--accent-border]"
                            : dias !== null && dias <= 0
                            ? "bg-red-500/15 text-red-400 border border-red-500/20"
                            : "bg-[--bg-elevated] text-[--text-muted] border border-[--border-primary]"
                        }`}>
                          {c.estado ? "Activo" : dias !== null && dias <= 0 ? "Vencido" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => router.push(`/clientes/${c.id}`)}
                            className="p-1.5 rounded-md text-[--text-muted] hover:text-[--text-primary] hover:bg-[--bg-elevated] transition-colors"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteId(c.id)}
                            className="p-1.5 rounded-md text-[--text-muted] hover:text-[--danger] hover:bg-[--danger-soft] transition-colors"
                            title="Eliminar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-[--border-primary]">
            <p className="text-sm text-[--text-muted]">
              Mostrando {from}-{to} de {count} clientes
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-2 py-1 text-sm text-[--text-muted] hover:text-[--text-primary] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  &lt;
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      page === p
                        ? "bg-[--accent] text-white"
                        : "text-[--text-muted] hover:bg-[--bg-elevated]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-2 py-1 text-sm text-[--text-muted] hover:text-[--text-primary] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  &gt;
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Confirmar eliminación">
        <p className="text-sm text-[--text-secondary] mb-4">
          ¿Estás seguro de que querés eliminar este registro? Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
