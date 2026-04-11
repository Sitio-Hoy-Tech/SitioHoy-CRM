"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Toast from "@/components/common/Toast";
import SearchableSelect from "@/components/common/SearchableSelect";
import type { EtiquetaPlantilla } from "@/types";

export default function NuevaPlantillaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [etiquetas, setEtiquetas] = useState<EtiquetaPlantilla[]>([]);
  const [creatingEtiqueta, setCreatingEtiqueta] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    url_plantilla: "",
    etiqueta_plantilla_id: "",
  });

  useEffect(() => {
    fetch("/api/catalogos/etiquetas-plantillas").then(r => r.json()).then(j => setEtiquetas(j.data || []));
  }, []);

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleCreateEtiqueta(nombre: string) {
    setCreatingEtiqueta(true);
    const res = await fetch("/api/catalogos/etiquetas-plantillas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });
    const json = await res.json();
    setCreatingEtiqueta(false);
    if (res.ok && json.data) {
      setEtiquetas(prev => [...prev, json.data]);
      updateField("etiqueta_plantilla_id", json.data.id);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/plantillas", {
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

    router.push("/plantillas");
  }

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm text-[--text-muted] hover:text-[--text-primary] mb-2 inline-block transition-colors">
          &larr; Volver a plantillas
        </button>
        <h1 className="text-2xl font-bold text-[--text-primary]">Nueva plantilla</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-[--bg-card] rounded-xl border border-[--border-primary] p-6 space-y-5">
        <Input
          label="Nombre" required
          value={form.nombre}
          onChange={(e) => updateField("nombre", e.target.value)}
          placeholder="Nombre de la plantilla"
        />

        <Input
          label="URL de la plantilla" required
          value={form.url_plantilla}
          onChange={(e) => updateField("url_plantilla", e.target.value)}
          placeholder="https://ejemplo.com/plantilla"
        />

        <SearchableSelect
          label="Etiqueta"
          options={etiquetas.map(e => ({ value: e.id, label: e.nombre }))}
          placeholder="Sin etiqueta"
          value={form.etiqueta_plantilla_id}
          onChange={(val) => updateField("etiqueta_plantilla_id", val)}
          creatable
          onCreateOption={handleCreateEtiqueta}
          isLoading={creatingEtiqueta}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={() => router.back()}>Cancelar</Button>
          <Button type="submit" loading={loading}>Crear plantilla</Button>
        </div>
      </form>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
