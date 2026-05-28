"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import Toast from "@/components/common/Toast";
import type { KbCategoria, KbArticulo } from "@/types";

// ─── Icons ────────────────────────────────────────────────────────────────────

const BookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
  </svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);

export default function BaseConocimientosPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [categorias, setCategorias] = useState<KbCategoria[]>([]);
  const [articulos, setArticulos] = useState<KbArticulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Category management
  const [showCatModal, setShowCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ nombre: "", descripcion: "" });
  const [catSaving, setCatSaving] = useState(false);
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const [deletingCat, setDeletingCat] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [catsRes, artsRes] = await Promise.all([
      fetch("/api/kb/categorias"),
      fetch("/api/kb/articulos"),
    ]);
    const [cats, arts] = await Promise.all([catsRes.json(), artsRes.json()]);
    setCategorias(cats.data || []);
    setArticulos(arts.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filteredArticulos = articulos.filter(a => {
    const matchesCat = selectedCat ? a.categoria_id === selectedCat : true;
    const matchesSearch = search
      ? a.titulo.toLowerCase().includes(search.toLowerCase()) ||
        (a.resumen?.toLowerCase().includes(search.toLowerCase()) ?? false)
      : true;
    return matchesCat && matchesSearch;
  });

  const articulosPorCategoria = (catId: string) =>
    filteredArticulos.filter(a => a.categoria_id === catId);

  async function handleCreateCategoria(e: React.FormEvent) {
    e.preventDefault();
    setCatSaving(true);
    const res = await fetch("/api/kb/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(catForm),
    });
    const json = await res.json();
    setCatSaving(false);
    if (!res.ok) { setToast({ message: json.error || "Error", type: "error" }); return; }
    setShowCatModal(false);
    setCatForm({ nombre: "", descripcion: "" });
    setToast({ message: "Categoría creada", type: "success" });
    fetchAll();
  }

  async function handleDeleteCategoria() {
    if (!deleteCatId) return;
    setDeletingCat(true);
    const res = await fetch(`/api/kb/categorias/${deleteCatId}`, { method: "DELETE" });
    setDeletingCat(false);
    setDeleteCatId(null);
    if (!res.ok) { setToast({ message: "Error al eliminar categoría", type: "error" }); return; }
    setToast({ message: "Categoría eliminada", type: "success" });
    if (selectedCat === deleteCatId) setSelectedCat(null);
    fetchAll();
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Base de Conocimientos</h1>
          <p className="text-sm text-muted mt-0.5">Guías y documentación técnica del equipo.</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowCatModal(true)}>
              + Categoría
            </Button>
            <Button type="button" onClick={() => router.push("/base-conocimientos/nuevo")}>
              + Nuevo artículo
            </Button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"><SearchIcon /></span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar artículos..."
          className="w-full bg-input border border-edge rounded-lg pl-10 pr-4 py-2.5 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
        />
      </div>

      <div className="grid grid-cols-[220px_1fr] gap-6 items-start">
        {/* ── Sidebar categorías ── */}
        <div className="bg-card rounded-xl border border-edge p-4 sticky top-6">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Categorías</p>
          <nav className="space-y-0.5">
            <button
              onClick={() => setSelectedCat(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                !selectedCat ? "bg-accent/10 text-accent font-medium" : "text-body hover:bg-elevated hover:text-heading"
              }`}
            >
              Todas
              <span className="ml-2 text-xs text-muted">({articulos.length})</span>
            </button>
            {categorias.map(cat => (
              <div key={cat.id} className="flex items-center gap-1 group">
                <button
                  onClick={() => setSelectedCat(selectedCat === cat.id ? null : cat.id)}
                  className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCat === cat.id ? "bg-accent/10 text-accent font-medium" : "text-body hover:bg-elevated hover:text-heading"
                  }`}
                >
                  {cat.nombre}
                  <span className="ml-2 text-xs text-muted">
                    ({articulos.filter(a => a.categoria_id === cat.id).length})
                  </span>
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setDeleteCatId(cat.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted hover:text-red-400 transition-all"
                    title="Eliminar categoría"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* ── Articles ── */}
        <div className="space-y-8">
          {loading ? (
            <p className="text-muted text-sm py-12 text-center">Cargando...</p>
          ) : filteredArticulos.length === 0 ? (
            <div className="bg-card rounded-xl border border-edge p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-elevated flex items-center justify-center mx-auto mb-3 text-muted">
                <BookIcon />
              </div>
              <p className="text-sm text-muted">
                {search ? "No se encontraron artículos." : "No hay artículos todavía."}
              </p>
              {isAdmin && !search && (
                <Button className="mt-4" onClick={() => router.push("/base-conocimientos/nuevo")}>
                  Crear primer artículo
                </Button>
              )}
            </div>
          ) : (
            (selectedCat ? [categorias.find(c => c.id === selectedCat)].filter(Boolean) : categorias).map(cat => {
              const arts = articulosPorCategoria(cat!.id);
              if (arts.length === 0) return null;
              return (
                <div key={cat!.id}>
                  <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                    {cat!.nombre}
                    <span className="text-xs font-normal normal-case">({arts.length})</span>
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    {arts.map(art => (
                      <Link
                        key={art.id}
                        href={`/base-conocimientos/${art.id}`}
                        className="bg-card rounded-xl border border-edge p-4 hover:border-accent-border hover:bg-card/80 transition-all duration-200 group"
                      >
                        <h3 className="text-sm font-semibold text-heading group-hover:text-accent transition-colors mb-1">
                          {art.titulo}
                        </h3>
                        {art.resumen && (
                          <p className="text-xs text-muted line-clamp-2 leading-relaxed">{art.resumen}</p>
                        )}
                        <p className="text-xs text-muted/60 mt-2">
                          {new Date(art.updated_at).toLocaleDateString("es-AR")}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal nueva categoría */}
      <Modal open={showCatModal} onClose={() => setShowCatModal(false)} title="Nueva categoría">
        <form onSubmit={handleCreateCategoria} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-body mb-1.5">Nombre <span className="text-accent">*</span></label>
            <input required value={catForm.nombre} onChange={e => setCatForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Procedimientos del CRM"
              className="w-full bg-input border border-edge rounded-lg px-3.5 py-2.5 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-body mb-1.5">Descripción</label>
            <input value={catForm.descripcion} onChange={e => setCatForm(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="Descripción breve (opcional)"
              className="w-full bg-input border border-edge rounded-lg px-3.5 py-2.5 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowCatModal(false)}>Cancelar</Button>
            <Button type="submit" loading={catSaving}>Crear categoría</Button>
          </div>
        </form>
      </Modal>

      {/* Modal eliminar categoría */}
      <Modal open={!!deleteCatId} onClose={() => setDeleteCatId(null)} title="Eliminar categoría">
        <p className="text-sm text-body mb-4">
          ¿Seguro? Los artículos de esta categoría quedarán sin categoría asignada.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteCatId(null)}>Cancelar</Button>
          <Button variant="danger" loading={deletingCat} onClick={handleDeleteCategoria}>Eliminar</Button>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
