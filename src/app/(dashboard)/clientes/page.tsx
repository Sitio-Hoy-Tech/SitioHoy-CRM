"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Modal from "@/components/common/Modal";
import Toast from "@/components/common/Toast";
import type { Cliente, Plan, EtiquetaNegocio } from "@/types";

export default function ClientesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 50;

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

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[--text-primary]">Clientes</h1>
          <p className="text-sm text-[--text-muted] mt-1">{count} clientes en total</p>
        </div>
        <Link href="/clientes/nuevo">
          <Button>+ Nuevo cliente</Button>
        </Link>
      </div>

      <div className="bg-[--bg-card] rounded-xl border border-[--border-primary] p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Input
            placeholder="Buscar por nombre, dominio..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <Select
            options={planes.map(p => ({ value: p.id, label: `${p.nombre} ($${Number(p.precio).toLocaleString("es-AR")})` }))}
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
          <Select
            options={[
              { value: "7", label: "Vence en 7 días" },
              { value: "15", label: "Vence en 15 días" },
              { value: "30", label: "Vence en 30 días" },
            ]}
            placeholder="Vencimiento"
            value={vencimientoDias}
            onChange={(e) => { setVencimientoDias(e.target.value); setPage(1); }}
          />
        </div>
        {(search || planId || estado || etiquetaId || vencimientoDias) && (
          <button
            onClick={() => {
              setSearch(""); setPlanId(""); setEstado("");
              setEtiquetaId(""); setVencimientoDias(""); setPage(1);
            }}
            className="mt-2 text-sm text-[--accent] hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="bg-[--bg-card] rounded-xl border border-[--border-primary] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[--border-primary] bg-[--bg-secondary]">
                <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Empresa</th>
                <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Contacto</th>
                <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Dominio</th>
                <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Etiqueta</th>
                <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Vencimiento</th>
                <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-[--text-muted]">Acciones</th>
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
                    <tr
                      key={c.id}
                      className="border-b border-[--border-primary] hover:bg-[--bg-elevated] cursor-pointer transition-colors"
                      onClick={() => router.push(`/clientes/${c.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-[--text-primary]">{c.nombre_empresa}</td>
                      <td className="px-4 py-3 text-[--text-secondary]">
                        {c.contacto ? `${c.contacto.nombre} ${c.contacto.apellido || ""}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-[--text-secondary]">{c.dominio}</td>
                      <td className="px-4 py-3 text-[--text-secondary]">{c.plan?.nombre || "-"}</td>
                      <td className="px-4 py-3 text-[--text-secondary]">{c.etiqueta_negocio?.nombre || "-"}</td>
                      <td className="px-4 py-3">
                        {dias !== null && (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            dias <= 7
                              ? "bg-red-500/15 text-red-400 border border-red-500/20"
                              : dias <= 15
                              ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20"
                              : "bg-[--accent-soft] text-[--accent] border border-[--accent-border]"
                          }`}>
                            {dias <= 0 ? "Vencido" : `${dias} días`}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          c.estado
                            ? "bg-[--accent-soft] text-[--accent] border border-[--accent-border]"
                            : "bg-[--bg-elevated] text-[--text-muted] border border-[--border-primary]"
                        }`}>
                          {c.estado ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Link href={`/clientes/${c.id}`}>
                            <Button variant="ghost" size="sm">Ver</Button>
                          </Link>
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => setDeleteId(c.id)}
                            className="!text-[--danger] hover:!text-[--danger]"
                          >
                            Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[--border-primary]">
            <p className="text-sm text-[--text-muted]">Página {page} de {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
            </div>
          </div>
        )}
      </div>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Eliminar cliente">
        <p className="text-sm text-[--text-secondary] mb-4">
          ¿Estás seguro de que querés eliminar este cliente? Esta acción no se puede deshacer.
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
