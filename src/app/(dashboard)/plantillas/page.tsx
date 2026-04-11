"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import Toast from "@/components/common/Toast";
import type { Plantilla } from "@/types";

export default function PlantillasPage() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchPlantillas = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/plantillas");
    const json = await res.json();
    setPlantillas(json.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPlantillas(); }, [fetchPlantillas]);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const res = await fetch(`/api/plantillas/${deleteId}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteId(null);
    if (res.ok) {
      setToast({ message: "Plantilla eliminada", type: "success" });
      fetchPlantillas();
    } else {
      setToast({ message: "Error al eliminar", type: "error" });
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[--text-primary]">Plantillas</h1>
        <Link href="/plantillas/nuevo">
          <Button>+ Nueva plantilla</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <p className="text-[--text-muted] col-span-3 text-center py-8">Cargando...</p>
        ) : plantillas.length === 0 ? (
          <p className="text-[--text-muted] col-span-3 text-center py-8">Sin plantillas</p>
        ) : (
          plantillas.map((p) => (
            <div key={p.id} className="bg-[--bg-card] rounded-xl border border-[--border-primary] overflow-hidden hover:border-[--accent-border] transition-all duration-300">
              <div className="h-40 bg-[--bg-elevated] border-b border-[--border-primary] flex items-center justify-center">
                <svg className="w-12 h-12 text-[--text-muted]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-[--text-primary] mb-1">{p.nombre}</h3>
                {p.etiqueta_plantilla && (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[--accent-soft] text-[--accent] border border-[--accent-border] mb-2">
                    {p.etiqueta_plantilla.nombre}
                  </span>
                )}
                {p.url_plantilla && (
                  <a
                    href={p.url_plantilla}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-[--accent] hover:underline mt-1 mb-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {p.url_plantilla}
                  </a>
                )}
                <div className="flex gap-2 mt-2">
                  <Link href={`/plantillas/${p.id}`}>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[--text-secondary] border border-[--border-primary] rounded-lg hover:bg-[--bg-elevated] transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>
                  </Link>
                  <button
                    onClick={() => setDeleteId(p.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[--danger] border border-red-500/20 rounded-lg hover:bg-[--danger-soft] transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Confirmar eliminación">
        <p className="text-sm text-[--text-secondary] mb-4">¿Estás seguro? Esta acción no se puede deshacer.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
