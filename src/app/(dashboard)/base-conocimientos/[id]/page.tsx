"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import Toast from "@/components/common/Toast";
import MarkdownContent from "@/components/common/MarkdownContent";
import type { KbArticulo } from "@/types";

export default function ArticuloPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [articulo, setArticulo] = useState<KbArticulo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetch(`/api/kb/articulos/${id}`)
      .then(r => r.json())
      .then(json => { setArticulo(json.data || null); setLoading(false); });
  }, [id]);

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/kb/articulos/${articulo!.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      router.push("/base-conocimientos");
    } else {
      const json = await res.json();
      setToast({ message: json.error || "Error al eliminar", type: "error" });
      setShowDelete(false);
    }
  }

  if (loading) return <div className="text-muted py-12 text-center text-sm">Cargando...</div>;
  if (!articulo) return <div className="text-muted py-12 text-center text-sm">Artículo no encontrado.</div>;

  return (
    <div className="animate-fade-in max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-muted">
        <Link href="/base-conocimientos" className="hover:text-heading transition-colors">
          Base de Conocimientos
        </Link>
        <span>/</span>
        {articulo.categoria && (
          <>
            <Link href={`/base-conocimientos?cat=${articulo.categoria.id}`} className="hover:text-heading transition-colors">
              {articulo.categoria.nombre}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-heading truncate">{articulo.titulo}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">{articulo.titulo}</h1>
          {articulo.resumen && (
            <p className="text-sm text-muted mt-1.5 leading-relaxed">{articulo.resumen}</p>
          )}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {articulo.categoria && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent-soft border border-accent-border text-accent font-medium">
                {articulo.categoria.nombre}
              </span>
            )}
            <span className="text-xs text-muted">
              Actualizado {new Date(articulo.updated_at).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}
            </span>
            {articulo.usuario_creador && (
              <span className="text-xs text-muted">
                por {articulo.usuario_creador.nombre} {articulo.usuario_creador.apellido}
              </span>
            )}
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="secondary" size="sm" onClick={() => router.push(`/base-conocimientos/${articulo.id}/editar`)}>
              Editar
            </Button>
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
            >
              Eliminar
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="bg-card rounded-xl border border-edge p-8">
        <MarkdownContent content={articulo.contenido} />
      </div>

      {/* Modal eliminar */}
      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Eliminar artículo">
        <p className="text-sm text-body mb-4">
          ¿Seguro que querés eliminar <strong className="text-heading">"{articulo.titulo}"</strong>? Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setShowDelete(false)}>Cancelar</Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
