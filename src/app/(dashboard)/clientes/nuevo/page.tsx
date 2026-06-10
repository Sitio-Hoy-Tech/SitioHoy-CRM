"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Toast from "@/components/common/Toast";
import SearchableSelect from "@/components/common/SearchableSelect";
import DatePicker from "@/components/common/DatePicker";
import CurrencyInput from "@/components/common/CurrencyInput";
import type { Contacto, Plan, EtiquetaNegocio, MpCuenta } from "@/types";
import MpCuentaSelect from "@/components/common/MpCuentaSelect";

// ─── Icons ────────────────────────────────────────────────────────────────────

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
  </svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ─── SecretInput ──────────────────────────────────────────────────────────────

function SecretInput({ label, value, onChange }: {
  label: string; value: string; onChange: (val: string) => void;
}) {
  function generate() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    onChange(btoa(Array.from(bytes, b => String.fromCharCode(b)).join("")));
  }
  return (
    <div>
      <label className="block text-sm font-medium text-body mb-1.5">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Generá o pegá una clave"
          className="flex-1 min-w-0 bg-input border border-edge rounded-lg px-3.5 py-2.5 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200 font-mono"
        />
        <button type="button" onClick={generate}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-edge bg-elevated text-sm text-muted hover:text-heading hover:border-accent transition-all duration-200 whitespace-nowrap flex-shrink-0">
          <RefreshIcon /> Generar
        </button>
      </div>
    </div>
  );
}

// ─── PasswordInput ────────────────────────────────────────────────────────────

function PasswordInput({ label, required, value, onChange, placeholder }: {
  label: string; required?: boolean; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-sm font-medium text-body mb-1.5">
        {label}{required && <span className="text-accent ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          required={required}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-input border border-edge rounded-lg px-3.5 py-2.5 pr-10 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200"
        />
        <button type="button" onClick={() => setShow(p => !p)} tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-heading transition-colors">
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}

// ─── TenantImportado (tarjeta de tenant encontrado) ───────────────────────────

type TenantSH = {
  id: string;
  name: string;
  slug: string;
  url: string | null;
  plan: string;
  status: string;
  _owner_email: string | null;
  _ya_importado: boolean;
};

function TenantCard({ tenant, onClear }: { tenant: TenantSH; onClear: () => void }) {
  return (
    <div className={`rounded-lg border px-4 py-3 flex items-start justify-between gap-3 ${
      tenant._ya_importado
        ? "bg-elevated border-edge"
        : "bg-accent-soft border-accent-border"
    }`}>
      <div className="space-y-0.5 min-w-0">
        <p className="text-sm font-semibold text-heading truncate">{tenant.name}</p>
        {tenant.url && <p className="text-xs text-muted truncate">{tenant.url}</p>}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-1.5 py-0.5 rounded bg-elevated border border-edge text-muted capitalize">{tenant.plan}</span>
          {tenant._owner_email && (
            <span className="text-xs text-muted">{tenant._owner_email}</span>
          )}
          {tenant._ya_importado && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400">
              Ya importado
            </span>
          )}
        </div>
      </div>
      <button type="button" onClick={onClear}
        className="text-muted hover:text-heading transition-colors flex-shrink-0 mt-0.5">
        <XIcon />
      </button>
    </div>
  );
}

// ─── Steps config ─────────────────────────────────────────────────────────────

const ALL_STEPS = [
  { label: "Cliente",       description: "Empresa y contacto",      key: "cliente"       },
  { label: "Plan",          description: "Plan y facturación",      key: "plan"          },
  { label: "Acceso",        description: "Panel SitioHoy",          key: "acceso"        },
  { label: "Integraciones", description: "MP y Correo Argentino",   key: "integraciones", optional: true },
  { label: "Resend",        description: "Email transaccional",     key: "resend",        optional: true },
];

// ─── Vertical stepper ─────────────────────────────────────────────────────────

function VerticalStepper({ steps, current }: { steps: typeof ALL_STEPS; current: number }) {
  return (
    <nav>
      {steps.map((s, i) => (
        <div key={s.key} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-200 ${
              i < current   ? "bg-accent text-white"
              : i === current ? "bg-accent text-white shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_20%,transparent)]"
              : s.optional  ? "bg-elevated border-2 border-dashed border-edge/50 text-muted/50"
              : "bg-elevated border-2 border-edge text-muted"
            }`}>
              {i < current ? <CheckIcon /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-px flex-1 min-h-8 mt-1 transition-colors duration-300 ${i < current ? "bg-accent/50" : "bg-edge"}`} />
            )}
          </div>
          <div className={`pt-0.5 pb-7 ${i === steps.length - 1 ? "pb-0" : ""}`}>
            <span className={`text-sm font-semibold transition-colors ${
              i === current ? "text-heading"
              : i < current ? "text-accent"
              : s.optional  ? "text-muted/50"
              : "text-muted"
            }`}>{s.label}</span>
            <p className={`text-xs mt-0.5 transition-colors ${i <= current ? "text-muted" : s.optional ? "text-muted/30" : "text-muted/50"}`}>
              {s.description}
            </p>
          </div>
        </div>
      ))}
    </nav>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NuevoClientePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [contactos, setContactos]   = useState<Contacto[]>([]);
  const [planes, setPlanes]         = useState<Plan[]>([]);
  const [etiquetas, setEtiquetas]   = useState<EtiquetaNegocio[]>([]);
  const [mpCuentas, setMpCuentas]   = useState<MpCuenta[]>([]);
  const [creatingPlan, setCreatingPlan]         = useState(false);
  const [creatingEtiqueta, setCreatingEtiqueta] = useState(false);

  // Importar tenant existente
  const [modoImportar, setModoImportar] = useState(false);
  const [tenantIdInput, setTenantIdInput] = useState("");
  const [buscandoTenant, setBuscandoTenant] = useState(false);
  const [tenantEncontrado, setTenantEncontrado] = useState<TenantSH | null>(null);

  const [form, setForm] = useState({
    nombre_empresa: "", contacto_id: "", dominio: "",
    plan_id: "", etiqueta_negocio_id: "",
    fecha_pago: new Date().toISOString().split("T")[0],
    pago_unico: false,
    precio_pago_unico: "",
    mp_cuenta_id: "" as string | null,
    email: "", password: "", revalidation_secret: "",
    mp_access_token: "", mp_public_key: "", correo_argentino_customer_id: "",
    resend_api_key: "", resend_from_email: "", resend_domain_verified: false,
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/contactos?limit=500").then(r => r.json()),
      fetch("/api/catalogos/planes").then(r => r.json()),
      fetch("/api/catalogos/etiquetas-negocio").then(r => r.json()),
      fetch("/api/mp-cuentas").then(r => r.json()),
    ]).then(([c, p, e, m]) => {
      setContactos(c.data || []);
      setPlanes(p.data || []);
      setEtiquetas(e.data || []);
      setMpCuentas((m.data || []).filter((x: MpCuenta) => x.activo));
    });
  }, []);

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleCreatePlan(nombre: string) {
    setCreatingPlan(true);
    const res = await fetch("/api/catalogos/planes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, precio: 0, beneficios: "" }),
    });
    const json = await res.json();
    setCreatingPlan(false);
    if (res.ok && json.data) { setPlanes(prev => [...prev, json.data]); set("plan_id", json.data.id); }
  }

  async function handleCreateEtiqueta(nombre: string) {
    setCreatingEtiqueta(true);
    const res = await fetch("/api/catalogos/etiquetas-negocio", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });
    const json = await res.json();
    setCreatingEtiqueta(false);
    if (res.ok && json.data) { setEtiquetas(prev => [...prev, json.data]); set("etiqueta_negocio_id", json.data.id); }
  }

  async function buscarTenant() {
    if (!tenantIdInput.trim()) return;
    setBuscandoTenant(true);
    setTenantEncontrado(null);
    const res = await fetch(`/api/sitiohoy/tenants?tenant_id=${encodeURIComponent(tenantIdInput.trim())}`);
    const json = await res.json();
    setBuscandoTenant(false);
    if (!res.ok) {
      setToast({ message: json.error || "Tenant no encontrado", type: "error" });
      return;
    }
    const tenant: TenantSH = json.data;
    setTenantEncontrado(tenant);
    // Prefill campos del form
    setForm(prev => ({
      ...prev,
      nombre_empresa: tenant.name || prev.nombre_empresa,
      dominio: tenant.url
        ? tenant.url.replace(/^https?:\/\//, "").replace(/\/$/, "")
        : prev.dominio,
      plan_id: (() => {
        const match = planes.find(p =>
          p.nombre.toLowerCase().includes(tenant.plan?.toLowerCase() || "")
        );
        return match ? match.id : prev.plan_id;
      })(),
    }));
  }

  function limpiarTenant() {
    setTenantEncontrado(null);
    setTenantIdInput("");
    setForm(prev => ({
      ...prev,
      nombre_empresa: "",
      dominio: "",
      plan_id: "",
    }));
  }

  function toggleModoImportar(val: boolean) {
    setModoImportar(val);
    if (!val) limpiarTenant();
    setCurrentStep(0);
  }

  // Pasos activos según el modo
  const activeSteps = modoImportar
    ? ALL_STEPS.filter(s => s.key !== "acceso" && s.key !== "integraciones" && s.key !== "resend")
    : ALL_STEPS;

  const currentStepKey = activeSteps[currentStep]?.key;

  const selectedPlan = planes.find(p => p.id === form.plan_id);

  const fechaVencimiento = form.fecha_pago
    ? new Date(new Date(form.fecha_pago + "T12:00:00").getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("es-AR")
    : "";

  function validate(): string | null {
    if (currentStepKey === "cliente") {
      if (!form.nombre_empresa.trim())  return "El nombre de la empresa es requerido";
      if (!form.contacto_id)            return "Seleccioná un contacto";
      if (!form.etiqueta_negocio_id)    return "Seleccioná una etiqueta de negocio";
      if (modoImportar && !tenantEncontrado) return "Buscá y seleccioná un tenant de SitioHoy para importar";
      if (modoImportar && tenantEncontrado?._ya_importado) return "Este tenant ya fue importado como cliente";
    }
    if (currentStepKey === "plan") {
      if (!form.plan_id)    return "Seleccioná un plan";
      if (!form.fecha_pago) return "La fecha de pago es requerida";
      if (form.pago_unico && !form.precio_pago_unico) return "Ingresá el precio del pago único";
    }
    if (currentStepKey === "acceso") {
      if (!form.email.trim())              return "El email es requerido";
      if (!form.password)                  return "La contraseña es requerida";
      if (form.password.length < 6)        return "La contraseña debe tener al menos 6 caracteres";
    }
    return null;
  }

  function advance() {
    const err = validate();
    if (err) { setToast({ message: err, type: "error" }); return; }
    setCurrentStep(s => s + 1);
  }

  async function handleSubmit() {
    const err = validate();
    if (err) { setToast({ message: err, type: "error" }); return; }
    setLoading(true);
    const payload: Record<string, unknown> = {
      ...form,
      mp_cuenta_id: form.mp_cuenta_id || null,
    };
    if (modoImportar && tenantEncontrado) {
      payload.existing_tenant_id = tenantEncontrado.id;
    }
    const res = await fetch("/api/clientes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setToast({ message: json.error || "Error al crear", type: "error" }); return; }
    router.push("/clientes");
  }

  // ─── Step content por key ───────────────────────────────────────────────────

  const stepContent: Record<string, React.ReactNode> = {

    cliente: (
      <div className="space-y-5">
        <div>
          <h2 className="text-base font-semibold text-heading">Datos del cliente</h2>
          <p className="text-sm text-muted mt-0.5">Información básica de la empresa.</p>
        </div>

        {/* Toggle importar vs nuevo */}
        <div className="flex items-center gap-1 p-1 bg-elevated rounded-lg border border-edge w-fit">
          <button
            type="button"
            onClick={() => toggleModoImportar(false)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
              !modoImportar ? "bg-card text-heading shadow-sm border border-edge" : "text-muted hover:text-heading"
            }`}
          >
            Nuevo cliente
          </button>
          <button
            type="button"
            onClick={() => toggleModoImportar(true)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
              modoImportar ? "bg-card text-heading shadow-sm border border-edge" : "text-muted hover:text-heading"
            }`}
          >
            Importar tenant existente
          </button>
        </div>

        {/* Buscador de tenant por ID */}
        {modoImportar && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-body mb-1.5">
                Tenant ID de SitioHoy <span className="text-accent ml-0.5">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tenantIdInput}
                  onChange={e => setTenantIdInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && buscarTenant()}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  disabled={!!tenantEncontrado}
                  className="flex-1 min-w-0 bg-input border border-edge rounded-lg px-3.5 py-2.5 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200 font-mono disabled:opacity-50"
                />
                {!tenantEncontrado && (
                  <button
                    type="button"
                    onClick={buscarTenant}
                    disabled={buscandoTenant || !tenantIdInput.trim()}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-edge bg-elevated text-sm text-muted hover:text-heading hover:border-accent transition-all duration-200 whitespace-nowrap flex-shrink-0 disabled:opacity-40"
                  >
                    {buscandoTenant ? (
                      <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    ) : (
                      <SearchIcon />
                    )}
                    Buscar
                  </button>
                )}
              </div>
            </div>
            {tenantEncontrado && (
              <TenantCard tenant={tenantEncontrado} onClear={limpiarTenant} />
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input label="Nombre de la empresa" required autoFocus
            value={form.nombre_empresa} onChange={e => set("nombre_empresa", e.target.value)}
            placeholder="Ej: Gym Force"
          />
          <Input label="Dominio"
            value={form.dominio} onChange={e => set("dominio", e.target.value)}
            placeholder="gymforce.com"
          />
        </div>
        <SearchableSelect label="Contacto" required
          options={contactos.map(c => ({ value: c.id, label: `${c.nombre} ${c.apellido || ""}`.trim() }))}
          placeholder="Buscar contacto por nombre..."
          value={form.contacto_id} onChange={val => set("contacto_id", val)}
        />
        <div className="grid grid-cols-2 gap-4">
          <SearchableSelect label="Etiqueta de negocio" required
            options={etiquetas.map(e => ({ value: e.id, label: e.nombre }))}
            placeholder="Seleccionar..."
            value={form.etiqueta_negocio_id} onChange={val => set("etiqueta_negocio_id", val)}
            creatable onCreateOption={handleCreateEtiqueta} isLoading={creatingEtiqueta}
          />
          <div />
        </div>
      </div>
    ),

    plan: (
      <div className="space-y-5">
        <div>
          <h2 className="text-base font-semibold text-heading">Plan y facturación</h2>
          <p className="text-sm text-muted mt-0.5">Elegí el plan y configurá la fecha de cobro.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <SearchableSelect label="Plan" required
              options={planes.map(p => ({ value: p.id, label: `${p.nombre} ($${Number(p.precio).toLocaleString("es-AR")}/mes)` }))}
              placeholder="Seleccionar plan..."
              value={form.plan_id} onChange={val => set("plan_id", val)}
              creatable onCreateOption={handleCreatePlan} isLoading={creatingPlan}
            />
            {selectedPlan && (
              <div className="bg-accent-soft rounded-lg border border-accent-border px-3.5 py-2.5 flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                </svg>
                <p className="text-sm text-heading">
                  {form.pago_unico ? (
                    <>{selectedPlan.nombre} — <span className="font-bold text-accent">{form.precio_pago_unico ? `$${Number(form.precio_pago_unico).toLocaleString("es-AR")}` : "$—"} (pago único)</span></>
                  ) : (
                    <>{selectedPlan.nombre} — <span className="font-bold text-accent">${Number(selectedPlan.precio).toLocaleString("es-AR")}/mes</span></>
                  )}
                </p>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pago_unico"
                  checked={form.pago_unico}
                  onChange={e => setForm(p => ({ ...p, pago_unico: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="pago_unico" className="text-sm text-body">Pago único</label>
              </div>
              <p className="text-xs text-muted mt-1">No es una suscripción mensual: no se incluye en el MRR.</p>
            </div>
            {form.pago_unico && (
              <CurrencyInput label="Precio del pago único" required
                value={form.precio_pago_unico}
                onChange={val => setForm(p => ({ ...p, precio_pago_unico: val }))}
                placeholder="Precio acordado con el cliente"
              />
            )}
          </div>
          <div className="space-y-3">
            <DatePicker label="Fecha de pago" required
              value={form.fecha_pago} onChange={val => set("fecha_pago", val)}
            />
            <div>
              <label className="block text-sm font-medium text-body mb-1.5">Vencimiento</label>
              <div className="w-full border border-edge rounded-lg px-3.5 py-2.5 text-sm text-muted bg-elevated">
                {form.pago_unico ? "Sin vencimiento" : fechaVencimiento || "—"}
              </div>
              <p className="text-xs text-muted mt-1">
                {form.pago_unico ? "Los pagos únicos no vencen" : "30 días después del pago"}
              </p>
            </div>
          </div>
        </div>
        {mpCuentas.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-body mb-1.5">Cuenta MercadoPago</label>
              <MpCuentaSelect value={form.mp_cuenta_id}
                onChange={id => setForm(p => ({ ...p, mp_cuenta_id: id }))}
                cuentas={mpCuentas}
              />
            </div>
          </div>
        )}
      </div>
    ),

    acceso: (
      <div className="space-y-5">
        <div>
          <h2 className="text-base font-semibold text-heading">Acceso al panel</h2>
          <p className="text-sm text-muted mt-0.5">Credenciales para que el cliente inicie sesión en SitioHoy.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Email" required type="email" autoFocus
            value={form.email} onChange={e => set("email", e.target.value)}
            placeholder="cliente@ejemplo.com"
          />
          <PasswordInput label="Contraseña" required
            value={form.password} onChange={e => set("password", e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
        </div>
        <SecretInput label="Revalidation Secret"
          value={form.revalidation_secret}
          onChange={val => set("revalidation_secret", val)}
        />
      </div>
    ),

    integraciones: (
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-heading">Integraciones</h2>
            <span className="text-xs px-1.5 py-0.5 rounded border border-edge text-muted bg-elevated">Opcional</span>
          </div>
          <p className="text-sm text-muted mt-0.5">Credenciales de MercadoPago y Correo Argentino para la tienda del cliente.</p>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">MercadoPago</p>
          <div className="grid grid-cols-2 gap-4">
            <PasswordInput label="Access Token"
              value={form.mp_access_token} onChange={e => set("mp_access_token", e.target.value)}
              placeholder="APP_USR-..."
            />
            <Input label="Public Key"
              value={form.mp_public_key} onChange={e => set("mp_public_key", e.target.value)}
              placeholder="APP_USR-..."
            />
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">Correo Argentino</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Customer ID"
              value={form.correo_argentino_customer_id} onChange={e => set("correo_argentino_customer_id", e.target.value)}
              placeholder="CA-..."
            />
            <div />
          </div>
        </div>
      </div>
    ),

    resend: (
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-heading">Email transaccional</h2>
            <span className="text-xs px-1.5 py-0.5 rounded border border-edge text-muted bg-elevated">Opcional</span>
          </div>
          <p className="text-sm text-muted mt-0.5">Configuración de Resend para el envío de emails desde la tienda del cliente.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <PasswordInput label="API Key de Resend"
            value={form.resend_api_key} onChange={e => set("resend_api_key", e.target.value)}
            placeholder="re_xxxxxxxxxxxx"
          />
        </div>
      </div>
    ),
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in">

      <div className="mb-6">
        <button type="button" onClick={() => router.back()}
          className="text-sm text-muted hover:text-heading mb-2 inline-block transition-colors">
          &larr; Volver a clientes
        </button>
        <h1 className="text-2xl font-bold text-heading">Nuevo Cliente</h1>
      </div>

      <div className="grid grid-cols-[200px_1fr] gap-6 items-start">

        {/* ── Stepper sidebar ── */}
        <div className="bg-card rounded-xl border border-edge p-5 sticky top-6">
          <VerticalStepper steps={activeSteps} current={currentStep} />
        </div>

        {/* ── Form area ── */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-edge p-6">
            {stepContent[currentStepKey]}
          </div>

          <div className="flex justify-between">
            {currentStep > 0 ? (
              <Button variant="secondary" type="button"
                onClick={() => setCurrentStep(s => s - 1)}>
                ← Atrás
              </Button>
            ) : (
              <Button variant="secondary" type="button" onClick={() => router.back()}>
                Cancelar
              </Button>
            )}

            {currentStep < activeSteps.length - 1 ? (
              <Button type="button" onClick={advance}>
                Continuar →
              </Button>
            ) : (
              <Button type="button" loading={loading} onClick={handleSubmit}>
                {modoImportar ? "Importar Cliente" : "Crear Cliente"}
              </Button>
            )}
          </div>
        </div>

      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
