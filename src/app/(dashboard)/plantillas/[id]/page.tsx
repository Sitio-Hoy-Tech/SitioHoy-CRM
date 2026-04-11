"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Toast from "@/components/common/Toast";
import SearchableSelect from "@/components/common/SearchableSelect";
import type { Plantilla, EtiquetaPlantilla } from "@/types";

export default function PlantillaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [plantilla, setPlantilla] = useState<Plantilla | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [etiquetas, setEtiquetas] = useState<EtiquetaPlantilla[]>([]);

  const [form, setForm] = useState({
    nombre: "",
    url_plantilla: "",
    etiqueta_plantilla_id: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/plantillas/${id}`).then(r => r.json()),
      fetch("/api/catalogos/etiquetas-plantillas").then(r => r.json()),
    ]).then(([plantillaRes, etiquetasRes]) => {
      const p = plantillaRes.data;
      if (p) {
        setPlantilla(p);
        setForm({
          nombre: p.nombre || "",
          url_plantilla: p.url_plantilla || "",
          etiqueta_plantilla_id: p.etiqueta_plantilla_id || "",
        });
      }
      setEtiquetas(etiquetasRes.data || []);
      setLoading(false);
    });
  }, [id]);

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch(`/api/plantillas/${id}`, {
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

    setPlantilla(json.data);
    setToast({ message: "Plantilla actualizada", type: "success" });
  }

  if (loading) return <div className="text-[--text-muted] py-12 text-center">Cargando...</div>;
  if (!plantilla) return <div className="text-[--text-muted] py-12 text-center">Plantilla no encontrada</div>;

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="mb-6">
        <button onClick={() => router.push("/plantillas")} className="text-sm text-[--text-muted] hover:text-[--text-primary] mb-2 inline-block transition-colors">
          &larr; Volver a plantillas
        </button>
        <h1 className="text-2xl font-bold text-[--text-primary]">Editar: {plantilla.nombre}</h1>
      </div>

      <form onSubmit={handleSave} className="bg-[--bg-card] rounded-xl border border-[--border-primary] p-6 space-y-5">
        <Input
          label="Nombre" required
          value={form.nombre}
          onChange={(e) => updateField("nombre", e.target.value)}
        />

        <Input
          label="URL de la plantilla" required
          value={form.url_plantilla}
          onChange={(e) => updateField("url_plantilla", e.target.value)}
          placeholder="https://ejemplo.com/plantilla"
        />

        {form.url_plantilla && (
          <div className="bg-[--bg-elevated] rounded-lg border border-[--border-primary] p-3">
            <a
              href={form.url_plantilla}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[--accent] text-sm hover:underline flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Abrir plantilla en nueva pestaña
            </a>
          </div>
        )}

        <SearchableSelect
          label="Etiqueta"
          options={etiquetas.map(e => ({ value: e.id, label: e.nombre }))}
          placeholder="Sin etiqueta"
          value={form.etiqueta_plantilla_id}
          onChange={(val) => updateField("etiqueta_plantilla_id", val)}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={() => router.push("/plantillas")}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar cambios</Button>
        </div>
      </form>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
