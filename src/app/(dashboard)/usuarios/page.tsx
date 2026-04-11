"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Modal from "@/components/common/Modal";
import Toast from "@/components/common/Toast";
import type { Usuario } from "@/types";

function rolColor(rol: string) {
  switch (rol) {
    case "admin": return "bg-accent-soft text-accent border border-accent-border";
    case "sales": return "bg-blue-500/15 text-blue-400 border border-blue-500/20";
    case "manager": return "bg-purple-500/15 text-purple-400 border border-purple-500/20";
    default: return "bg-elevated text-muted border border-edge";
  }
}

function rolLabel(rol: string) {
  switch (rol) {
    case "admin": return "Admin";
    case "sales": return "Editor";
    case "manager": return "Viewer";
    default: return rol;
  }
}

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
        <h1 className="text-2xl font-bold text-heading">Usuarios</h1>
        <Button onClick={() => setShowCreate(true)}>+ Nuevo usuario</Button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-card rounded-xl border border-edge p-6 mb-6 space-y-4">
          <h2 className="text-sm font-semibold text-heading">Crear usuario</h2>
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

      <div className="bg-card rounded-xl border border-edge overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge">
              <th className="text-left px-4 py-3 font-medium text-muted">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-muted">Email</th>
              <th className="text-left px-4 py-3 font-medium text-muted">Rol</th>
              <th className="text-left px-4 py-3 font-medium text-muted">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-muted">Creado</th>
              <th className="text-right px-4 py-3 font-medium text-muted">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted">Cargando...</td></tr>
            ) : usuarios.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted">Sin usuarios</td></tr>
            ) : (
              usuarios.map((u) => {
                const isMe = session?.user?.id === u.id;
                return (
                  <tr key={u.id} className="border-b border-edge hover:bg-elevated transition-colors">
                    <td className="px-4 py-3 font-medium text-heading">
                      {u.nombre} {u.apellido}
                      {isMe && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-accent-soft text-accent border border-accent-border">vos</span>}
                    </td>
                    <td className="px-4 py-3 text-body">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${rolColor(u.rol)}`}>
                        {rolLabel(u.rol)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        u.estado
                          ? "bg-accent-soft text-accent border border-accent-border"
                          : "bg-elevated text-muted border border-edge"
                      }`}>
                        {u.estado ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(u.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isMe ? (
                        <span className="text-muted text-sm">—</span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleEstado(u.id, u.estado)}
                            className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors ${
                              u.estado
                                ? "text-danger border-red-500/20 hover:bg-danger-soft"
                                : "text-accent border-accent-border hover:bg-accent-soft"
                            }`}
                          >
                            {u.estado ? "Desactivar" : "Activar"}
                          </button>
                          <button
                            onClick={() => setDeleteId(u.id)}
                            className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger-soft transition-colors"
                            title="Eliminar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Eliminar usuario">
        <p className="text-sm text-body mb-4">¿Estás seguro? El usuario no podrá acceder más al CRM.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
