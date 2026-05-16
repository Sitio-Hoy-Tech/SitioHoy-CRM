"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Modal from "@/components/common/Modal";
import Toast from "@/components/common/Toast";
import type { Cliente } from "@/types";

export default function ClientesArchivadosPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Cliente | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const deleteInputRef = useRef<HTMLInputElement>(null);

  const limit = 20;

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("archived", "true");
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (search) params.set("search", search);
    const res = await fetch(`/api/clientes?${params}`);
    const json = await res.json();
    setClientes(json.data || []);
    setCount(json.count || 0);
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  async function handleRestore(id: string) {
    setRestoringId(id);
    const res = await fetch(`/api/clientes/${id}/restore`, { method: "POST" });
    setRestoringId(null);
    if (res.ok) {
      setToast({ message: "Cliente restaurado correctamente", type: "success" });
      fetchClientes();
    } else {
      const json = await res.json();
      setToast({ message: json.error || "Error al restaurar", type: "error" });
    }
  }

  function openDelete(cliente: Cliente) {
    setDeleteTarget(cliente);
    setDeleteInput("");
    setTimeout(() => deleteInputRef.current?.focus(), 100);
  }

  function closeDelete() {
    setDeleteTarget(null);
    setDeleteInput("");
  }

  async function handlePermanentDelete() {
    if (!deleteTarget || deleteInput.trim() !== deleteTarget.nombre_empresa.trim()) return;
    setDeleting(true);
    const res = await fetch(`/api/clientes/${deleteTarget.id}/delete-permanent`, { method: "POST" });
    const json = await res.json();
    setDeleting(false);
    if (res.ok) {
      closeDelete();
      setToast({ message: "Cliente eliminado permanentemente", type: "success" });
      fetchClientes();
    } else {
      setToast({ message: json.error || "Error al eliminar", type: "error" });
    }
  }

  const totalPages = Math.ceil(count / limit);
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, count);

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <Link href="/clientes" className="text-sm text-muted hover:text-heading mb-2 inline-block transition-colors">
          &larr; Volver a clientes
        </Link>
        <h1 className="text-2xl font-bold text-heading">Clientes archivados</h1>
        <p className="text-sm text-muted mt-0.5">
          {count > 0 ? `${count} cliente${count !== 1 ? "s" : ""} archivado${count !== 1 ? "s" : ""}` : "Sin clientes archivados"}
        </p>
      </div>

      <div className="mb-4">
        <div className="relative w-64">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            placeholder="Buscar empresa o dominio..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-input border border-edge rounded-lg pl-9 pr-3.5 py-2 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
          />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-edge overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge">
                <th className="text-left px-4 py-3 font-medium text-muted">Empresa</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Dominio</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Archivado</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-muted">Cargando...</td></tr>
              ) : clientes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-8 h-8 text-muted/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                      </svg>
                      <span className="text-sm">No hay clientes archivados</span>
                    </div>
                  </td>
                </tr>
              ) : (
                clientes.map((c) => (
                  <tr key={c.id} className="border-b border-edge hover:bg-elevated transition-colors">
                    <td className="px-4 py-3 font-medium text-heading">{c.nombre_empresa}</td>
                    <td className="px-4 py-3 text-body">{c.dominio}</td>
                    <td className="px-4 py-3 text-body">{c.plan?.nombre || "-"}</td>
                    <td className="px-4 py-3 text-muted text-xs">
                      {c.deleted_at
                        ? new Date(c.deleted_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRestore(c.id)}
                          disabled={restoringId === c.id}
                          className="px-3 py-1 rounded-md text-xs font-medium text-accent border border-accent-border hover:bg-accent-soft transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {restoringId === c.id ? "Restaurando..." : "Restaurar"}
                        </button>
                        <button
                          onClick={() => openDelete(c)}
                          className="px-3 py-1 rounded-md text-xs font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {count > limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-edge">
            <p className="text-sm text-muted">Mostrando {from}–{to} de {count}</p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-2 py-1 text-sm text-muted hover:text-heading disabled:opacity-40 disabled:cursor-not-allowed">&lt;</button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${page === p ? "bg-accent text-white" : "text-muted hover:bg-elevated"}`}>{p}</button>
                ))}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-2 py-1 text-sm text-muted hover:text-heading disabled:opacity-40 disabled:cursor-not-allowed">&gt;</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal borrado permanente */}
      <Modal open={!!deleteTarget} onClose={closeDelete} title="Eliminar permanentemente">
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-sm space-y-1">
            <p className="font-semibold text-red-400">Esta acción no se puede deshacer. Se eliminará:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs text-red-300 mt-2">
              <li>El cliente del CRM</li>
              {deleteTarget?.tenant_id && (
                <>
                  <li>El tenant en SitioHoy</li>
                  <li>Todos los usuarios del tenant</li>
                  <li>Todos los productos, categorías y variantes</li>
                  <li>Todas las órdenes e ítems</li>
                  <li>Cupones, zonas de envío y mensajes de contacto</li>
                </>
              )}
            </ul>
          </div>

          <div>
            <p className="text-sm text-body mb-2">
              Para confirmar, escribí el nombre del cliente:{" "}
              <span className="font-semibold text-heading">{deleteTarget?.nombre_empresa}</span>
            </p>
            <input
              ref={deleteInputRef}
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && deleteInput.trim() === deleteTarget?.nombre_empresa.trim()) handlePermanentDelete(); }}
              placeholder={deleteTarget?.nombre_empresa}
              className="w-full bg-input border border-edge rounded-lg px-3 py-2 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 transition-all"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeDelete} className="px-4 py-2 rounded-lg text-sm font-medium border border-edge text-body hover:bg-elevated transition-colors">
              Cancelar
            </button>
            <button
              type="button"
              disabled={deleteInput.trim() !== deleteTarget?.nombre_empresa.trim() || deleting}
              onClick={handlePermanentDelete}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {deleting ? "Eliminando..." : "Eliminar para siempre"}
            </button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
