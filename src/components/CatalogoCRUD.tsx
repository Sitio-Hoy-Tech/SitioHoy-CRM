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

  const [showCreate, setShowCreate] = useState(false);
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
      setShowCreate(false);
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[--text-primary]">{title}</h1>
          <p className="text-sm text-[--text-muted] mt-1">{items.length} registros</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ Nuevo</Button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-[--bg-card] rounded-xl border border-[--border-primary] p-4 mb-4 flex gap-3 items-end">
          <div className="flex-1">
            <Input label="Nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre..." />
          </div>
          <Button type="submit" loading={saving}>Crear</Button>
          <Button variant="secondary" type="button" onClick={() => { setShowCreate(false); setNombre(""); }}>Cancelar</Button>
        </form>
      )}

      <div className="bg-[--bg-card] rounded-xl border border-[--border-primary] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[--border-primary] bg-[--bg-secondary]">
              <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Creado</th>
              <th className="text-right px-4 py-3 font-medium text-[--text-muted]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="text-center py-8 text-[--text-muted]">Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-8 text-[--text-muted]">Sin registros</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-[--border-primary] hover:bg-[--bg-elevated] transition-colors">
                  <td className="px-4 py-3 font-medium text-[--text-primary]">{item.nombre}</td>
                  <td className="px-4 py-3 text-[--text-muted]">
                    {new Date(item.created_at).toLocaleDateString("es-AR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditId(item.id); setEditNombre(item.nombre); }}>
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(item.id)} className="!text-[--danger] hover:!text-[--danger]">
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

      <Modal open={!!editId} onClose={() => setEditId(null)} title="Editar">
        <form onSubmit={handleEdit} className="space-y-4">
          <Input label="Nombre" required value={editNombre} onChange={(e) => setEditNombre(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setEditId(null)}>Cancelar</Button>
            <Button type="submit" loading={editSaving}>Guardar</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Eliminar">
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
