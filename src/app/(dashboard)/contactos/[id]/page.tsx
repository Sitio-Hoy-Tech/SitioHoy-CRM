"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Textarea from "@/components/common/Textarea";
import Toast from "@/components/common/Toast";
import PhoneInput from "@/components/common/PhoneInput";
import SearchableSelect from "@/components/common/SearchableSelect";
import DatePicker from "@/components/common/DatePicker";
import type { Contacto, EstadoContacto, EtiquetaNegocio } from "@/types";

const ORIGENES = [
  "WhatsApp", "Instagram", "Local", "Facebook", "Google", "X", "Email", "IA", "Llamada",
].map((o) => ({ value: o, label: o }));

export default function ContactoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [contacto, setContacto] = useState<Contacto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

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
    fecha_contacto: "",
    notas: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/contactos/${id}`).then(r => r.json()),
      fetch("/api/catalogos/estados-contacto").then(r => r.json()),
      fetch("/api/catalogos/etiquetas-negocio").then(r => r.json()),
    ]).then(([contactoRes, estadosRes, etiquetasRes]) => {
      const c = contactoRes.data;
      if (c) {
        setContacto(c);
        setForm({
          nombre: c.nombre || "",
          apellido: c.apellido || "",
          email: c.email || "",
          telefono: c.telefono || "",
          estado_id: c.estado_id || "",
          etiqueta_negocio_id: c.etiqueta_negocio_id || "",
          origen: c.origen || "",
          fecha_contacto: c.fecha_contacto?.split("T")[0] || "",
          notas: c.notas || "",
        });
      }
      setEstados(estadosRes.data || []);
      setEtiquetas(etiquetasRes.data || []);
      setLoading(false);
    });
  }, [id]);

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch(`/api/contactos/${id}`, {
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

    setContacto(json.data);
    setEditing(false);
    setToast({ message: "Contacto actualizado", type: "success" });
  }

  if (loading) {
    return <div className="text-muted py-12 text-center">Cargando...</div>;
  }

  if (!contacto) {
    return <div className="text-muted py-12 text-center">Contacto no encontrado</div>;
  }

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="mb-6">
        <button
          onClick={() => router.push("/contactos")}
          className="text-sm text-muted hover:text-heading mb-2 inline-block transition-colors"
        >
          &larr; Volver a contactos
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-heading">
            {contacto.nombre} {contacto.apellido}
          </h1>
          <div className="flex gap-2">
            <Link href={`/contactos/${id}/seguimiento`}>
              <Button variant="secondary">Seguimiento</Button>
            </Link>
            {!editing && (
              <Button onClick={() => setEditing(true)}>Editar</Button>
            )}
          </div>
        </div>
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="bg-card rounded-xl border border-edge p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombre" required value={form.nombre} onChange={(e) => updateField("nombre", e.target.value)} />
            <Input label="Apellido" value={form.apellido} onChange={(e) => updateField("apellido", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
            <PhoneInput label="Teléfono" value={form.telefono} onChange={(val) => updateField("telefono", val)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SearchableSelect
              label="Estado" required
              options={estados.map(e => ({ value: e.id, label: e.nombre }))}
              placeholder="Seleccionar" value={form.estado_id}
              onChange={(val) => updateField("estado_id", val)}
              creatable onCreateOption={handleCreateEstado} isLoading={creatingEstado}
            />
            <SearchableSelect
              label="Etiqueta de negocio"
              options={etiquetas.map(e => ({ value: e.id, label: e.nombre }))}
              placeholder="Seleccionar" value={form.etiqueta_negocio_id}
              onChange={(val) => updateField("etiqueta_negocio_id", val)}
              creatable onCreateOption={handleCreateEtiqueta} isLoading={creatingEtiqueta}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SearchableSelect
              label="Origen" required options={ORIGENES}
              placeholder="Seleccionar origen" value={form.origen}
              onChange={(val) => updateField("origen", val)}
            />
            <DatePicker label="Fecha de contacto" value={form.fecha_contacto} onChange={(val) => updateField("fecha_contacto", val)} />
          </div>
          <Textarea label="Notas" value={form.notas} onChange={(e) => updateField("notas", e.target.value)} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setEditing(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Guardar cambios</Button>
          </div>
        </form>
      ) : (
        <div className="bg-card rounded-xl border border-edge p-6">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <dt className="text-sm text-muted">Nombre completo</dt>
              <dd className="text-sm font-medium text-heading">{contacto.nombre} {contacto.apellido}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Email</dt>
              <dd className="text-sm font-medium text-heading">{contacto.email || "-"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Teléfono</dt>
              <dd className="text-sm font-medium text-heading">{contacto.telefono || "-"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Estado</dt>
              <dd>
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-soft text-accent border border-accent-border">
                  {contacto.estado?.nombre}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Etiqueta de negocio</dt>
              <dd className="text-sm font-medium text-heading">{contacto.etiqueta_negocio?.nombre || "-"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Origen</dt>
              <dd className="text-sm font-medium text-heading">{contacto.origen}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Fecha de contacto</dt>
              <dd className="text-sm font-medium text-heading">
                {new Date(contacto.fecha_contacto).toLocaleDateString("es-AR")}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Creado por</dt>
              <dd className="text-sm font-medium text-heading">
                {contacto.usuario_creador ? `${contacto.usuario_creador.nombre} ${contacto.usuario_creador.apellido}` : "-"}
              </dd>
            </div>
            {contacto.notas && (
              <div className="col-span-2">
                <dt className="text-sm text-muted">Notas</dt>
                <dd className="text-sm text-heading mt-1 whitespace-pre-wrap">{contacto.notas}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
