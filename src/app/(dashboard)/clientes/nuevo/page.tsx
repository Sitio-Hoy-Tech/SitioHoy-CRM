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
  });

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
    <div className="max-w-2xl animate-fade-in">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-[--text-muted] hover:text-[--text-primary] mb-2 inline-block transition-colors"
        >
          &larr; Volver a clientes
        </button>
        <h1 className="text-2xl font-bold text-[--text-primary]">Nuevo cliente</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-[--bg-card] rounded-xl border border-[--border-primary] p-6 space-y-5">
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
          <div className="bg-[--bg-elevated] rounded-lg border border-[--border-primary] p-3">
            <p className="text-xs text-[--text-muted] mb-1">Precio del plan</p>
            <p className="text-lg font-bold text-[--accent]">${Number(selectedPlan.precio).toLocaleString("es-AR")}/mes</p>
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
            <label className="block text-sm font-medium text-[--text-secondary] mb-1.5">
              Fecha de vencimiento
            </label>
            <div className="w-full border border-[--border-primary] rounded-lg px-3.5 py-2.5 text-sm text-[--text-muted] bg-[--bg-elevated]">
              {fechaVencimiento || "Se calcula automáticamente"}
            </div>
            <p className="text-xs text-[--text-muted] mt-1">30 días después del pago</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Crear cliente
          </Button>
        </div>
      </form>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
