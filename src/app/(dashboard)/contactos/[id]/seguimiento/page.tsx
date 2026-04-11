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
    <div className="max-w-4xl animate-fade-in">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.push(`/contactos/${id}`)}
          className="text-[--text-muted] hover:text-[--text-primary] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-[--text-primary]">
          Seguimiento — {contacto?.nombre} {contacto?.apellido}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-[--bg-card] rounded-xl border border-[--border-primary] p-6 mb-8">
        <h2 className="text-sm font-semibold text-[--text-primary] mb-4">Agregar nota de seguimiento</h2>
        <div className="flex gap-4">
          <div className="w-48 flex-shrink-0">
            <DatePicker
              value={fechaSeguimiento}
              onChange={setFechaSeguimiento}
            />
          </div>
          <div className="flex-1">
            <Textarea
              required
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Escribir nota..."
              className="min-h-[80px]"
            />
          </div>
        </div>
        <div className="mt-3">
          <Button type="submit" loading={saving}>
            + Agregar nota
          </Button>
        </div>
      </form>

      <h2 className="text-sm font-semibold text-[--text-primary] mb-4">Historial</h2>

      {seguimientos.length === 0 ? (
        <div className="bg-[--bg-card] rounded-xl border border-[--border-primary] p-6 text-center text-[--text-muted] text-sm">
          Sin seguimientos todavía
        </div>
      ) : (
        <div className="space-y-0">
          {seguimientos.map((s) => (
            <div key={s.id} className="flex gap-4 pb-6">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-[--accent] flex-shrink-0 mt-1" />
                <div className="w-px flex-1 bg-[--border-primary] mt-1" />
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-[--text-secondary]">
                    {new Date(s.fecha_seguimiento).toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-[--text-muted]">•</span>
                  <span className="text-sm font-medium text-[--accent]">
                    {s.usuario_creador
                      ? `${s.usuario_creador.nombre} ${s.usuario_creador.apellido}`
                      : ""}
                  </span>
                </div>
                <p className="text-sm text-[--text-secondary] whitespace-pre-wrap">{s.notas}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
