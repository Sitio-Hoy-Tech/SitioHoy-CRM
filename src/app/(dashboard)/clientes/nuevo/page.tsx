"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Toast from "@/components/common/Toast";
import SearchableSelect from "@/components/common/SearchableSelect";
import DatePicker from "@/components/common/DatePicker";
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

// ─── Steps config ─────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Cliente",       description: "Empresa y contacto"     },
  { label: "Plan",          description: "Plan y facturación"     },
  { label: "Acceso",        description: "Panel SitioHoy"         },
  { label: "Integraciones", description: "MP y Correo Argentino", optional: true },
  { label: "Resend",        description: "Email transaccional",   optional: true },
];

// ─── Vertical stepper ─────────────────────────────────────────────────────────

function VerticalStepper({ current }: { current: number }) {
  return (
    <nav>
      {STEPS.map((s, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-200 ${
              i < current   ? "bg-accent text-white"
              : i === current ? "bg-accent text-white shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_20%,transparent)]"
              : s.optional  ? "bg-elevated border-2 border-dashed border-edge/50 text-muted/50"
              : "bg-elevated border-2 border-edge text-muted"
            }`}>
              {i < current ? <CheckIcon /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-px flex-1 min-h-8 mt-1 transition-colors duration-300 ${i < current ? "bg-accent/50" : "bg-edge"}`} />
            )}
          </div>
          <div className={`pt-0.5 pb-7 ${i === STEPS.length - 1 ? "pb-0" : ""}`}>
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

  const [form, setForm] = useState({
    nombre_empresa: "", contacto_id: "", dominio: "",
    plan_id: "", etiqueta_negocio_id: "",
    fecha_pago: new Date().toISOString().split("T")[0],
    mp_cuenta_id: "" as string | null,
    email: "", password: "",
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

  const selectedPlan = planes.find(p => p.id === form.plan_id);

  const fechaVencimiento = form.fecha_pago
    ? new Date(new Date(form.fecha_pago + "T12:00:00").getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("es-AR")
    : "";

  function validate(): string | null {
    if (currentStep === 0) {
      if (!form.nombre_empresa.trim())  return "El nombre de la empresa es requerido";
      if (!form.contacto_id)            return "Seleccioná un contacto";
      if (!form.etiqueta_negocio_id)    return "Seleccioná una etiqueta de negocio";
    }
    if (currentStep === 1) {
      if (!form.plan_id)    return "Seleccioná un plan";
      if (!form.fecha_pago) return "La fecha de pago es requerida";
    }
    if (currentStep === 2) {
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
    setLoading(true);
    const res = await fetch("/api/clientes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, mp_cuenta_id: form.mp_cuenta_id || null }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setToast({ message: json.error || "Error al crear", type: "error" }); return; }
    router.push("/clientes");
  }

  // ─── Step content ───────────────────────────────────────────────────────────

  const steps = [

    /* 0 — Cliente */
    <div key="0" className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-heading">Datos del cliente</h2>
        <p className="text-sm text-muted mt-0.5">Información básica de la empresa.</p>
      </div>
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
        <div /> {/* spacer */}
      </div>
    </div>,

    /* 1 — Plan */
    <div key="1" className="space-y-5">
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
                {selectedPlan.nombre} — <span className="font-bold text-accent">${Number(selectedPlan.precio).toLocaleString("es-AR")}/mes</span>
              </p>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <DatePicker label="Fecha de pago" required
            value={form.fecha_pago} onChange={val => set("fecha_pago", val)}
          />
          <div>
            <label className="block text-sm font-medium text-body mb-1.5">Vencimiento</label>
            <div className="w-full border border-edge rounded-lg px-3.5 py-2.5 text-sm text-muted bg-elevated">
              {fechaVencimiento || "—"}
            </div>
            <p className="text-xs text-muted mt-1">30 días después del pago</p>
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
    </div>,

    /* 2 — Acceso */
    <div key="2" className="space-y-5">
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
    </div>,

    /* 3 — Integraciones */
    <div key="3" className="space-y-5">
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
          <div /> {/* spacer */}
        </div>
      </div>
    </div>,

    /* 4 — Resend */
    <div key="4" className="space-y-5">
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
    </div>,

  ];

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
          <VerticalStepper current={currentStep} />
        </div>

        {/* ── Form area ── */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-edge p-6">
            {steps[currentStep]}
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

            {currentStep < STEPS.length - 1 ? (
              <Button type="button" onClick={advance}>
                Continuar →
              </Button>
            ) : (
              <Button type="button" loading={loading} onClick={handleSubmit}>
                Crear Cliente
              </Button>
            )}
          </div>
        </div>

      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
