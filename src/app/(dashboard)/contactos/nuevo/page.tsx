"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Textarea from "@/components/common/Textarea";
import Toast from "@/components/common/Toast";
import PhoneInput from "@/components/common/PhoneInput";
import SearchableSelect from "@/components/common/SearchableSelect";
import DatePicker from "@/components/common/DatePicker";
import type { EstadoContacto, EtiquetaNegocio } from "@/types";

const ORIGENES = [
  "WhatsApp", "Instagram", "Local", "Facebook", "Google", "X", "Email", "IA", "Llamada",
].map((o) => ({ value: o, label: o }));

export default function NuevoContactoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [estados, setEstados] = useState<EstadoContacto[]>([]);
  const [etiquetas, setEtiquetas] = useState<EtiquetaNegocio[]>([]);
  const [creatingEstado, setCreatingEstado] = useState(false);
  const [creatingEtiqueta, setCreatingEtiqueta] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    estado_id: "",
    etiqueta_negocio_id: "",
    origen: "",
    fecha_contacto: new Date().toISOString().split("T")[0],
    notas: "",
  });

  useEffect(() => {
    fetch("/api/catalogos/estados-contacto").then(r => r.json()).then(j => setEstados(j.data || []));
    fetch("/api/catalogos/etiquetas-negocio").then(r => r.json()).then(j => setEtiquetas(j.data || []));
  }, []);

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: "" }));
  }

  async function handleCreateEstado(nombre: string) {
    setCreatingEstado(true);
    const res = await fetch("/api/catalogos/estados-contacto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });
    const json = await res.json();
    setCreatingEstado(false);
    if (res.ok && json.data) {
      setEstados(prev => [...prev, json.data]);
      updateField("estado_id", json.data.id);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const res = await fetch("/api/contactos", {
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

    router.push("/contactos");
  }

  return (
    <div className="max-w-4xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[--text-primary]">Nuevo Contacto</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-[--bg-card] rounded-xl border border-[--border-primary] p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nombre"
            required
            value={form.nombre}
            onChange={(e) => updateField("nombre", e.target.value)}
            error={errors.nombre}
          />
          <Input
            label="Apellido"
            value={form.apellido}
            onChange={(e) => updateField("apellido", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
          />
          <PhoneInput
            label="Teléfono"
            value={form.telefono}
            onChange={(val) => updateField("telefono", val)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SearchableSelect
            label="Estado"
            required
            options={estados.map(e => ({ value: e.id, label: e.nombre }))}
            placeholder="Seleccionar estado"
            value={form.estado_id}
            onChange={(val) => updateField("estado_id", val)}
            error={errors.estado_id}
            creatable
            onCreateOption={handleCreateEstado}
            isLoading={creatingEstado}
          />
          <SearchableSelect
            label="Etiqueta de negocio"
            options={etiquetas.map(e => ({ value: e.id, label: e.nombre }))}
            placeholder="Seleccionar etiqueta"
            value={form.etiqueta_negocio_id}
            onChange={(val) => updateField("etiqueta_negocio_id", val)}
            creatable
            onCreateOption={handleCreateEtiqueta}
            isLoading={creatingEtiqueta}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SearchableSelect
            label="Origen"
            required
            options={ORIGENES}
            placeholder="Seleccionar origen"
            value={form.origen}
            onChange={(val) => updateField("origen", val)}
            error={errors.origen}
          />
          <DatePicker
            label="Fecha de contacto"
            value={form.fecha_contacto}
            onChange={(val) => updateField("fecha_contacto", val)}
          />
        </div>

        <Textarea
          label="Notas"
          value={form.notas}
          onChange={(e) => updateField("notas", e.target.value)}
          placeholder="Notas adicionales sobre el contacto..."
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Crear Contacto
          </Button>
        </div>
      </form>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
