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
      <h1 className="text-2xl font-bold text-[--text-primary] mb-6">Catálogos &gt; Planes</h1>

      {/* Inline create form */}
      <form onSubmit={handleCreate} className="flex items-end gap-3 mb-6">
        <div className="flex-1">
          <label className="block text-sm font-medium text-[--text-secondary] mb-1.5">Nombre del plan</label>
          <input
            required
            value={form.nombre}
            onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
            placeholder="Nombre"
            className="w-full bg-[--bg-input] border border-[--border-primary] rounded-lg px-3.5 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:outline-none focus:ring-2 focus:ring-[--accent]/30 focus:border-[--accent] transition-all"
          />
        </div>
        <div className="w-40">
          <label className="block text-sm font-medium text-[--text-secondary] mb-1.5">Precio</label>
          <CurrencyInput required value={form.precio} onChange={(val) => setForm(f => ({ ...f, precio: val }))} />
        </div>
        <Button type="submit" loading={saving}>Agregar</Button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <p className="text-[--text-muted] col-span-3 text-center py-8">Cargando...</p>
        ) : planes.length === 0 ? (
          <p className="text-[--text-muted] col-span-3 text-center py-8">Sin planes</p>
        ) : (
          planes.map((plan) => (
            <div key={plan.id} className="bg-[--bg-card] rounded-xl border border-[--border-primary] p-5 hover:border-[--accent-border] transition-all duration-300">
              <h3 className="font-semibold text-[--text-primary] text-lg mb-2">{plan.nombre}</h3>
              <p className="text-2xl font-bold text-[--accent] mb-4">${Number(plan.precio).toLocaleString("es-AR")}</p>
              {plan.beneficios && (
                <div className="space-y-1.5 mb-4">
                  {plan.beneficios.split("\n").filter(Boolean).map((b, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-[--text-secondary]">
                      <svg className="w-4 h-4 text-[--accent] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {b}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditId(plan.id);
                    setEditForm({ nombre: plan.nombre, beneficios: plan.beneficios, precio: String(plan.precio) });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[--text-secondary] border border-[--border-primary] rounded-lg hover:bg-[--bg-elevated] transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => setDeleteId(plan.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[--danger] border border-red-500/20 rounded-lg hover:bg-[--danger-soft] transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={!!editId} onClose={() => setEditId(null)} title="Editar plan">
        <form onSubmit={handleEdit} className="space-y-4">
          <Input label="Nombre" required value={editForm.nombre} onChange={(e) => setEditForm(f => ({ ...f, nombre: e.target.value }))} />
          <CurrencyInput label="Precio" required value={editForm.precio} onChange={(val) => setEditForm(f => ({ ...f, precio: val }))} />
          <Textarea label="Beneficios" required value={editForm.beneficios} onChange={(e) => setEditForm(f => ({ ...f, beneficios: e.target.value }))} placeholder="Un beneficio por línea" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setEditId(null)}>Cancelar</Button>
            <Button type="submit" loading={editSaving}>Guardar</Button>
          </div>
        </form>
      </Modal>

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
