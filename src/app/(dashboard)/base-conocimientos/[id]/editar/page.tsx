"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Toast from "@/components/common/Toast";
import SearchableSelect from "@/components/common/SearchableSelect";
import MarkdownContent from "@/components/common/MarkdownContent";
import type { KbCategoria, KbArticulo } from "@/types";

export default function EditarArticuloPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState<KbCategoria[]>([]);
  const [creatingCat, setCreatingCat] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [form, setForm] = useState({
    titulo: "", categoria_id: "", resumen: "", contenido: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/kb/articulos/${id}`).then(r => r.json()),
      fetch("/api/kb/categorias").then(r => r.json()),
    ]).then(([art, cats]) => {
      if (art.data) {
        const a: KbArticulo = art.data;
        setForm({
          titulo: a.titulo,
          categoria_id: a.categoria_id,
          resumen: a.resumen || "",
          contenido: a.contenido,
        });
      }
      setCategorias(cats.data || []);
      setLoading(false);
    });
  }, [id]);

  async function handleCreateCategoria(nombre: string) {
    setCreatingCat(true);
    const res = await fetch("/api/kb/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });
    const json = await res.json();
    setCreatingCat(false);
    if (res.ok && json.data) {
      setCategorias(prev => [...prev, json.data]);
      setForm(f => ({ ...f, categoria_id: json.data.id }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/kb/articulos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setToast({ message: json.error || "Error al guardar", type: "error" }); return; }
    router.push(`/base-conocimientos/${id}`);
  }

  if (loading) return <div className="text-muted py-12 text-center text-sm">Cargando...</div>;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <button type="button" onClick={() => router.back()} className="text-sm text-muted hover:text-heading mb-2 inline-block transition-colors">
          &larr; Volver
        </button>
        <h1 className="text-2xl font-bold text-heading">Editar artículo</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-card rounded-xl border border-edge p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Título" required autoFocus
              value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
            />
            <SearchableSelect label="Categoría" required
              options={categorias.map(c => ({ value: c.id, label: c.nombre }))}
              placeholder="Seleccionar categoría..."
              value={form.categoria_id} onChange={val => setForm(f => ({ ...f, categoria_id: val }))}
              creatable onCreateOption={handleCreateCategoria} isLoading={creatingCat}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-body mb-1.5">Resumen</label>
            <input
              value={form.resumen}
              onChange={e => setForm(f => ({ ...f, resumen: e.target.value }))}
              placeholder="Una línea que describe el artículo (opcional)"
              className="w-full bg-input border border-edge rounded-lg px-3.5 py-2.5 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            />
          </div>
        </div>

        {/* Editor / Preview toggle */}
        <div className="bg-card rounded-xl border border-edge overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-edge">
            <span className="text-sm font-medium text-heading">Contenido (Markdown)</span>
            <div className="flex rounded-lg overflow-hidden border border-edge text-xs">
              <button type="button" onClick={() => setPreview(false)}
                className={`px-3 py-1.5 transition-colors ${!preview ? "bg-accent text-white" : "text-muted hover:text-heading"}`}>
                Editar
              </button>
              <button type="button" onClick={() => setPreview(true)}
                className={`px-3 py-1.5 transition-colors ${preview ? "bg-accent text-white" : "text-muted hover:text-heading"}`}>
                Preview
              </button>
            </div>
          </div>

          {preview ? (
            <div className="p-6 min-h-[400px]">
              {form.contenido ? (
                <MarkdownContent content={form.contenido} />
              ) : (
                <p className="text-muted text-sm italic">Sin contenido todavía...</p>
              )}
            </div>
          ) : (
            <textarea
              required
              value={form.contenido}
              onChange={e => setForm(f => ({ ...f, contenido: e.target.value }))}
              className="w-full bg-transparent px-6 py-5 text-sm text-heading placeholder:text-muted focus:outline-none font-mono leading-relaxed resize-none min-h-[400px]"
            />
          )}
        </div>

        <div className="flex justify-between">
          <Button variant="secondary" type="button" onClick={() => router.back()}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar cambios</Button>
        </div>
      </form>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
