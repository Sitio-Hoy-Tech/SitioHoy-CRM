"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Modal from "@/components/common/Modal";
import Toast from "@/components/common/Toast";
import SearchableSelect from "@/components/common/SearchableSelect";
import DatePicker from "@/components/common/DatePicker";
import type { Cliente, Contacto, Plan, EtiquetaNegocio, MpCuenta } from "@/types";
import MpCuentaSelect from "@/components/common/MpCuentaSelect";

function CopyButton({ value, field, copied, onCopy }: {
  value: string;
  field: string;
  copied: string | null;
  onCopy: (value: string, field: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onCopy(value, field)}
      title="Copiar"
      className="ml-2 inline-flex items-center gap-1 text-xs text-muted hover:text-accent transition-colors"
    >
      {copied === field ? (
        <span className="text-accent font-medium">Copiado</span>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
        </svg>
      )}
    </button>
  );
}

type SHForm = {
  name: string; slug: string; url: string; plan: string; status: string;
  max_products: string; origin_name: string; origin_phone: string;
  origin_address: string; origin_city: string; origin_postal_code: string;
  origin_state: string;
  correo_argentino_customer_id: string; mp_access_token: string;
  mp_public_key: string; resend_api_key: string; envia_access_token: string;
};

const SH_PLAN_OPTIONS = [
  { value: "esencial", label: "Esencial" },
  { value: "emprendimiento", label: "Emprendimiento" },
  { value: "empresa", label: "Empresa" },
];

const SH_STATUS_OPTIONS = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
  { value: "suspended", label: "Suspendido" },
];

const EMPTY_SH_FORM: SHForm = {
  name: "", slug: "", url: "", plan: "", status: "", max_products: "",
  origin_name: "", origin_phone: "", origin_address: "", origin_city: "",
  origin_postal_code: "", origin_state: "",
  correo_argentino_customer_id: "", mp_access_token: "", mp_public_key: "",
  resend_api_key: "", envia_access_token: "",
};

function shFormFromData(d: Record<string, any>): SHForm {
  return {
    name: d.name || "",
    slug: d.slug || "",
    url: d.url || "",
    plan: d.plan || "",
    status: d.status || "",
    max_products: d.max_products != null ? String(d.max_products) : "",
    origin_name: d.origin_name || "",
    origin_phone: d.origin_phone || "",
    origin_address: d.origin_address || "",
    origin_city: d.origin_city || "",
    origin_postal_code: d.origin_postal_code || "",
    origin_state: d.origin_state || "",
    correo_argentino_customer_id: d.correo_argentino_customer_id || "",
    mp_access_token: d.mp_access_token || "",
    mp_public_key: d.mp_public_key || "",
    resend_api_key: d.resend_api_key || "",
    envia_access_token: d.envia_access_token || "",
  };
}


export default function ClienteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [etiquetas, setEtiquetas] = useState<EtiquetaNegocio[]>([]);

  const [form, setForm] = useState({
    nombre_empresa: "", contacto_id: "", dominio: "", plan_id: "",
    etiqueta_negocio_id: "", fecha_pago: "", tenant_id: "",
  });

  // SitioHoy platform state
  const [shTenant, setShTenant] = useState<Record<string, any> | null>(null);
  const [shLoading, setShLoading] = useState(false);
  const [shEditing, setShEditing] = useState(false);
  const [shSaving, setShSaving] = useState(false);
  const [shForm, setShForm] = useState<SHForm>(EMPTY_SH_FORM);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const [shUsers, setShUsers] = useState<Array<{
    id: string; email: string | null; created_at: string;
    last_sign_in_at: string | null; is_owner: boolean;
  }>>([]);
  const [shUsersLoading, setShUsersLoading] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ email: "", password: "" });
  const [createUserSaving, setCreateUserSaving] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState({ email: "", password: "" });
  const [editUserSaving, setEditUserSaving] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // MercadoPago
  const [mpLoading, setMpLoading] = useState(false);
  const [mpCuentas, setMpCuentas] = useState<MpCuenta[]>([]);
  const [mpCuentaSaving, setMpCuentaSaving] = useState(false);

  useEffect(() => {
    fetch("/api/mp-cuentas").then(r => r.json()).then(j => setMpCuentas(j.data || []));
  }, []);

  async function handleAsignarCuenta(mp_cuenta_id: string | null) {
    setMpCuentaSaving(true);
    const res = await fetch(`/api/clientes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, mp_cuenta_id: mp_cuenta_id || null }),
    });
    const json = await res.json();
    setMpCuentaSaving(false);
    if (!res.ok) {
      setToast({ message: json.error || "Error al asignar cuenta", type: "error" });
      return;
    }
    const refreshed = await fetch(`/api/clientes/${id}`).then(r => r.json());
    setCliente(refreshed.data);
    setToast({ message: "Cuenta MP actualizada", type: "success" });
  }

  async function handleCreateMpSubscription() {
    setMpLoading(true);
    const res = await fetch(`/api/clientes/${id}/mp-subscription`, { method: "POST" });
    const json = await res.json();
    setMpLoading(false);
    if (!res.ok) {
      setToast({ message: json.error || "Error al crear suscripción", type: "error" });
      return;
    }
    const refreshed = await fetch(`/api/clientes/${id}`).then(r => r.json());
    setCliente(refreshed.data);
    setToast({ message: "Suscripción creada. Copiá el link y enviáselo al cliente.", type: "success" });
  }

  // Borrado
  const [showSoftDelete, setShowSoftDelete] = useState(false);
  const [softDeleting, setSoftDeleting] = useState(false);
  const [showPermanentDelete, setShowPermanentDelete] = useState(false);
  const [permanentDeleteInput, setPermanentDeleteInput] = useState("");
  const [permanentDeleting, setPermanentDeleting] = useState(false);
  const permanentDeleteRef = useRef<HTMLInputElement>(null);

  function copyToClipboard(value: string, field: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  useEffect(() => {
    fetch(`/api/clientes/${id}`)
      .then(r => r.json())
      .then(json => {
        const c = json.data;
        if (c) {
          setCliente(c);
          setForm({
            nombre_empresa: c.nombre_empresa || "",
            contacto_id: c.contacto_id || "",
            dominio: c.dominio || "",
            plan_id: c.plan_id || "",
            etiqueta_negocio_id: c.etiqueta_negocio_id || "",
            fecha_pago: c.fecha_pago?.split("T")[0] || "",
            tenant_id: c.tenant_id || "",
          });
        }
        setLoading(false);
      });
  }, [id]);

  function loadShTenant(tenantId: string, contact?: Cliente["contacto"]) {
    setShLoading(true);
    fetch(`/api/sitiohoy/tenants/${tenantId}`)
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          setShTenant(json.data);
          setShForm(shFormFromData(json.data));

          // Auto-sync email/phone to CRM contact if missing
          const ownerEmail: string | null = json.data._owner_email ?? null;
          const ownerPhone: string | null = json.data._owner_phone ?? null;
          if (contact && (!contact.email || !contact.telefono) && (ownerEmail || ownerPhone)) {
            fetch(`/api/contactos/${contact.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                nombre: contact.nombre,
                apellido: contact.apellido || "",
                email: contact.email || ownerEmail || "",
                telefono: contact.telefono || ownerPhone || "",
                estado_id: contact.estado_id,
                etiqueta_negocio_id: contact.etiqueta_negocio_id || "",
                origen: contact.origen,
                fecha_contacto: contact.fecha_contacto || "",
                notas: contact.notas || "",
              }),
            })
              .then(r => r.ok ? fetch(`/api/clientes/${id}`).then(r => r.json()) : null)
              .then(refreshed => refreshed?.data && setCliente(refreshed.data))
              .catch(() => null);
          }
        }
        setShLoading(false);
      })
      .catch(() => setShLoading(false));
  }

  useEffect(() => {
    if (!cliente?.tenant_id) return;
    loadShTenant(cliente.tenant_id, cliente.contacto);
  }, [cliente?.tenant_id]);

  useEffect(() => {
    if (!shTenant || !cliente?.tenant_id) return;
    setShUsersLoading(true);
    fetch(`/api/sitiohoy/tenants/${cliente.tenant_id}/users`)
      .then(r => r.json())
      .then(json => { if (json.data) setShUsers(json.data); })
      .finally(() => setShUsersLoading(false));
  }, [shTenant, cliente?.tenant_id]);

  function loadCatalogos() {
    Promise.all([
      fetch("/api/contactos?limit=500").then(r => r.json()),
      fetch("/api/catalogos/planes").then(r => r.json()),
      fetch("/api/catalogos/etiquetas-negocio").then(r => r.json()),
    ]).then(([c, p, e]) => {
      setContactos(c.data || []);
      setPlanes(p.data || []);
      setEtiquetas(e.data || []);
    });
  }

  function startEditing() {
    loadCatalogos();
    setEditing(true);
  }

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function updateShField(field: keyof SHForm, value: string) {
    setShForm(prev => ({ ...prev, [field]: value }));
  }

  function toggleReveal(field: string) {
    setRevealed(prev => {
      const next = new Set(prev);
      next.has(field) ? next.delete(field) : next.add(field);
      return next;
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/clientes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setToast({ message: json.error || "Error al actualizar", type: "error" });
      return;
    }
    const refreshed = await fetch(`/api/clientes/${id}`).then(r => r.json());
    setCliente(refreshed.data);
    setEditing(false);
    setToast({ message: "Cliente actualizado", type: "success" });
    if (refreshed.data?.tenant_id) {
      loadShTenant(refreshed.data.tenant_id, refreshed.data.contacto);
    }
  }

  async function handleShSave(e: React.FormEvent) {
    e.preventDefault();
    setShSaving(true);
    const res = await fetch(`/api/sitiohoy/tenants/${cliente!.tenant_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...shForm,
        max_products: shForm.max_products !== "" ? Number(shForm.max_products) : null,
      }),
    });
    const json = await res.json();
    setShSaving(false);
    if (!res.ok) {
      setToast({ message: json.error || "Error al actualizar SitioHoy", type: "error" });
      return;
    }
    const merged = { ...(shTenant ?? {}), ...json.data };
    setShTenant(merged);
    setShForm(shFormFromData(merged));
    setShEditing(false);
    setRevealed(new Set());
    setToast({ message: "SitioHoy actualizado", type: "success" });
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateUserSaving(true);
    const res = await fetch(`/api/sitiohoy/tenants/${cliente!.tenant_id}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createUserForm),
    });
    const json = await res.json();
    setCreateUserSaving(false);
    if (!res.ok) {
      setToast({ message: json.error || "Error al crear usuario", type: "error" });
      return;
    }
    const refreshed = await fetch(`/api/sitiohoy/tenants/${cliente!.tenant_id}/users`).then(r => r.json());
    setShUsers(refreshed.data || []);
    setShowCreateUser(false);
    setCreateUserForm({ email: "", password: "" });
    setToast({ message: "Usuario creado", type: "success" });
  }

  async function handleDeleteUser(userId: string) {
    setDeletingUserId(userId);
    const res = await fetch(`/api/sitiohoy/tenants/${cliente!.tenant_id}/users/${userId}`, {
      method: "DELETE",
    });
    const json = await res.json();
    setDeletingUserId(null);
    if (!res.ok) {
      setToast({ message: json.error || "Error al eliminar usuario", type: "error" });
      return;
    }
    setShUsers(prev => prev.filter(u => u.id !== userId));
    setToast({ message: "Usuario eliminado", type: "success" });
  }

  async function handleEditUser(e: React.FormEvent) {
    e.preventDefault();
    setEditUserSaving(true);
    const body: { email?: string; password?: string } = {};
    if (editUserForm.email) body.email = editUserForm.email;
    if (editUserForm.password) body.password = editUserForm.password;
    const res = await fetch(`/api/sitiohoy/tenants/${cliente!.tenant_id}/users/${editingUserId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setEditUserSaving(false);
    if (!res.ok) {
      setToast({ message: json.error || "Error al actualizar usuario", type: "error" });
      return;
    }
    const refreshed = await fetch(`/api/sitiohoy/tenants/${cliente!.tenant_id}/users`).then(r => r.json());
    setShUsers(refreshed.data || []);
    setEditingUserId(null);
    setEditUserForm({ email: "", password: "" });
    setToast({ message: "Usuario actualizado", type: "success" });
  }

  async function handleSoftDelete() {
    setSoftDeleting(true);
    const res = await fetch(`/api/clientes/${id}`, { method: "DELETE" });
    setSoftDeleting(false);
    if (res.ok) {
      router.push("/clientes");
    } else {
      const json = await res.json();
      setToast({ message: json.error || "Error al archivar", type: "error" });
      setShowSoftDelete(false);
    }
  }

  async function handlePermanentDelete() {
    if (permanentDeleteInput.trim() !== cliente?.nombre_empresa.trim()) return;
    setPermanentDeleting(true);
    const res = await fetch(`/api/clientes/${id}/delete-permanent`, { method: "POST" });
    setPermanentDeleting(false);
    if (res.ok) {
      router.push("/clientes");
    } else {
      const json = await res.json();
      setToast({ message: json.error || "Error al eliminar", type: "error" });
      setShowPermanentDelete(false);
    }
  }

  if (loading) return <div className="text-muted py-12 text-center">Cargando...</div>;
  if (!cliente) return <div className="text-muted py-12 text-center">Cliente no encontrado</div>;

  function diasParaVencer() {
    if (!cliente?.fecha_vencimiento) return null;
    const hoy = new Date();
    const vence = new Date(cliente.fecha_vencimiento);
    return Math.ceil((vence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  }

  const dias = diasParaVencer();
  const stats = shTenant?._stats as {
    products: number; products_active: number;
    orders: number; revenue: number;
    orders_by_status: Record<string, number>;
  } | undefined;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <button onClick={() => router.push("/clientes")} className="text-sm text-muted hover:text-heading mb-2 inline-block transition-colors">
          &larr; Volver a clientes
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-heading">{cliente.nombre_empresa}</h1>
            <p className="text-sm text-muted flex items-center gap-1 flex-wrap">
              <span>{cliente.dominio}</span>
              <CopyButton value={cliente.dominio} field="dominio-header" copied={copied} onCopy={copyToClipboard} />
              <span>&middot;</span>
              <span>Tenant: <span className="font-mono">{cliente.tenant_id}</span></span>
              <CopyButton value={cliente.tenant_id} field="tenant-header" copied={copied} onCopy={copyToClipboard} />
            </p>
          </div>
          <div className="flex gap-2">
            {!editing && <Button onClick={startEditing}>Editar</Button>}
          </div>
        </div>
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="bg-card rounded-xl border border-edge p-6 space-y-5">
          <Input label="Nombre de la empresa" required value={form.nombre_empresa} onChange={(e) => updateField("nombre_empresa", e.target.value)} />
          <SearchableSelect
            label="Contacto" required
            options={contactos.map(c => ({ value: c.id, label: `${c.nombre} ${c.apellido || ""}`.trim() }))}
            placeholder="Buscar contacto..." value={form.contacto_id}
            onChange={(val) => updateField("contacto_id", val)}
          />
          <Input label="Dominio" value={form.dominio} onChange={(e) => updateField("dominio", e.target.value)} placeholder="Ej: gymforce.com (opcional)" />
          <SearchableSelect
            label="Plan" required
            options={planes.map(p => ({ value: p.id, label: `${p.nombre} ($${Number(p.precio).toLocaleString("es-AR")})` }))}
            placeholder="Seleccionar" value={form.plan_id}
            onChange={(val) => updateField("plan_id", val)}
          />
          {(() => {
            const selectedPlan = planes.find(p => p.id === form.plan_id);
            const benefits = selectedPlan?.beneficios
              ?.split("\n").map(b => b.trim()).filter(Boolean) ?? [];
            if (!selectedPlan || benefits.length === 0) return null;
            return (
              <div className="bg-accent-soft border border-accent-border rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-accent mb-2">
                  {selectedPlan.nombre} · ${Number(selectedPlan.precio).toLocaleString("es-AR")}/mes
                </p>
                <ul className="space-y-1">
                  {benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-body">
                      <svg className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}
          <SearchableSelect
            label="Etiqueta de negocio" required
            options={etiquetas.map(e => ({ value: e.id, label: e.nombre }))}
            placeholder="Seleccionar" value={form.etiqueta_negocio_id}
            onChange={(val) => updateField("etiqueta_negocio_id", val)}
          />
          <DatePicker label="Fecha de pago" required value={form.fecha_pago} onChange={(val) => updateField("fecha_pago", val)} />
          <Input
            label="Tenant ID (SitioHoy)"
            placeholder="UUID del tenant en SitioHoy"
            value={form.tenant_id}
            onChange={(e) => updateField("tenant_id", e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setEditing(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Guardar cambios</Button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-3 gap-6 items-start">
          {/* ── LEFT (2/3): CRM + SitioHoy ── */}
          <div className="col-span-2 space-y-6">
            <div className="bg-card rounded-xl border border-edge p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  cliente.estado
                    ? "bg-accent-soft text-accent border border-accent-border"
                    : "bg-elevated text-muted border border-edge"
                }`}>
                  {cliente.estado ? "Activo" : "Inactivo"}
                </span>
                {dias !== null && (
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    dias <= 0 ? "bg-red-500/15 text-red-400 border border-red-500/20"
                    : dias <= 7 ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20"
                    : "bg-accent-soft text-accent border border-accent-border"
                  }`}>
                    {dias <= 0 ? "Vencido" : `Vence en ${dias} días`}
                  </span>
                )}
              </div>
              <dl className="grid grid-cols-3 gap-x-6 gap-y-4">
                <div>
                  <dt className="text-sm text-muted">Empresa</dt>
                  <dd className="text-sm font-medium text-heading">{cliente.nombre_empresa}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Dominio</dt>
                  <dd className="text-sm font-medium text-heading flex items-center">
                    {cliente.dominio}
                    <CopyButton value={cliente.dominio} field="dominio" copied={copied} onCopy={copyToClipboard} />
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Etiqueta de negocio</dt>
                  <dd className="text-sm font-medium text-heading">{cliente.etiqueta_negocio?.nombre || "-"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Plan</dt>
                  <dd className="text-sm font-medium text-heading">
                    {cliente.plan?.nombre} — ${Number(cliente.plan?.precio || 0).toLocaleString("es-AR")}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Fecha de pago</dt>
                  <dd className="text-sm font-medium text-heading">
                    {new Date(cliente.fecha_pago).toLocaleDateString("es-AR")}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Fecha de vencimiento</dt>
                  <dd className="text-sm font-medium text-heading">
                    {cliente.fecha_vencimiento ? new Date(cliente.fecha_vencimiento).toLocaleDateString("es-AR") : "-"}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-sm text-muted">Tenant ID</dt>
                  <dd className="text-sm font-mono text-body flex items-center gap-1">
                    <span className="truncate max-w-[300px]" title={cliente.tenant_id}>{cliente.tenant_id}</span>
                    <CopyButton value={cliente.tenant_id} field="tenant_id" copied={copied} onCopy={copyToClipboard} />
                  </dd>
                </div>
              </dl>
            </div>
            {cliente.tenant_id && (
              shLoading ? (
                <div className="bg-card rounded-xl border border-edge p-6">
                  <p className="text-sm text-muted">Cargando plataforma SitioHoy...</p>
                </div>
              ) : shTenant ? (
                shEditing ? (
                  <form onSubmit={handleShSave} className="bg-card rounded-xl border border-edge p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-heading">SitioHoy — Editando</h2>
                      <div className="flex gap-2">
                        <Button variant="secondary" type="button" onClick={() => { setShEditing(false); setRevealed(new Set()); }}>Cancelar</Button>
                        <Button type="submit" loading={shSaving}>Guardar</Button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-xs font-semibold text-muted uppercase tracking-wider">Origen de envíos</p>
                      <div className="grid grid-cols-2 gap-4">
                        <Input label="Nombre de origen" value={shForm.origin_name} onChange={e => updateShField("origin_name", e.target.value)} />
                        <Input label="Teléfono de origen" value={shForm.origin_phone} onChange={e => updateShField("origin_phone", e.target.value)} />
                      </div>
                      <Input label="Dirección" value={shForm.origin_address} onChange={e => updateShField("origin_address", e.target.value)} />
                      <div className="grid grid-cols-3 gap-4">
                        <Input label="Ciudad" value={shForm.origin_city} onChange={e => updateShField("origin_city", e.target.value)} />
                        <Input label="Código postal" value={shForm.origin_postal_code} onChange={e => updateShField("origin_postal_code", e.target.value)} />
                        <Input label="Provincia" value={shForm.origin_state} onChange={e => updateShField("origin_state", e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-xs font-semibold text-muted uppercase tracking-wider">Correo Argentino</p>
                      <Input label="Customer ID" value={shForm.correo_argentino_customer_id} onChange={e => updateShField("correo_argentino_customer_id", e.target.value)} />
                    </div>
                    <div className="space-y-4">
                      <p className="text-xs font-semibold text-muted uppercase tracking-wider">Credenciales</p>
                      <Input label="MP Access Token" value={shForm.mp_access_token} onChange={e => updateShField("mp_access_token", e.target.value)} />
                      <Input label="MP Public Key" value={shForm.mp_public_key} onChange={e => updateShField("mp_public_key", e.target.value)} />
                      <Input label="Resend API Key" value={shForm.resend_api_key} onChange={e => updateShField("resend_api_key", e.target.value)} />
                      <Input label="Envia Access Token" value={shForm.envia_access_token} onChange={e => updateShField("envia_access_token", e.target.value)} />
                    </div>
                  </form>
                ) : (
                  <div className="bg-card rounded-xl border border-edge p-6 space-y-5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-heading">SitioHoy</h2>
                      <Button onClick={() => setShEditing(true)}>Editar credenciales</Button>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Información del sitio</p>
                      <dl className="grid grid-cols-3 gap-x-6 gap-y-3">
                        <div>
                          <dt className="text-sm text-muted">Nombre</dt>
                          <dd className="text-sm font-medium text-heading">{shTenant.name || "-"}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-muted">Slug</dt>
                          <dd className="text-sm font-mono text-heading flex items-center">
                            <span>{shTenant.slug || "-"}</span>
                            {shTenant.slug && <CopyButton value={shTenant.slug} field="sh-slug" copied={copied} onCopy={copyToClipboard} />}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm text-muted">Plan SitioHoy</dt>
                          <dd className="text-sm font-medium text-heading capitalize">{shTenant.plan || "-"}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-muted">Estado</dt>
                          <dd className="text-sm font-medium text-heading capitalize">{shTenant.status || "-"}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-muted">Máx. productos</dt>
                          <dd className="text-sm font-medium text-heading">{shTenant.max_products ?? "-"}</dd>
                        </div>
                        <div className="col-span-3">
                          <dt className="text-sm text-muted">URL</dt>
                          <dd className="text-sm text-heading flex items-center gap-2">
                            {shTenant.url ? (
                              <a href={shTenant.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline truncate max-w-[280px]">{shTenant.url}</a>
                            ) : "-"}
                            {shTenant.url && <CopyButton value={shTenant.url} field="sh-url" copied={copied} onCopy={copyToClipboard} />}
                            {shTenant.umami_url && (
                              <a href={shTenant.umami_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted hover:text-accent transition-colors border border-edge rounded px-1.5 py-0.5 ml-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                                Analytics
                              </a>
                            )}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {(shTenant.subscription_id || shTenant.subscription_status) && (() => {
                      const s = shTenant.subscription_status as string | null;
                      const isActive = s === "authorized" || s === "active";
                      const isPaused = s === "paused" || s === "pending";
                      return (
                        <div>
                          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Suscripción MP</p>
                          <dl className="grid grid-cols-3 gap-x-6 gap-y-3">
                            {s && (
                              <div>
                                <dt className="text-sm text-muted">Estado</dt>
                                <dd className="mt-0.5">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${isActive ? "bg-accent-soft text-accent border-accent-border" : isPaused ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" : "bg-red-500/15 text-red-400 border-red-500/20"}`}>{s}</span>
                                </dd>
                              </div>
                            )}
                            {shTenant.current_period_end && (
                              <div>
                                <dt className="text-sm text-muted">Período hasta</dt>
                                <dd className="text-sm font-medium text-heading">{new Date(shTenant.current_period_end as string).toLocaleDateString("es-AR")}</dd>
                              </div>
                            )}
                            {shTenant.subscription_id && (
                              <div className="col-span-3">
                                <dt className="text-sm text-muted">ID de suscripción</dt>
                                <dd className="text-sm font-mono text-body flex items-center gap-1">
                                  <span className="truncate max-w-[300px]">{shTenant.subscription_id as string}</span>
                                  <CopyButton value={shTenant.subscription_id as string} field="sh-sub-id" copied={copied} onCopy={copyToClipboard} />
                                </dd>
                              </div>
                            )}
                          </dl>
                        </div>
                      );
                    })()}

                    {(shTenant.origin_name || shTenant.origin_address || shTenant.origin_city) && (
                      <div>
                        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Origen de envíos</p>
                        <dl className="grid grid-cols-3 gap-x-6 gap-y-3">
                          {shTenant.origin_name && <div><dt className="text-sm text-muted">Nombre</dt><dd className="text-sm font-medium text-heading">{shTenant.origin_name}</dd></div>}
                          {shTenant.origin_phone && (
                            <div>
                              <dt className="text-sm text-muted">Teléfono</dt>
                              <dd className="text-sm text-heading flex items-center">
                                {shTenant.origin_phone}
                                <CopyButton value={shTenant.origin_phone} field="sh-origin-phone" copied={copied} onCopy={copyToClipboard} />
                              </dd>
                            </div>
                          )}
                          {shTenant.origin_address && (
                            <div className="col-span-3">
                              <dt className="text-sm text-muted">Dirección</dt>
                              <dd className="text-sm font-medium text-heading">
                                {shTenant.origin_address}{shTenant.origin_city && `, ${shTenant.origin_city}`}{shTenant.origin_state && `, ${shTenant.origin_state}`}{shTenant.origin_postal_code && ` (${shTenant.origin_postal_code})`}
                              </dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    )}

                    {(shTenant.correo_argentino_customer_id || shTenant.correo_argentino_token) && (() => {
                      const tokenExpiry = shTenant.correo_argentino_token_expires_at ? new Date(shTenant.correo_argentino_token_expires_at as string) : null;
                      const expiryDays = tokenExpiry ? Math.ceil((tokenExpiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
                      return (
                        <div>
                          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Correo Argentino</p>
                          <dl className="grid grid-cols-3 gap-x-6 gap-y-3">
                            {shTenant.correo_argentino_customer_id && (
                              <div>
                                <dt className="text-sm text-muted">Customer ID</dt>
                                <dd className="text-sm font-medium text-heading flex items-center">
                                  {shTenant.correo_argentino_customer_id as string}
                                  <CopyButton value={shTenant.correo_argentino_customer_id as string} field="sh-ca-customer" copied={copied} onCopy={copyToClipboard} />
                                </dd>
                              </div>
                            )}
                            {tokenExpiry && (
                              <div>
                                <dt className="text-sm text-muted">Token vence</dt>
                                <dd className="text-sm font-medium flex items-center gap-1.5">
                                  <span className={expiryDays !== null && expiryDays <= 0 ? "text-red-400" : expiryDays !== null && expiryDays <= 7 ? "text-yellow-400" : "text-heading"}>{tokenExpiry.toLocaleDateString("es-AR")}</span>
                                  {expiryDays !== null && expiryDays <= 0 && <span className="text-xs bg-red-500/15 text-red-400 border border-red-500/20 rounded-full px-1.5 py-0.5">Expirado</span>}
                                  {expiryDays !== null && expiryDays > 0 && expiryDays <= 7 && <span className="text-xs bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 rounded-full px-1.5 py-0.5">Vence en {expiryDays}d</span>}
                                </dd>
                              </div>
                            )}
                          </dl>
                        </div>
                      );
                    })()}

                    <div>
                      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Credenciales</p>
                      <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                        {([
                          { label: "MP Access Token", field: "mp_access_token" },
                          { label: "MP Public Key", field: "mp_public_key" },
                          { label: "Resend API Key", field: "resend_api_key" },
                          { label: "Envia Access Token", field: "envia_access_token" },
                          { label: "CA Token", field: "correo_argentino_token" },
                        ] as const).map(({ label, field }) => {
                          const value = shTenant[field] as string | null;
                          const isRevealed = revealed.has(field);
                          return (
                            <div key={field}>
                              <dt className="text-sm text-muted">{label}</dt>
                              <dd className="text-sm text-heading flex items-center gap-1.5 mt-0.5">
                                {value ? (
                                  <>
                                    <span className="font-mono text-xs truncate max-w-[180px]">{isRevealed ? value : "••••••••••••••••••••"}</span>
                                    <button type="button" onClick={() => toggleReveal(field)} className="text-xs text-muted hover:text-accent transition-colors whitespace-nowrap">
                                      {isRevealed ? "Ocultar" : "Revelar"}
                                    </button>
                                    {isRevealed && <CopyButton value={value} field={`sh-cred-${field}`} copied={copied} onCopy={copyToClipboard} />}
                                  </>
                                ) : (
                                  <span className="text-muted text-xs">No configurado</span>
                                )}
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                    </div>
                  </div>
                )
              ) : null
            )}

            {/* ── MercadoPago subscription card ── */}
            {(() => {
              const mpStatus = cliente.mp_status;
              const isAuthorized = mpStatus === "authorized";
              const isPending = mpStatus === "pending";
              const isCancelled = mpStatus === "cancelled" || mpStatus === "paused";
              const statusLabel = isAuthorized ? "Activa" : isPending ? "Pendiente de aprobación" : isCancelled ? "Cancelada / Pausada" : null;
              const statusColor = isAuthorized
                ? "bg-accent-soft text-accent border-accent-border"
                : isPending
                ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/20"
                : "bg-red-500/15 text-red-400 border-red-500/20";

              return (
                <div className="bg-card rounded-xl border border-edge p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-heading">Suscripción MercadoPago</h2>
                    {statusLabel && (
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
                        {statusLabel}
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-muted mb-1.5">Cuenta MP asignada</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <MpCuentaSelect
                          value={cliente.mp_cuenta_id}
                          onChange={handleAsignarCuenta}
                          cuentas={mpCuentas}
                          disabled={mpCuentaSaving}
                        />
                      </div>
                      {mpCuentaSaving && <span className="text-xs text-muted whitespace-nowrap">Guardando...</span>}
                    </div>
                  </div>

                  {cliente.mp_init_point ? (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(cliente.mp_init_point!, "mp-init-point")}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
                          copied === "mp-init-point"
                            ? "bg-accent/15 border-accent text-accent"
                            : "bg-accent/10 border-accent/30 text-accent hover:bg-accent/20 hover:border-accent/60"
                        }`}
                      >
                        {copied === "mp-init-point" ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            Link copiado
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                            </svg>
                            Copiar link de pago
                          </>
                        )}
                      </button>
                      <div className="bg-elevated rounded-lg border border-edge px-3 py-2">
                        <p className="text-xs text-muted mb-0.5">Link de pago</p>
                        <span className="text-xs font-mono text-body truncate block">{cliente.mp_init_point}</span>
                      </div>
                      {cliente.mp_subscription_id && (
                        <div>
                          <p className="text-xs text-muted mb-1">ID de suscripción</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-body truncate max-w-[360px]">{cliente.mp_subscription_id}</span>
                            <CopyButton value={cliente.mp_subscription_id} field="mp-sub-id" copied={copied} onCopy={copyToClipboard} />
                          </div>
                        </div>
                      )}
                      <Button variant="secondary" size="sm" loading={mpLoading} onClick={handleCreateMpSubscription}>
                        Regenerar link de pago
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted">No hay suscripción activa. Creá una para obtener el link de pago y enviárselo al cliente.</p>
                      <Button loading={mpLoading} onClick={handleCreateMpSubscription}>
                        Crear suscripción
                      </Button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* ── RIGHT (1/3): stats, contacto, plan, usuarios, peligro ── */}
          <div className="space-y-6">
            {stats && (
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-card rounded-lg border border-edge p-3 text-center">
                  <p className="text-xl font-bold text-heading">{stats.products_active}<span className="text-sm font-normal text-muted">/{stats.products}</span></p>
                  <p className="text-xs text-muted mt-0.5">Productos</p>
                </div>
                <div className="bg-card rounded-lg border border-edge p-3 text-center">
                  <p className="text-xl font-bold text-heading">{stats.orders}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {stats.orders_by_status?.pending || stats.orders_by_status?.pendiente
                      ? <span className="text-yellow-400">{stats.orders_by_status.pending ?? stats.orders_by_status.pendiente} pend.</span>
                      : "Pedidos"}
                  </p>
                </div>
                <div className="bg-card rounded-lg border border-edge p-3 text-center">
                  <p className="text-xl font-bold text-accent">${Number(stats.revenue).toLocaleString("es-AR")}</p>
                  <p className="text-xs text-muted mt-0.5">Ingresos</p>
                </div>
              </div>
            )}

            {cliente.contacto && (
              <div className="bg-card rounded-xl border border-edge p-5">
                <h2 className="text-sm font-semibold text-heading mb-3">Contacto vinculado</h2>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-muted">Nombre</dt>
                    <dd className="text-sm font-medium">
                      <Link href={`/contactos/${cliente.contacto.id}`} className="text-accent hover:underline">
                        {cliente.contacto.nombre} {cliente.contacto.apellido || ""}
                      </Link>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted">Email</dt>
                    <dd className="text-sm text-heading flex items-center">
                      {cliente.contacto.email || "-"}
                      {cliente.contacto.email && <CopyButton value={cliente.contacto.email} field="email" copied={copied} onCopy={copyToClipboard} />}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted">Teléfono</dt>
                    <dd className="text-sm text-heading flex items-center">
                      {cliente.contacto.telefono || "-"}
                      {cliente.contacto.telefono && <CopyButton value={cliente.contacto.telefono} field="telefono" copied={copied} onCopy={copyToClipboard} />}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {cliente.plan && (
              <div className="bg-card rounded-xl border border-edge p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-heading">{cliente.plan.nombre}</h2>
                  <span className="text-base font-bold text-accent">${Number(cliente.plan.precio).toLocaleString("es-AR")}/mes</span>
                </div>
                {cliente.plan.beneficios && (
                  <ul className="space-y-1.5">
                    {cliente.plan.beneficios.split("\n").map(b => b.trim()).filter(Boolean).map((b, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-body">
                        <svg className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Usuarios (se rellena junto con SitioHoy abajo) */}
            {shTenant && !shEditing && (
              <div className="bg-card rounded-xl border border-edge p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-heading">Usuarios</p>
                  <button
                    type="button"
                    onClick={() => { setShowCreateUser(true); setEditingUserId(null); setCreateUserForm({ email: "", password: "" }); }}
                    className="text-xs text-accent hover:underline"
                  >
                    + Agregar
                  </button>
                </div>
                {showCreateUser && (
                  <form onSubmit={handleCreateUser} className="mb-4 bg-elevated rounded-lg p-4 space-y-3 border border-edge">
                    <p className="text-xs font-semibold text-heading">Nuevo usuario</p>
                    <Input label="Email" type="email" required value={createUserForm.email} onChange={e => setCreateUserForm(prev => ({ ...prev, email: e.target.value }))} />
                    <Input label="Contraseña" type="password" required value={createUserForm.password} onChange={e => setCreateUserForm(prev => ({ ...prev, password: e.target.value }))} />
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" type="button" onClick={() => { setShowCreateUser(false); setCreateUserForm({ email: "", password: "" }); }}>Cancelar</Button>
                      <Button type="submit" loading={createUserSaving}>Crear</Button>
                    </div>
                  </form>
                )}
                {shUsersLoading ? (
                  <p className="text-xs text-muted">Cargando usuarios...</p>
                ) : shUsers.length === 0 ? (
                  <p className="text-xs text-muted">Sin usuarios registrados</p>
                ) : (
                  <ul className="space-y-2">
                    {shUsers.map(user => (
                      <li key={user.id} className="bg-elevated rounded-lg p-3 border border-edge">
                        {editingUserId === user.id ? (
                          <form onSubmit={handleEditUser} className="space-y-3">
                            <p className="text-xs text-muted font-mono truncate mb-1">{user.email}</p>
                            <Input label="Nuevo email" type="email" value={editUserForm.email} onChange={e => setEditUserForm(prev => ({ ...prev, email: e.target.value }))} />
                            <Input label="Nueva contraseña" type="password" value={editUserForm.password} onChange={e => setEditUserForm(prev => ({ ...prev, password: e.target.value }))} />
                            <div className="flex justify-end gap-2">
                              <Button variant="secondary" type="button" onClick={() => { setEditingUserId(null); setEditUserForm({ email: "", password: "" }); }}>Cancelar</Button>
                              <Button type="submit" loading={editUserSaving}>Guardar</Button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-heading font-mono truncate max-w-[160px]">{user.email || "-"}</p>
                              <p className="text-xs text-muted mt-0.5">
                                {user.is_owner && <span className="text-accent">Propietario · </span>}
                                {user.last_sign_in_at ? `Último: ${new Date(user.last_sign_in_at).toLocaleDateString("es-AR")}` : "Sin accesos"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => { setEditingUserId(user.id); setEditUserForm({ email: user.email || "", password: "" }); setShowCreateUser(false); }}
                                className="text-xs text-muted hover:text-accent transition-colors"
                              >
                                Editar
                              </button>
                              {!user.is_owner && (
                                <button
                                  type="button"
                                  disabled={deletingUserId === user.id}
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="text-xs text-muted hover:text-red-400 transition-colors disabled:opacity-40"
                                >
                                  {deletingUserId === user.id ? "..." : "Eliminar"}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="border border-red-500/20 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-red-400">Zona de peligro</h2>
              <div className="flex items-center justify-between py-3 border-b border-red-500/10">
                <div>
                  <p className="text-sm font-medium text-heading">Archivar cliente</p>
                  <p className="text-xs text-muted mt-0.5">Oculta el cliente del CRM.</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setShowSoftDelete(true)}>Archivar</Button>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-heading">Eliminar</p>
                  <p className="text-xs text-red-400 mt-0.5">Irreversible.</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowPermanentDelete(true); setPermanentDeleteInput(""); setTimeout(() => permanentDeleteRef.current?.focus(), 100); }}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors whitespace-nowrap"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: archivar (soft delete) */}
      <Modal open={showSoftDelete} onClose={() => setShowSoftDelete(false)} title="Archivar cliente">
        <p className="text-sm text-body mb-4">
          El cliente quedará archivado y no aparecerá en la lista. Podés restaurarlo más tarde desde la base de datos.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setShowSoftDelete(false)}>Cancelar</Button>
          <Button variant="danger" loading={softDeleting} onClick={handleSoftDelete}>Archivar</Button>
        </div>
      </Modal>

      {/* Modal: borrado permanente */}
      <Modal
        open={showPermanentDelete}
        onClose={() => { setShowPermanentDelete(false); setPermanentDeleteInput(""); }}
        title="Eliminar permanentemente"
      >
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-sm text-red-300 space-y-1">
            <p className="font-semibold text-red-400">Esta acción no se puede deshacer. Se eliminará:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs mt-2">
              <li>El cliente del CRM</li>
              {cliente?.tenant_id && (
                <>
                  <li>El tenant en SitioHoy</li>
                  <li>Todos los usuarios del tenant</li>
                  <li>Todos los productos, categorías y variantes</li>
                  <li>Todas las órdenes e ítems</li>
                  <li>Cupones, zonas de envío y mensajes de contacto</li>
                </>
              )}
            </ul>
          </div>

          <div>
            <p className="text-sm text-body mb-2">
              Para confirmar, escribí el nombre del cliente:{" "}
              <span className="font-semibold text-heading">{cliente?.nombre_empresa}</span>
            </p>
            <input
              ref={permanentDeleteRef}
              type="text"
              value={permanentDeleteInput}
              onChange={(e) => setPermanentDeleteInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && permanentDeleteInput.trim() === cliente?.nombre_empresa.trim()) handlePermanentDelete(); }}
              placeholder={cliente?.nombre_empresa}
              className="w-full bg-input border border-edge rounded-lg px-3 py-2 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 transition-all"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowPermanentDelete(false); setPermanentDeleteInput(""); }}>
              Cancelar
            </Button>
            <button
              type="button"
              disabled={permanentDeleteInput.trim() !== cliente?.nombre_empresa.trim() || permanentDeleting}
              onClick={handlePermanentDelete}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {permanentDeleting ? "Eliminando..." : "Eliminar para siempre"}
            </button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
