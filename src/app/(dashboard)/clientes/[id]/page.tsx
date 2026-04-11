"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Toast from "@/components/common/Toast";
import SearchableSelect from "@/components/common/SearchableSelect";
import DatePicker from "@/components/common/DatePicker";
import type { Cliente, Contacto, Plan, Plantilla, EtiquetaNegocio } from "@/types";

export default function ClienteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [etiquetas, setEtiquetas] = useState<EtiquetaNegocio[]>([]);

  const [form, setForm] = useState({
    nombre_empresa: "",
    contacto_id: "",
    dominio: "",
    plan_id: "",
    plantilla_id: "",
    etiqueta_negocio_id: "",
    fecha_pago: "",
  });

  useEffect(() => {
    fetch(`/api/clientes/${id}`)
      .then(r => r.json())
      .then(json => {
        const c = json.data;
        if (c) {
          setCliente(c);
          setForm({
            nombre_empresa: c.nombre_empresa || "",
            contacto_id: c.contacto_id || "",
            dominio: c.dominio || "",
            plan_id: c.plan_id || "",
            plantilla_id: c.plantilla_id || "",
            etiqueta_negocio_id: c.etiqueta_negocio_id || "",
            fecha_pago: c.fecha_pago?.split("T")[0] || "",
          });
        }
        setLoading(false);
      });
  }, [id]);

  function loadCatalogos() {
    Promise.all([
      fetch("/api/contactos?limit=500").then(r => r.json()),
      fetch("/api/catalogos/planes").then(r => r.json()),
      fetch("/api/plantillas").then(r => r.json()),
      fetch("/api/catalogos/etiquetas-negocio").then(r => r.json()),
    ]).then(([c, p, pl, e]) => {
      setContactos(c.data || []);
      setPlanes(p.data || []);
      setPlantillas(pl.data || []);
      setEtiquetas(e.data || []);
    });
  }

  function startEditing() {
    loadCatalogos();
    setEditing(true);
  }

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch(`/api/clientes/${id}`, {
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

    const refreshed = await fetch(`/api/clientes/${id}`).then(r => r.json());
    setCliente(refreshed.data);
    setEditing(false);
    setToast({ message: "Cliente actualizado", type: "success" });
  }

  if (loading) return <div className="text-[--text-muted] py-12 text-center">Cargando...</div>;
  if (!cliente) return <div className="text-[--text-muted] py-12 text-center">Cliente no encontrado</div>;

  function diasParaVencer() {
    if (!cliente?.fecha_vencimiento) return null;
    const hoy = new Date();
    const vence = new Date(cliente.fecha_vencimiento);
    return Math.ceil((vence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  }

  const dias = diasParaVencer();

  return (
    <div className="max-w-3xl animate-fade-in">
      <div className="mb-6">
        <button onClick={() => router.push("/clientes")} className="text-sm text-[--text-muted] hover:text-[--text-primary] mb-2 inline-block transition-colors">
          &larr; Volver a clientes
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[--text-primary]">{cliente.nombre_empresa}</h1>
            <p className="text-sm text-[--text-muted]">{cliente.dominio} &middot; Tenant: {cliente.tenant_id}</p>
          </div>
          <div className="flex gap-2">
            {!editing && <Button onClick={startEditing}>Editar</Button>}
          </div>
        </div>
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="bg-[--bg-card] rounded-xl border border-[--border-primary] p-6 space-y-5">
          <Input label="Nombre de la empresa" required value={form.nombre_empresa} onChange={(e) => updateField("nombre_empresa", e.target.value)} />
          <SearchableSelect
            label="Contacto" required
            options={contactos.map(c => ({ value: c.id, label: `${c.nombre} ${c.apellido || ""}`.trim() }))}
            placeholder="Buscar contacto..." value={form.contacto_id}
            onChange={(val) => updateField("contacto_id", val)}
          />
          <Input label="Dominio" required value={form.dominio} onChange={(e) => updateField("dominio", e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <SearchableSelect
              label="Plan" required
              options={planes.map(p => ({ value: p.id, label: `${p.nombre} ($${Number(p.precio).toLocaleString("es-AR")})` }))}
              placeholder="Seleccionar" value={form.plan_id}
              onChange={(val) => updateField("plan_id", val)}
            />
            <SearchableSelect
              label="Plantilla" required
              options={plantillas.map(p => ({ value: p.id, label: p.nombre }))}
              placeholder="Seleccionar" value={form.plantilla_id}
              onChange={(val) => updateField("plantilla_id", val)}
            />
          </div>
          <SearchableSelect
            label="Etiqueta de negocio" required
            options={etiquetas.map(e => ({ value: e.id, label: e.nombre }))}
            placeholder="Seleccionar" value={form.etiqueta_negocio_id}
            onChange={(val) => updateField("etiqueta_negocio_id", val)}
          />
          <DatePicker label="Fecha de pago" required value={form.fecha_pago} onChange={(val) => updateField("fecha_pago", val)} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setEditing(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Guardar cambios</Button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="bg-[--bg-card] rounded-xl border border-[--border-primary] p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                cliente.estado
                  ? "bg-[--accent-soft] text-[--accent] border border-[--accent-border]"
                  : "bg-[--bg-elevated] text-[--text-muted] border border-[--border-primary]"
              }`}>
                {cliente.estado ? "Activo" : "Inactivo"}
              </span>
              {dias !== null && (
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  dias <= 0 ? "bg-red-500/15 text-red-400 border border-red-500/20"
                  : dias <= 7 ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20"
                  : "bg-[--accent-soft] text-[--accent] border border-[--accent-border]"
                }`}>
                  {dias <= 0 ? "Vencido" : `Vence en ${dias} días`}
                </span>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <dt className="text-sm text-[--text-muted]">Empresa</dt>
                <dd className="text-sm font-medium text-[--text-primary]">{cliente.nombre_empresa}</dd>
              </div>
              <div>
                <dt className="text-sm text-[--text-muted]">Dominio</dt>
                <dd className="text-sm font-medium text-[--text-primary]">{cliente.dominio}</dd>
              </div>
              <div>
                <dt className="text-sm text-[--text-muted]">Plan</dt>
                <dd className="text-sm font-medium text-[--text-primary]">
                  {cliente.plan?.nombre} - ${Number(cliente.plan?.precio || 0).toLocaleString("es-AR")}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-[--text-muted]">Plantilla</dt>
                <dd className="text-sm font-medium text-[--text-primary]">{cliente.plantilla?.nombre || "-"}</dd>
              </div>
              <div>
                <dt className="text-sm text-[--text-muted]">Etiqueta de negocio</dt>
                <dd className="text-sm font-medium text-[--text-primary]">{cliente.etiqueta_negocio?.nombre || "-"}</dd>
              </div>
              <div>
                <dt className="text-sm text-[--text-muted]">Tenant ID</dt>
                <dd className="text-sm font-mono text-[--text-secondary]">{cliente.tenant_id}</dd>
              </div>
              <div>
                <dt className="text-sm text-[--text-muted]">Fecha de pago</dt>
                <dd className="text-sm font-medium text-[--text-primary]">
                  {new Date(cliente.fecha_pago).toLocaleDateString("es-AR")}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-[--text-muted]">Fecha de vencimiento</dt>
                <dd className="text-sm font-medium text-[--text-primary]">
                  {cliente.fecha_vencimiento ? new Date(cliente.fecha_vencimiento).toLocaleDateString("es-AR") : "-"}
                </dd>
              </div>
            </dl>
          </div>

          {cliente.contacto && (
            <div className="bg-[--bg-card] rounded-xl border border-[--border-primary] p-6">
              <h2 className="text-sm font-semibold text-[--text-primary] mb-3">Contacto vinculado</h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <dt className="text-sm text-[--text-muted]">Nombre</dt>
                  <dd className="text-sm font-medium">
                    <Link href={`/contactos/${cliente.contacto.id}`} className="text-[--accent] hover:underline">
                      {cliente.contacto.nombre} {cliente.contacto.apellido || ""}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-[--text-muted]">Email</dt>
                  <dd className="text-sm text-[--text-primary]">{cliente.contacto.email || "-"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-[--text-muted]">Teléfono</dt>
                  <dd className="text-sm text-[--text-primary]">{cliente.contacto.telefono || "-"}</dd>
                </div>
              </dl>
            </div>
          )}

          {cliente.plan && (
            <div className="bg-[--bg-card] rounded-xl border border-[--border-primary] p-6">
              <h2 className="text-sm font-semibold text-[--text-primary] mb-3">Plan: {cliente.plan.nombre}</h2>
              <p className="text-sm text-[--text-secondary] whitespace-pre-wrap">{cliente.plan.beneficios}</p>
              <p className="text-lg font-bold text-[--accent] mt-3">${Number(cliente.plan.precio).toLocaleString("es-AR")}/mes</p>
            </div>
          )}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
