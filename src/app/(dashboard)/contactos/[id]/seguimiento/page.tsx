"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/common/Button";
import Textarea from "@/components/common/Textarea";
import Toast from "@/components/common/Toast";
import DatePicker from "@/components/common/DatePicker";
import type { Contacto, SeguimientoContacto } from "@/types";

export default function SeguimientoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [contacto, setContacto] = useState<Contacto | null>(null);
  const [seguimientos, setSeguimientos] = useState<SeguimientoContacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [notas, setNotas] = useState("");
  const [fechaSeguimiento, setFechaSeguimiento] = useState(
    new Date().toISOString().split("T")[0]
  );

  const fetchSeguimientos = useCallback(async () => {
    const res = await fetch(`/api/contactos/${id}/seguimiento`);
    const json = await res.json();
    setSeguimientos(json.data || []);
  }, [id]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/contactos/${id}`).then(r => r.json()),
      fetch(`/api/contactos/${id}/seguimiento`).then(r => r.json()),
    ]).then(([contactoRes, seguimientoRes]) => {
      setContacto(contactoRes.data);
      setSeguimientos(seguimientoRes.data || []);
      setLoading(false);
    });
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!notas.trim()) return;

    setSaving(true);
    const res = await fetch(`/api/contactos/${id}/seguimiento`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notas, fecha_seguimiento: fechaSeguimiento }),
    });

    setSaving(false);

    if (res.ok) {
      setNotas("");
      setFechaSeguimiento(new Date().toISOString().split("T")[0]);
      setToast({ message: "Seguimiento agregado", type: "success" });
      fetchSeguimientos();
    } else {
      const json = await res.json();
      setToast({ message: json.error || "Error", type: "error" });
    }
  }

  if (loading) {
    return <div className="text-[--text-muted] py-12 text-center">Cargando...</div>;
  }

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="mb-6">
        <button
          onClick={() => router.push(`/contactos/${id}`)}
          className="text-sm text-[--text-muted] hover:text-[--text-primary] mb-2 inline-block transition-colors"
        >
          &larr; Volver a {contacto?.nombre} {contacto?.apellido}
        </button>
        <h1 className="text-2xl font-bold text-[--text-primary]">
          Seguimiento - {contacto?.nombre} {contacto?.apellido}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-[--bg-card] rounded-xl border border-[--border-primary] p-6 mb-6">
        <h2 className="text-sm font-semibold text-[--text-primary] mb-3">Agregar nota de seguimiento</h2>
        <div className="space-y-3">
          <DatePicker
            label="Fecha"
            value={fechaSeguimiento}
            onChange={setFechaSeguimiento}
          />
          <Textarea
            label="Notas"
            required
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Escribí las notas del seguimiento..."
          />
          <div className="flex justify-end">
            <Button type="submit" loading={saving}>
              Agregar seguimiento
            </Button>
          </div>
        </div>
      </form>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[--text-primary]">
          Historial ({seguimientos.length})
        </h2>

        {seguimientos.length === 0 ? (
          <div className="bg-[--bg-card] rounded-xl border border-[--border-primary] p-6 text-center text-[--text-muted] text-sm">
            Sin seguimientos todavía
          </div>
        ) : (
          seguimientos.map((s) => (
            <div key={s.id} className="bg-[--bg-card] rounded-xl border border-[--border-primary] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[--text-primary]">
                  {new Date(s.fecha_seguimiento).toLocaleDateString("es-AR", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                <span className="text-xs text-[--text-muted]">
                  {s.usuario_creador
                    ? `${s.usuario_creador.nombre} ${s.usuario_creador.apellido}`
                    : ""}
                </span>
              </div>
              <p className="text-sm text-[--text-secondary] whitespace-pre-wrap">{s.notas}</p>
            </div>
          ))
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
