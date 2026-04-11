"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Modal from "@/components/common/Modal";
import Toast from "@/components/common/Toast";
import type { Usuario } from "@/types";

export default function UsuariosPage() {
  const { data: session } = useSession();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ nombre: "", apellido: "", email: "", password: "", rol: "admin" });
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/usuarios");
    const json = await res.json();
    setUsuarios(json.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setSaving(false);
    if (res.ok) {
      setForm({ nombre: "", apellido: "", email: "", password: "", rol: "admin" });
      setShowCreate(false);
      setToast({ message: "Usuario creado", type: "success" });
      fetchUsuarios();
    } else {
      setToast({ message: json.error || "Error al crear", type: "error" });
    }
  }

  async function toggleEstado(id: string, estadoActual: boolean) {
    const res = await fetch(`/api/usuarios/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: !estadoActual }),
    });
    if (res.ok) {
      setToast({ message: `Usuario ${!estadoActual ? "activado" : "desactivado"}`, type: "success" });
      fetchUsuarios();
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const res = await fetch(`/api/usuarios/${deleteId}`, { method: "DELETE" });
    const json = await res.json();
    setDeleting(false);
    setDeleteId(null);
    if (res.ok) {
      setToast({ message: "Usuario eliminado", type: "success" });
      fetchUsuarios();
    } else {
      setToast({ message: json.error || "Error", type: "error" });
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[--text-primary]">Usuarios</h1>
          <p className="text-sm text-[--text-muted] mt-1">{usuarios.length} usuarios</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ Nuevo usuario</Button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-[--bg-card] rounded-xl border border-[--border-primary] p-6 mb-6 space-y-4">
          <h2 className="text-sm font-semibold text-[--text-primary]">Crear usuario</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombre" required value={form.nombre} onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))} />
            <Input label="Apellido" required value={form.apellido} onChange={(e) => setForm(f => ({ ...f, apellido: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
            <Input label="Contraseña" type="password" required value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres" />
          </div>
          <Select
            label="Rol" required
            options={[
              { value: "admin", label: "Administrador" },
              { value: "sales", label: "Ventas" },
              { value: "manager", label: "Manager" },
            ]}
            value={form.rol}
            onChange={(e) => setForm(f => ({ ...f, rol: e.target.value }))}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Crear usuario</Button>
          </div>
        </form>
      )}

      <div className="bg-[--bg-card] rounded-xl border border-[--border-primary] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[--border-primary] bg-[--bg-secondary]">
              <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Email</th>
              <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Rol</th>
              <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-[--text-muted]">Creado</th>
              <th className="text-right px-4 py-3 font-medium text-[--text-muted]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-[--text-muted]">Cargando...</td></tr>
            ) : usuarios.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-[--text-muted]">Sin usuarios</td></tr>
            ) : (
              usuarios.map((u) => {
                const isMe = session?.user?.id === u.id;
                return (
                  <tr key={u.id} className="border-b border-[--border-primary] hover:bg-[--bg-elevated] transition-colors">
                    <td className="px-4 py-3 font-medium text-[--text-primary]">
                      {u.nombre} {u.apellido}
                      {isMe && <span className="ml-2 text-xs text-[--accent]">(vos)</span>}
                    </td>
                    <td className="px-4 py-3 text-[--text-secondary]">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[--accent-soft] text-[--accent] border border-[--accent-border]">
                        {u.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.estado
                          ? "bg-[--accent-soft] text-[--accent] border border-[--accent-border]"
                          : "bg-[--bg-elevated] text-[--text-muted] border border-[--border-primary]"
                      }`}>
                        {u.estado ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[--text-muted]">
                      {new Date(u.created_at).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => toggleEstado(u.id, u.estado)} disabled={isMe}>
                          {u.estado ? "Desactivar" : "Activar"}
                        </Button>
                        {!isMe && (
                          <Button variant="ghost" size="sm" onClick={() => setDeleteId(u.id)} className="!text-[--danger] hover:!text-[--danger]">
                            Eliminar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Eliminar usuario">
        <p className="text-sm text-[--text-secondary] mb-4">¿Estás seguro? El usuario no podrá acceder más al CRM.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
