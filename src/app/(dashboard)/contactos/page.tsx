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
  const limit = 50;

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

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[--text-primary]">Contactos</h1>
          <p className="text-sm text-[--text-muted] mt-1">{count} contactos en total</p>
        </div>
        <Link href="/contactos/nuevo">
          <Button>+ Nuevo contacto</Button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-[--bg-card] rounded-xl border border-[--border-primary] p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Input
            placeholder="Buscar por nombre, email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
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
        {(search || estadoId || etiquetaId || origen || fechaDesde || fechaHasta) && (
          <button
            onClick={() => {
              setSearch(""); setEstadoId(""); setEtiquetaId("");
              setOrigen(""); setFechaDesde(""); setFechaHasta(""); setPage(1);
            }}
            className="mt-2 text-sm text-[--accent] hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-[--bg-card] rounded-xl border border-[--border-primary] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[--border-primary] bg-[--bg-secondary]">
                <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Email</th>
                <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Teléfono</th>
                <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Etiqueta</th>
                <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Origen</th>
                <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Fecha contacto</th>
                <th className="text-right px-4 py-3 font-medium text-[--text-muted]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-[--text-muted]">Cargando...</td>
                </tr>
              ) : contactos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-[--text-muted]">No hay contactos</td>
                </tr>
              ) : (
                contactos.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[--border-primary] hover:bg-[--bg-elevated] cursor-pointer transition-colors"
                    onClick={() => router.push(`/contactos/${c.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-[--text-primary]">
                      {c.nombre} {c.apellido}
                    </td>
                    <td className="px-4 py-3 text-[--text-secondary]">{c.email || "-"}</td>
                    <td className="px-4 py-3 text-[--text-secondary]">{c.telefono || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[--accent-soft] text-[--accent] border border-[--accent-border]">
                        {c.estado?.nombre}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[--text-secondary]">{c.etiqueta_negocio?.nombre || "-"}</td>
                    <td className="px-4 py-3 text-[--text-secondary]">{c.origen}</td>
                    <td className="px-4 py-3 text-[--text-secondary]">
                      {new Date(c.fecha_contacto).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/contactos/${c.id}`}>
                          <Button variant="ghost" size="sm">Ver</Button>
                        </Link>
                        <Link href={`/contactos/${c.id}/seguimiento`}>
                          <Button variant="ghost" size="sm">Seguimiento</Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(c.id)}
                          className="!text-[--danger] hover:!text-[--danger]"
                        >
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[--border-primary]">
            <p className="text-sm text-[--text-muted]">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Anterior
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Eliminar contacto">
        <p className="text-sm text-[--text-secondary] mb-4">
          ¿Estás seguro de que querés eliminar este contacto? Esta acción no se puede deshacer.
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
