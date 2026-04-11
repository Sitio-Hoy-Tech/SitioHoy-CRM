"use client";

import { useEffect, useState, useCallback } from "react";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Modal from "@/components/common/Modal";
import Toast from "@/components/common/Toast";

interface Item {
  id: string;
  nombre: string;
  created_at: string;
}

interface CatalogoCRUDProps {
  title: string;
  apiUrl: string;
}

export default function CatalogoCRUD({ title, apiUrl }: CatalogoCRUDProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const res = await fetch(apiUrl);
    const json = await res.json();
    setItems(json.data || []);
    setLoading(false);
  }, [apiUrl]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });
    setSaving(false);
    if (res.ok) {
      setNombre("");
      setToast({ message: "Creado correctamente", type: "success" });
      fetchItems();
    } else {
      const json = await res.json();
      setToast({ message: json.error || "Error al crear", type: "error" });
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editNombre.trim() || !editId) return;
    setEditSaving(true);
    const res = await fetch(`${apiUrl}/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: editNombre }),
    });
    setEditSaving(false);
    if (res.ok) {
      setEditId(null);
      setToast({ message: "Actualizado correctamente", type: "success" });
      fetchItems();
    } else {
      const json = await res.json();
      setToast({ message: json.error || "Error al actualizar", type: "error" });
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const res = await fetch(`${apiUrl}/${deleteId}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteId(null);
    if (res.ok) {
      setToast({ message: "Eliminado correctamente", type: "success" });
      fetchItems();
    } else {
      setToast({ message: "Error al eliminar", type: "error" });
    }
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-heading mb-6">Catálogos &gt; {title}</h1>

      {/* Inline create */}
      <form onSubmit={handleCreate} className="flex items-center gap-3 mb-6">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del estado..."
          required
          className="flex-1 bg-input border border-edge rounded-lg px-3.5 py-2.5 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
        />
        <Button type="submit" loading={saving}>+ Agregar</Button>
      </form>

      <div className="bg-card rounded-xl border border-edge overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge">
              <th className="text-left px-4 py-3 font-medium text-muted">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-muted">Creado</th>
              <th className="text-right px-4 py-3 font-medium text-muted">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="text-center py-8 text-muted">Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-8 text-muted">Sin registros</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-edge hover:bg-elevated transition-colors">
                  <td className="px-4 py-3 font-medium text-heading">{item.nombre}</td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(item.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditId(item.id); setEditNombre(item.nombre); }}
                        className="p-1.5 rounded-md text-muted hover:text-heading hover:bg-elevated transition-colors"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteId(item.id)}
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

      <Modal open={!!editId} onClose={() => setEditId(null)} title="Editar">
        <form onSubmit={handleEdit} className="space-y-4">
          <Input label="Nombre" required value={editNombre} onChange={(e) => setEditNombre(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setEditId(null)}>Cancelar</Button>
            <Button type="submit" loading={editSaving}>Guardar</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Confirmar eliminación">
        <p className="text-sm text-body mb-4">¿Estás seguro? Esta acción no se puede deshacer.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
