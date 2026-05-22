"use client";

import { useEffect, useState } from "react";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Toast from "@/components/common/Toast";
import type { MpCuenta } from "@/types";

const CRM_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

type Form = {
  nombre: string;
  descripcion: string;
  email_titular: string;
  access_token: string;
  public_key: string;
  webhook_secret: string;
  activo: boolean;
};

const EMPTY: Form = {
  nombre: "", descripcion: "", email_titular: "",
  access_token: "", public_key: "", webhook_secret: "",
  activo: true,
};

function formFromCuenta(c: MpCuenta): Form {
  return {
    nombre: c.nombre,
    descripcion: c.descripcion ?? "",
    email_titular: c.email_titular ?? "",
    access_token: c.access_token,
    public_key: c.public_key ?? "",
    webhook_secret: c.webhook_secret ?? "",
    activo: c.activo,
  };
}

type RevealedFields = Set<string>;

function SecretField({
  label, value, fieldKey, revealed, onReveal, onChange, placeholder, required,
}: {
  label: string; value: string; fieldKey: string;
  revealed: RevealedFields; onReveal: (k: string) => void;
  onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  const isRevealed = revealed.has(fieldKey);
  return (
    <div className="space-y-1">
      <label className="text-sm text-muted font-medium">{label}{required && <span className="text-red-400 ml-1">*</span>}</label>
      <div className="flex gap-2">
        <input
          type={isRevealed ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="flex-1 bg-input border border-edge rounded-lg px-3 py-2 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all font-mono"
        />
        <button
          type="button"
          onClick={() => onReveal(fieldKey)}
          className="px-3 py-2 rounded-lg text-xs text-muted hover:text-accent border border-edge hover:border-accent/50 transition-all whitespace-nowrap"
        >
          {isRevealed ? "Ocultar" : "Revelar"}
        </button>
      </div>
    </div>
  );
}

function WebhookUrl({ cuentaId }: { cuentaId: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${CRM_URL}/api/webhooks/mercadopago/${cuentaId}`;

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="bg-elevated rounded-lg border border-edge px-4 py-3 space-y-1">
      <p className="text-xs font-semibold text-muted uppercase tracking-wider">URL del webhook</p>
      <p className="text-xs text-body mb-1">Configurá esta URL en el panel de developers de MercadoPago para esta cuenta.</p>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-accent truncate">{url}</span>
        <button
          type="button"
          onClick={copy}
          className="flex-shrink-0 text-xs text-muted hover:text-accent transition-colors"
        >
          {copied ? <span className="text-accent font-medium">Copiado</span> : "Copiar"}
        </button>
      </div>
    </div>
  );
}

export default function MpCuentasPage() {
  const [cuentas, setCuentas] = useState<MpCuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [revealed, setRevealed] = useState<RevealedFields>(new Set());
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  async function load() {
    const res = await fetch("/api/mp-cuentas");
    const json = await res.json();
    setCuentas(json.data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function f(field: keyof Form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }));
  }

  function toggleReveal(key: string) {
    setRevealed(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function startEdit(c: MpCuenta) {
    setEditing(c.id);
    setShowCreate(false);
    setRevealed(new Set());
    setForm(formFromCuenta(c));
  }

  function cancelEdit() {
    setEditing(null);
    setRevealed(new Set());
    setForm(EMPTY);
  }

  async function handleSave(e: React.FormEvent, id?: string) {
    e.preventDefault();
    setSaving(true);
    const url = id ? `/api/mp-cuentas/${id}` : "/api/mp-cuentas";
    const res = await fetch(url, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setToast({ message: json.error || "Error al guardar", type: "error" });
      return;
    }
    setToast({ message: id ? "Cuenta actualizada" : "Cuenta creada", type: "success" });
    cancelEdit();
    setShowCreate(false);
    load();
  }

  async function handleDelete(id: string, nombre: string) {
    if (!confirm(`¿Eliminar la cuenta "${nombre}"? Los clientes asignados quedarán sin cuenta MP.`)) return;
    setDeleting(id);
    const res = await fetch(`/api/mp-cuentas/${id}`, { method: "DELETE" });
    setDeleting(null);
    if (!res.ok) {
      const json = await res.json();
      setToast({ message: json.error || "Error al eliminar", type: "error" });
      return;
    }
    setToast({ message: "Cuenta eliminada", type: "success" });
    load();
  }

  function renderCuentaForm(id?: string) {
    return (
      <form onSubmit={e => handleSave(e, id)} className="space-y-6">
        {/* Identificación */}
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Identificación</p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre de la cuenta *"
              required
              value={form.nombre}
              onChange={f("nombre")}
              placeholder="Ej: Cuenta Principal"
            />
            <Input
              label="Email del titular"
              type="email"
              value={form.email_titular}
              onChange={f("email_titular")}
              placeholder="cuenta@empresa.com"
            />
          </div>
          <div className="mt-4">
            <Input
              label="Descripción"
              value={form.descripcion}
              onChange={f("descripcion")}
              placeholder="Notas opcionales sobre esta cuenta"
            />
          </div>
        </div>

        {/* Credenciales MP */}
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Credenciales MercadoPago</p>
          <p className="text-xs text-muted mb-4">
            Obtené estas claves desde{" "}
            <span className="text-accent">mercadopago.com.ar → Tu negocio → Credenciales</span>.
            Usá las de <span className="font-semibold text-body">Producción</span> para clientes reales.
          </p>
          <div className="space-y-4">
            <SecretField
              label="Access Token"
              fieldKey="access_token"
              value={form.access_token}
              revealed={revealed}
              onReveal={toggleReveal}
              onChange={v => setForm(p => ({ ...p, access_token: v }))}
              placeholder="APP_USR-..."
              required
            />
            <SecretField
              label="Public Key"
              fieldKey="public_key"
              value={form.public_key}
              revealed={revealed}
              onReveal={toggleReveal}
              onChange={v => setForm(p => ({ ...p, public_key: v }))}
              placeholder="APP_USR-..."
            />
          </div>
        </div>

        {/* Webhook */}
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Webhook</p>
          <p className="text-xs text-muted mb-4">
            En el panel de developers de MP, creá una notificación apuntando a la URL de abajo
            con los tópicos <span className="font-semibold text-body">preapproval</span> y{" "}
            <span className="font-semibold text-body">payment</span>. MP te da el Webhook Secret
            al guardar la configuración.
          </p>
          {id && <div className="mb-4"><WebhookUrl cuentaId={id} /></div>}
          {!id && (
            <div className="bg-elevated rounded-lg border border-edge px-4 py-3 mb-4">
              <p className="text-xs text-muted">La URL del webhook se mostrará una vez que guardes la cuenta.</p>
            </div>
          )}
          <SecretField
            label="Webhook Secret"
            fieldKey="webhook_secret"
            value={form.webhook_secret}
            revealed={revealed}
            onReveal={toggleReveal}
            onChange={v => setForm(p => ({ ...p, webhook_secret: v }))}
            placeholder="Pegá el secret que te da MP al configurar el webhook"
          />
        </div>

        {/* Estado */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`activo-${id ?? "new"}`}
            checked={form.activo}
            onChange={e => setForm(p => ({ ...p, activo: e.target.checked }))}
            className="rounded"
          />
          <label htmlFor={`activo-${id ?? "new"}`} className="text-sm text-body">Cuenta activa</label>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-edge">
          <Button
            variant="secondary"
            type="button"
            onClick={() => { cancelEdit(); setShowCreate(false); }}
          >
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {id ? "Guardar cambios" : "Crear cuenta"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Cuentas MercadoPago</h1>
          <p className="text-sm text-muted mt-1">
            Configurá las cuentas de MP para cobrar suscripciones. Cada cliente puede tener una cuenta asignada.
          </p>
        </div>
        {!showCreate && (
          <Button onClick={() => { setShowCreate(true); cancelEdit(); }}>
            + Nueva cuenta
          </Button>
        )}
      </div>

      {showCreate && (
        <div className="bg-card rounded-xl border border-edge p-6">
          <p className="text-sm font-semibold text-heading mb-5">Nueva cuenta</p>
          {renderCuentaForm()}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted py-8 text-center">Cargando...</p>
      ) : cuentas.length === 0 && !showCreate ? (
        <div className="bg-card rounded-xl border border-edge p-8 text-center">
          <p className="text-sm text-muted">No hay cuentas configuradas. Creá la primera para empezar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cuentas.map(cuenta => (
            <div key={cuenta.id} className="bg-card rounded-xl border border-edge p-6">
              {editing === cuenta.id ? (
                <>
                  <p className="text-sm font-semibold text-heading mb-5">Editando: {cuenta.nombre}</p>
                  {renderCuentaForm(cuenta.id)}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-heading">{cuenta.nombre}</p>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          cuenta.activo
                            ? "bg-accent-soft text-accent border-accent-border"
                            : "bg-elevated text-muted border-edge"
                        }`}>
                          {cuenta.activo ? "Activa" : "Inactiva"}
                        </span>
                      </div>
                      {cuenta.email_titular && (
                        <p className="text-xs text-muted">{cuenta.email_titular}</p>
                      )}
                      {cuenta.descripcion && (
                        <p className="text-xs text-muted mt-1">{cuenta.descripcion}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button variant="secondary" size="sm" onClick={() => startEdit(cuenta)}>Editar</Button>
                      <button
                        type="button"
                        disabled={deleting === cuenta.id}
                        onClick={() => handleDelete(cuenta.id, cuenta.nombre)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-40"
                      >
                        {deleting === cuenta.id ? "..." : "Eliminar"}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="bg-elevated rounded-lg border border-edge px-3 py-2">
                      <p className="text-muted mb-1">Access Token</p>
                      <p className="font-mono text-body">{cuenta.access_token ? "APP_USR-••••••••••••" : <span className="text-red-400">No configurado</span>}</p>
                    </div>
                    <div className="bg-elevated rounded-lg border border-edge px-3 py-2">
                      <p className="text-muted mb-1">Public Key</p>
                      <p className="font-mono text-body">{cuenta.public_key ? "APP_USR-••••••••••••" : <span className="text-muted italic">No configurado</span>}</p>
                    </div>
                    <div className="bg-elevated rounded-lg border border-edge px-3 py-2">
                      <p className="text-muted mb-1">Webhook Secret</p>
                      <p className="font-mono text-body">{cuenta.webhook_secret ? "••••••••••••••••" : <span className="text-muted italic">No configurado</span>}</p>
                    </div>
                  </div>

                  <WebhookUrl cuentaId={cuenta.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
