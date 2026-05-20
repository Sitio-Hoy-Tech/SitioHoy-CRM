"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/common/Button";
import Toast from "@/components/common/Toast";

type Tenant = {
  id: string;
  name: string;
  slug: string | null;
  url: string | null;
  plan: string | null;
  status: string | null;
  max_products: number | null;
  origin_name: string | null;
  origin_phone: string | null;
  origin_address: string | null;
  origin_city: string | null;
  origin_postal_code: string | null;
  origin_state: string | null;
  contact_email: string | null;
};

type Solicitud = {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  source: string | null;
  status: string | null;
  created_at: string;
  updated_at: string | null;
  tenant: Tenant | null;
  crm_cliente: { id: string; nombre_empresa: string } | null;
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  new:      { label: "Nuevo",        className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  read:     { label: "En revisión",  className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  reopened: { label: "Reabierto",    className: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  archived: { label: "Solucionado",  className: "bg-accent-soft text-accent border-accent-border" },
};

const SOURCE_LABELS: Record<string, string> = {
  password_reset_request: "Cambio de contraseña",
  support_billing: "Soporte / Facturación",
};

const TENANT_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  active:    { label: "Activo",     className: "bg-accent-soft text-accent border-accent-border" },
  inactive:  { label: "Inactivo",   className: "bg-elevated text-muted border-edge" },
  suspended: { label: "Suspendido", className: "bg-red-500/10 text-red-400 border-red-500/20" },
};

function StatusBadge({ status }: { status: string | null }) {
  const s = (status && STATUS_LABELS[status]) ? STATUS_LABELS[status] : STATUS_LABELS.new;
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.className}`}>
      {s.label}
    </span>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button type="button" onClick={copy} className="ml-1.5 text-xs text-muted hover:text-accent transition-colors">
      {copied ? <span className="text-accent">Copiado</span> : (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
        </svg>
      )}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted mb-0.5">{label}</dt>
      <dd className="text-sm text-heading">{children}</dd>
    </div>
  );
}

export default function SolicitudDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetch(`/api/solicitudes/${id}`)
      .then(r => r.json())
      .then(json => { setSolicitud(json.data || null); setLoading(false); });
  }, [id]);

  async function handleStatusChange(newStatus: string) {
    if (!solicitud) return;
    setResolving(true);
    const res = await fetch(`/api/solicitudes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setResolving(false);
    if (res.ok) {
      setSolicitud(prev => prev ? { ...prev, status: newStatus } : prev);
      if (newStatus === "reopened") setResetSent(false);
      const labels: Record<string, string> = {
        archived: "Ticket marcado como solucionado",
        reopened: "Ticket reabierto",
        read:     "Ticket puesto en revisión",
        new:      "Ticket marcado como nuevo",
      };
      setToast({ message: labels[newStatus] || "Estado actualizado", type: "success" });
    } else {
      setToast({ message: "Error al actualizar el estado", type: "error" });
    }
  }

  async function handleSendReset() {
    setSendingReset(true);
    const res = await fetch(`/api/solicitudes/${id}/reset-password`, { method: "POST" });
    setSendingReset(false);
    if (res.ok) {
      setResetSent(true);
      setToast({ message: "Email de recuperación enviado al cliente", type: "success" });
      if (solicitud?.status !== "archived") handleStatusChange("archived");
    } else {
      const json = await res.json();
      setToast({ message: json.error || "Error al enviar el email", type: "error" });
    }
  }

  if (loading) return <div className="text-muted py-12 text-center">Cargando...</div>;
  if (!solicitud) return <div className="text-muted py-12 text-center">Ticket no encontrado</div>;

  const isSolved = solicitud.status === "archived";
  const t = solicitud.tenant;
  const tenantStatus = t?.status && TENANT_STATUS_LABELS[t.status] ? TENANT_STATUS_LABELS[t.status] : null;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/solicitudes")}
          className="text-sm text-muted hover:text-heading mb-2 inline-block transition-colors"
        >
          &larr; Volver a tickets
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-heading">{solicitud.name}</h1>
              <StatusBadge status={solicitud.status} />
            </div>
            <p className="text-sm text-muted">
              {SOURCE_LABELS[solicitud.source ?? ""] ?? solicitud.source ?? "Sin origen"}
              {" · "}
              {new Date(solicitud.created_at).toLocaleString("es-AR", {
                day: "2-digit", month: "2-digit", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isSolved && solicitud.status !== "read" && (
              <Button variant="secondary" onClick={() => handleStatusChange("read")} loading={resolving}>
                Poner en revisión
              </Button>
            )}
            {isSolved ? (
              <Button variant="secondary" loading={resolving} onClick={() => handleStatusChange("reopened")}>
                Reabrir ticket
              </Button>
            ) : (
              <Button loading={resolving} onClick={() => handleStatusChange("archived")}>
                Marcar como solucionado
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 items-start">
        {/* ── LEFT: mensaje + remitente ── */}
        <div className="col-span-2 space-y-6">

          {/* Mensaje */}
          <div className="bg-card rounded-xl border border-edge p-6">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Mensaje</h2>
            <p className="text-body leading-relaxed whitespace-pre-wrap text-sm">{solicitud.message}</p>
          </div>

          {/* Remitente */}
          <div className="bg-card rounded-xl border border-edge p-6">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Remitente</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Field label="Nombre">{solicitud.name}</Field>
              <Field label="Email">
                <a href={`mailto:${solicitud.email}`} className="text-accent hover:underline">
                  {solicitud.email}
                </a>
                <CopyButton value={solicitud.email} />
              </Field>
              {solicitud.phone && (
                <Field label="Teléfono">
                  <a href={`tel:${solicitud.phone}`} className="text-accent hover:underline">
                    {solicitud.phone}
                  </a>
                  <CopyButton value={solicitud.phone} />
                </Field>
              )}
            </dl>
          </div>

          {/* Cliente SitioHoy */}
          {t && (
            <div className="bg-card rounded-xl border border-edge p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Información del cliente</h2>
                {solicitud.crm_cliente && (
                  <Link
                    href={`/clientes/${solicitud.crm_cliente.id}`}
                    className="text-xs text-accent hover:underline flex items-center gap-1"
                  >
                    Ver en CRM
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Link>
                )}
              </div>
              <dl className="grid grid-cols-3 gap-x-6 gap-y-4">
                <Field label="Nombre">{t.name}</Field>
                {t.slug && (
                  <Field label="Slug">
                    <span className="font-mono">{t.slug}</span>
                    <CopyButton value={t.slug} />
                  </Field>
                )}
                {t.plan && (
                  <Field label="Plan SitioHoy">
                    <span className="capitalize">{t.plan}</span>
                  </Field>
                )}
                {t.status && tenantStatus && (
                  <Field label="Estado del sitio">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${tenantStatus.className}`}>
                      {tenantStatus.label}
                    </span>
                  </Field>
                )}
                {t.max_products != null && (
                  <Field label="Máx. productos">{String(t.max_products)}</Field>
                )}
                {t.url && (
                  <div className="col-span-3">
                    <dt className="text-xs text-muted mb-0.5">URL del sitio</dt>
                    <dd className="text-sm">
                      <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline break-all">
                        {t.url}
                      </a>
                      <CopyButton value={t.url} />
                    </dd>
                  </div>
                )}
                {t.origin_phone && (
                  <Field label="Teléfono de contacto">
                    <a href={`tel:${t.origin_phone}`} className="text-accent hover:underline">{t.origin_phone}</a>
                    <CopyButton value={t.origin_phone} />
                  </Field>
                )}
                {t.contact_email && (
                  <Field label="Email de contacto">
                    <a href={`mailto:${t.contact_email}`} className="text-accent hover:underline">{t.contact_email}</a>
                    <CopyButton value={t.contact_email} />
                  </Field>
                )}
                {t.origin_name && <Field label="Nombre de origen">{t.origin_name}</Field>}
                {(t.origin_address || t.origin_city) && (
                  <div className="col-span-3">
                    <dt className="text-xs text-muted mb-0.5">Dirección</dt>
                    <dd className="text-sm text-heading">
                      {[t.origin_address, t.origin_city, t.origin_state, t.origin_postal_code && `(${t.origin_postal_code})`]
                        .filter(Boolean).join(", ")}
                    </dd>
                  </div>
                )}
                <div className="col-span-3">
                  <dt className="text-xs text-muted mb-0.5">Tenant ID</dt>
                  <dd className="text-sm font-mono text-muted flex items-center">
                    <span className="truncate max-w-[400px]" title={solicitud.tenant_id}>{solicitud.tenant_id}</span>
                    <CopyButton value={solicitud.tenant_id} />
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>

        {/* ── RIGHT: metadata + cambio de estado ── */}
        <div className="space-y-4">
          {/* Detalles del ticket */}
          <div className="bg-card rounded-xl border border-edge p-5">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Detalles</h2>
            <dl className="space-y-3">
              <Field label="Estado"><StatusBadge status={solicitud.status} /></Field>
              <Field label="Origen">
                {SOURCE_LABELS[solicitud.source ?? ""] ?? solicitud.source ?? "—"}
              </Field>
              <Field label="Fecha de creación">
                {new Date(solicitud.created_at).toLocaleString("es-AR", {
                  day: "2-digit", month: "2-digit", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </Field>
              {solicitud.updated_at && solicitud.updated_at !== solicitud.created_at && (
                <Field label="Última actualización">
                  {new Date(solicitud.updated_at).toLocaleString("es-AR", {
                    day: "2-digit", month: "2-digit", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </Field>
              )}
              <div>
                <dt className="text-xs text-muted mb-0.5">ID del ticket</dt>
                <dd className="text-xs font-mono text-muted flex items-center">
                  <span className="truncate" title={solicitud.id}>{solicitud.id}</span>
                  <CopyButton value={solicitud.id} />
                </dd>
              </div>
            </dl>
          </div>

          {/* Acción: cambio de contraseña */}
          {solicitud.source === "password_reset_request" && (
            <div className="bg-card rounded-xl border border-edge p-5">
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Cambio de contraseña</h2>
              <p className="text-xs text-muted mb-3">
                Enviá un link de recuperación al email del cliente. El ticket se marcará como solucionado automáticamente.
              </p>
              <Button
                onClick={handleSendReset}
                loading={sendingReset}
                disabled={resetSent || isSolved}
                className="w-full justify-center"
              >
                {resetSent || isSolved ? "Email enviado" : "Enviar link de recuperación"}
              </Button>
            </div>
          )}

          {/* Cambio de estado rápido */}
          <div className="bg-card rounded-xl border border-edge p-5">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Cambiar estado</h2>
            <div className="flex flex-col gap-1.5">
              {(["new", "read", "reopened", "archived"] as const).map(s => {
                const info = STATUS_LABELS[s];
                const isCurrent = solicitud.status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={isCurrent || resolving}
                    onClick={() => handleStatusChange(s)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm border transition-colors ${
                      isCurrent
                        ? "border-edge bg-elevated text-muted cursor-default"
                        : "border-edge hover:bg-elevated text-body hover:text-heading"
                    }`}
                  >
                    <span>{info.label}</span>
                    {isCurrent && (
                      <svg className="w-3.5 h-3.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
