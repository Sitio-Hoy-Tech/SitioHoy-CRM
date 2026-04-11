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
import type { Contacto, EstadoContacto, EtiquetaNegocio } from "@/types";

const ORIGENES = [
  { value: "", label: "Todos los orígenes" },
  ...["WhatsApp", "Instagram", "Local", "Facebook", "Google", "X", "Email", "IA", "Llamada"].map(o => ({ value: o, label: o })),
];

export default function ContactosPage() {
  const router = useRouter();
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [search, setSearch] = useState("");
  const [estadoId, setEstadoId] = useState("");
  const [etiquetaId, setEtiquetaId] = useState("");
  const [origen, setOrigen] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const [estados, setEstados] = useState<EstadoContacto[]>([]);
  const [etiquetas, setEtiquetas] = useState<EtiquetaNegocio[]>([]);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchContactos = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (search) params.set("search", search);
    if (estadoId) params.set("estado_id", estadoId);
    if (etiquetaId) params.set("etiqueta_negocio_id", etiquetaId);
    if (origen) params.set("origen", origen);
    if (fechaDesde) params.set("fecha_desde", fechaDesde);
    if (fechaHasta) params.set("fecha_hasta", fechaHasta);

    const res = await fetch(`/api/contactos?${params}`);
    const json = await res.json();
    setContactos(json.data || []);
    setCount(json.count || 0);
    setLoading(false);
  }, [page, search, estadoId, etiquetaId, origen, fechaDesde, fechaHasta]);

  useEffect(() => { fetchContactos(); }, [fetchContactos]);

  useEffect(() => {
    fetch("/api/catalogos/estados-contacto").then(r => r.json()).then(j => setEstados(j.data || []));
    fetch("/api/catalogos/etiquetas-negocio").then(r => r.json()).then(j => setEtiquetas(j.data || []));
  }, []);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const res = await fetch(`/api/contactos/${deleteId}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteId(null);

    if (res.ok) {
      setToast({ message: "Contacto eliminado", type: "success" });
      fetchContactos();
    } else {
      setToast({ message: "Error al eliminar", type: "error" });
    }
  }

  const totalPages = Math.ceil(count / limit);
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, count);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-heading">Contactos</h1>
        <Link href="/contactos/nuevo">
          <Button>+ Nuevo contacto</Button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-48 bg-input border border-edge rounded-lg pl-9 pr-3.5 py-2 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
          />
        </div>
        <Select
          options={estados.map(e => ({ value: e.id, label: e.nombre }))}
          placeholder="Estado"
          value={estadoId}
          onChange={(e) => { setEstadoId(e.target.value); setPage(1); }}
        />
        <Select
          options={etiquetas.map(e => ({ value: e.id, label: e.nombre }))}
          placeholder="Etiqueta"
          value={etiquetaId}
          onChange={(e) => { setEtiquetaId(e.target.value); setPage(1); }}
        />
        <Select
          options={ORIGENES.slice(1)}
          placeholder="Origen"
          value={origen}
          onChange={(e) => { setOrigen(e.target.value); setPage(1); }}
        />
        <DatePicker
          placeholder="Desde"
          value={fechaDesde}
          onChange={(val) => { setFechaDesde(val); setPage(1); }}
        />
        <DatePicker
          placeholder="Hasta"
          value={fechaHasta}
          onChange={(val) => { setFechaHasta(val); setPage(1); }}
        />
      </div>

      {/* Tabla */}
      <div className="bg-card rounded-xl border border-edge overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge">
                <th className="text-left px-4 py-3 font-medium text-muted">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Teléfono</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Etiqueta</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Origen</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted">Cargando...</td>
                </tr>
              ) : contactos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted">No hay contactos</td>
                </tr>
              ) : (
                contactos.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-edge hover:bg-elevated transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-heading">
                      {c.nombre} {c.apellido}
                    </td>
                    <td className="px-4 py-3 text-body">{c.email || "-"}</td>
                    <td className="px-4 py-3 text-body">{c.telefono || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-soft text-accent border border-accent-border">
                        {c.estado?.nombre}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-body">{c.etiqueta_negocio?.nombre || "-"}</td>
                    <td className="px-4 py-3 text-body">{c.origen}</td>
                    <td className="px-4 py-3 text-body">
                      {new Date(c.fecha_contacto).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => router.push(`/contactos/${c.id}`)}
                          className="p-1.5 rounded-md text-muted hover:text-heading hover:bg-elevated transition-colors"
                          title="Ver detalle"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => router.push(`/contactos/${c.id}/seguimiento`)}
                          className="p-1.5 rounded-md text-muted hover:text-heading hover:bg-elevated transition-colors"
                          title="Seguimiento"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteId(c.id)}
                          className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger-soft transition-colors"
                          title="Eliminar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {count > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-edge">
            <p className="text-sm text-muted">
              Mostrando {from}-{to} de {count} contactos
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
                      page === p
                        ? "bg-accent text-white"
                        : "text-muted hover:bg-elevated"
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

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Confirmar eliminación">
        <p className="text-sm text-body mb-4">
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
