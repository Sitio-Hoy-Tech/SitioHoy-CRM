"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Toast from "@/components/common/Toast";
import SearchableSelect from "@/components/common/SearchableSelect";
import DatePicker from "@/components/common/DatePicker";
import CurrencyInput from "@/components/common/CurrencyInput";
import type { Contacto, Plan, Plantilla, EtiquetaNegocio } from "@/types";

export default function NuevoClientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [etiquetas, setEtiquetas] = useState<EtiquetaNegocio[]>([]);

  const [creatingPlan, setCreatingPlan] = useState(false);
  const [creatingEtiqueta, setCreatingEtiqueta] = useState(false);

  const [form, setForm] = useState({
    nombre_empresa: "",
    contacto_id: "",
    dominio: "",
    plan_id: "",
    plantilla_id: "",
    etiqueta_negocio_id: "",
    fecha_pago: new Date().toISOString().split("T")[0],
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/contactos?limit=500").then(r => r.json()),
      fetch("/api/catalogos/planes").then(r => r.json()),
      fetch("/api/plantillas").then(r => r.json()),
      fetch("/api/catalogos/etiquetas-negocio").then(r => r.json()),
    ]).then(([contactosRes, planesRes, plantillasRes, etiquetasRes]) => {
      setContactos(contactosRes.data || []);
      setPlanes(planesRes.data || []);
      setPlantillas(plantillasRes.data || []);
      setEtiquetas(etiquetasRes.data || []);
    });
  }, []);

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleCreatePlan(nombre: string) {
    setCreatingPlan(true);
    const res = await fetch("/api/catalogos/planes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, precio: 0, beneficios: "" }),
    });
    const json = await res.json();
    setCreatingPlan(false);
    if (res.ok && json.data) {
      setPlanes(prev => [...prev, json.data]);
      updateField("plan_id", json.data.id);
    }
  }

  async function handleCreateEtiqueta(nombre: string) {
    setCreatingEtiqueta(true);
    const res = await fetch("/api/catalogos/etiquetas-negocio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });
    const json = await res.json();
    setCreatingEtiqueta(false);
    if (res.ok && json.data) {
      setEtiquetas(prev => [...prev, json.data]);
      updateField("etiqueta_negocio_id", json.data.id);
    }
  }

  const fechaVencimiento = form.fecha_pago
    ? new Date(new Date(form.fecha_pago + "T12:00:00").getTime() + 30 * 24 * 60 * 60 * 1000)
        .toLocaleDateString("es-AR")
    : "";

  const selectedPlan = planes.find(p => p.id === form.plan_id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setToast({ message: json.error || "Error al crear", type: "error" });
      return;
    }

    router.push("/clientes");
  }

  return (
    <div className="max-w-4xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading">Nuevo Cliente</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-edge p-6 space-y-5">
        <Input
          label="Nombre de la empresa"
          required
          value={form.nombre_empresa}
          onChange={(e) => updateField("nombre_empresa", e.target.value)}
          placeholder="Ej: Gym Force"
        />

        <SearchableSelect
          label="Contacto"
          required
          options={contactos.map(c => ({
            value: c.id,
            label: `${c.nombre} ${c.apellido || ""}`.trim(),
          }))}
          placeholder="Buscar contacto por nombre..."
          value={form.contacto_id}
          onChange={(val) => updateField("contacto_id", val)}
        />

        <Input
          label="Dominio"
          required
          value={form.dominio}
          onChange={(e) => updateField("dominio", e.target.value)}
          placeholder="Ej: gymforce.com"
        />

        <div className="grid grid-cols-2 gap-4">
          <SearchableSelect
            label="Plan"
            required
            options={planes.map(p => ({
              value: p.id,
              label: `${p.nombre} ($${Number(p.precio).toLocaleString("es-AR")})`,
            }))}
            placeholder="Seleccionar plan"
            value={form.plan_id}
            onChange={(val) => updateField("plan_id", val)}
            creatable
            onCreateOption={handleCreatePlan}
            isLoading={creatingPlan}
          />
          <SearchableSelect
            label="Plantilla"
            required
            options={plantillas.map(p => ({
              value: p.id,
              label: p.nombre,
            }))}
            placeholder="Seleccionar plantilla"
            value={form.plantilla_id}
            onChange={(val) => updateField("plantilla_id", val)}
          />
        </div>

        <SearchableSelect
          label="Etiqueta de negocio"
          required
          options={etiquetas.map(e => ({ value: e.id, label: e.nombre }))}
          placeholder="Seleccionar etiqueta"
          value={form.etiqueta_negocio_id}
          onChange={(val) => updateField("etiqueta_negocio_id", val)}
          creatable
          onCreateOption={handleCreateEtiqueta}
          isLoading={creatingEtiqueta}
        />

        {selectedPlan && (
          <div className="bg-accent-soft rounded-lg border border-accent-border p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <p className="text-sm text-heading">
              Plan {selectedPlan.nombre}: <span className="font-bold text-accent">${Number(selectedPlan.precio).toLocaleString("es-AR")}/mes</span>
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <DatePicker
            label="Fecha de pago"
            required
            value={form.fecha_pago}
            onChange={(val) => updateField("fecha_pago", val)}
          />
          <div>
            <label className="block text-sm font-medium text-body mb-1.5">
              Fecha de vencimiento
            </label>
            <div className="w-full border border-edge rounded-lg px-3.5 py-2.5 text-sm text-muted bg-elevated">
              {fechaVencimiento || "Se calcula automáticamente"}
            </div>
            <p className="text-xs text-muted mt-1">30 días después del pago</p>
          </div>
        </div>

        <div className="border-t border-edge pt-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-heading mb-0.5">Acceso al panel SitioHoy</p>
            <p className="text-xs text-muted">Credenciales para que el cliente inicie sesión en su tienda.</p>
          </div>
          <Input
            label="Email"
            required
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="cliente@ejemplo.com"
          />
          <div>
            <label className="block text-sm font-medium text-body mb-1.5">
              Contraseña<span className="text-accent ml-0.5">*</span>
            </label>
            <div className="relative">
              <input
                required
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-input border border-edge rounded-lg px-3.5 py-2.5 pr-10 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-heading transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Crear Cliente
          </Button>
        </div>
      </form>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
