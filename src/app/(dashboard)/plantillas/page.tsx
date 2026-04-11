"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Modal from "@/components/common/Modal";
import Toast from "@/components/common/Toast";
import type { Plantilla } from "@/types";

export default function PlantillasPage() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [search, setSearch] = useState("");

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

  const filtered = plantillas.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[--text-primary]">Plantillas</h1>
          <p className="text-sm text-[--text-muted] mt-1">{plantillas.length} plantillas</p>
        </div>
        <Link href="/plantillas/nuevo">
          <Button>+ Nueva plantilla</Button>
        </Link>
      </div>

      <div className="mb-4">
        <Input placeholder="Buscar por nombre..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-[--text-muted] col-span-3 text-center py-8">Cargando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-[--text-muted] col-span-3 text-center py-8">Sin plantillas</p>
        ) : (
          filtered.map((p) => (
            <div key={p.id} className="bg-[--bg-card] rounded-xl border border-[--border-primary] overflow-hidden hover:border-[--accent-border] transition-all duration-300">
              <div className="h-40 bg-[--bg-elevated] border-b border-[--border-primary] overflow-hidden flex items-center justify-center">
                {p.url_plantilla ? (
                  <a
                    href={p.url_plantilla}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[--accent] text-sm hover:underline flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Ver plantilla
                  </a>
                ) : (
                  <span className="text-[--text-muted] text-sm">Sin URL</span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-[--text-primary]">{p.nombre}</h3>
                {p.url_plantilla && (
                  <p className="text-xs text-[--text-muted] mt-1 truncate">{p.url_plantilla}</p>
                )}
                {p.etiqueta_plantilla && (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[--accent-soft] text-[--accent] border border-[--accent-border] mt-2">
                    {p.etiqueta_plantilla.nombre}
                  </span>
                )}
                <div className="flex gap-2 mt-3">
                  <Link href={`/plantillas/${p.id}`}>
                    <Button variant="secondary" size="sm">Editar</Button>
                  </Link>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => setDeleteId(p.id)}
                    className="!text-[--danger] hover:!text-[--danger]"
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Eliminar plantilla">
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
