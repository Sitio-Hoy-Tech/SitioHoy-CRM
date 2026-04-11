"use client";

import { useEffect, useState, useCallback } from "react";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Textarea from "@/components/common/Textarea";
import Modal from "@/components/common/Modal";
import Toast from "@/components/common/Toast";
import CurrencyInput from "@/components/common/CurrencyInput";
import type { Plan } from "@/types";

export default function PlanesPage() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ nombre: "", beneficios: "", precio: "" });
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nombre: "", beneficios: "", precio: "" });
  const [editSaving, setEditSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPlanes = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/catalogos/planes");
    const json = await res.json();
    setPlanes(json.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPlanes(); }, [fetchPlanes]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/catalogos/planes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, precio: parseFloat(form.precio) }),
    });
    setSaving(false);
    if (res.ok) {
      setForm({ nombre: "", beneficios: "", precio: "" });
      setShowCreate(false);
      setToast({ message: "Plan creado", type: "success" });
      fetchPlanes();
    } else {
      const json = await res.json();
      setToast({ message: json.error || "Error", type: "error" });
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setEditSaving(true);
    const res = await fetch(`/api/catalogos/planes/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, precio: parseFloat(editForm.precio) }),
    });
    setEditSaving(false);
    if (res.ok) {
      setEditId(null);
      setToast({ message: "Plan actualizado", type: "success" });
      fetchPlanes();
    } else {
      const json = await res.json();
      setToast({ message: json.error || "Error", type: "error" });
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const res = await fetch(`/api/catalogos/planes/${deleteId}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteId(null);
    if (res.ok) {
      setToast({ message: "Plan eliminado", type: "success" });
      fetchPlanes();
    } else {
      setToast({ message: "Error al eliminar", type: "error" });
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[--text-primary]">Planes</h1>
          <p className="text-sm text-[--text-muted] mt-1">{planes.length} planes</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ Nuevo plan</Button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-[--bg-card] rounded-xl border border-[--border-primary] p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nombre" required value={form.nombre} onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))} />
            <CurrencyInput label="Precio" required value={form.precio} onChange={(val) => setForm(f => ({ ...f, precio: val }))} />
          </div>
          <Textarea label="Beneficios" required value={form.beneficios} onChange={(e) => setForm(f => ({ ...f, beneficios: e.target.value }))} placeholder="Listado de beneficios..." />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => { setShowCreate(false); setForm({ nombre: "", beneficios: "", precio: "" }); }}>Cancelar</Button>
            <Button type="submit" loading={saving}>Crear</Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-[--text-muted] col-span-3 text-center py-8">Cargando...</p>
        ) : planes.length === 0 ? (
          <p className="text-[--text-muted] col-span-3 text-center py-8">Sin planes</p>
        ) : (
          planes.map((plan) => (
            <div key={plan.id} className="bg-[--bg-card] rounded-xl border border-[--border-primary] p-5 hover:border-[--accent-border] transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-[--text-primary]">{plan.nombre}</h3>
                <span className="text-lg font-bold text-[--accent]">${Number(plan.precio).toLocaleString("es-AR")}</span>
              </div>
              <p className="text-sm text-[--text-secondary] whitespace-pre-wrap mb-4">{plan.beneficios}</p>
              <div className="flex gap-2">
                <Button
                  variant="ghost" size="sm"
                  onClick={() => {
                    setEditId(plan.id);
                    setEditForm({ nombre: plan.nombre, beneficios: plan.beneficios, precio: String(plan.precio) });
                  }}
                >
                  Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteId(plan.id)} className="!text-[--danger] hover:!text-[--danger]">
                  Eliminar
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={!!editId} onClose={() => setEditId(null)} title="Editar plan">
        <form onSubmit={handleEdit} className="space-y-4">
          <Input label="Nombre" required value={editForm.nombre} onChange={(e) => setEditForm(f => ({ ...f, nombre: e.target.value }))} />
          <CurrencyInput label="Precio" required value={editForm.precio} onChange={(val) => setEditForm(f => ({ ...f, precio: val }))} />
          <Textarea label="Beneficios" required value={editForm.beneficios} onChange={(e) => setEditForm(f => ({ ...f, beneficios: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setEditId(null)}>Cancelar</Button>
            <Button type="submit" loading={editSaving}>Guardar</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Eliminar plan">
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
