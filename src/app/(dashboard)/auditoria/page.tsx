"use client";

import { useEffect, useState, useCallback } from "react";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import DatePicker from "@/components/common/DatePicker";
import type { AuditLog, Usuario } from "@/types";

const TABLAS = [
  { value: "contactos", label: "Contactos" },
  { value: "clientes", label: "Clientes" },
  { value: "planes", label: "Planes" },
  { value: "estados_contacto", label: "Estados contacto" },
  { value: "etiquetas_negocio", label: "Etiquetas negocio" },
  { value: "seguimiento_contactos", label: "Seguimiento" },
  { value: "tickets", label: "Tickets" },
  { value: "usuarios", label: "Usuarios" },
  { value: "caja_gastos", label: "Gastos / Caja" },
];

const ACCIONES = [
  { value: "CREATE", label: "Creación" },
  { value: "UPDATE", label: "Actualización" },
  { value: "DELETE", label: "Eliminación" },
];

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 50;

  const [tabla, setTabla] = useState("");
  const [usuarioId, setUsuarioId] = useState("");
  const [accion, setAccion] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (tabla) params.set("tabla", tabla);
    if (usuarioId) params.set("usuario_id", usuarioId);
    if (accion) params.set("accion", accion);
    if (fechaDesde) params.set("fecha_desde", fechaDesde);
    if (fechaHasta) params.set("fecha_hasta", fechaHasta);

    const res = await fetch(`/api/auditoria?${params}`);
    const json = await res.json();
    setLogs(json.data || []);
    setCount(json.count || 0);
    setLoading(false);
  }, [page, tabla, usuarioId, accion, fechaDesde, fechaHasta]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    fetch("/api/usuarios").then(r => r.json()).then(j => setUsuarios(j.data || []));
  }, []);

  const totalPages = Math.ceil(count / limit);

  function accionColor(a: string) {
    switch (a) {
      case "CREATE": return "bg-accent-soft text-accent border border-accent-border";
      case "UPDATE": return "bg-blue-500/15 text-blue-400 border border-blue-500/20";
      case "DELETE": return "bg-red-500/15 text-red-400 border border-red-500/20";
      default: return "bg-elevated text-muted";
    }
  }

  function accionLabel(a: string) {
    switch (a) {
      case "CREATE": return "Creación";
      case "UPDATE": return "Actualización";
      case "DELETE": return "Eliminación";
      default: return a;
    }
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-heading mb-6">Auditoría</h1>

      {/* Inline filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select options={TABLAS} placeholder="Tabla" value={tabla} onChange={(e) => { setTabla(e.target.value); setPage(1); }} />
        <Select options={usuarios.map(u => ({ value: u.id, label: `${u.nombre} ${u.apellido}` }))} placeholder="Usuario" value={usuarioId} onChange={(e) => { setUsuarioId(e.target.value); setPage(1); }} />
        <Select options={ACCIONES} placeholder="Acción" value={accion} onChange={(e) => { setAccion(e.target.value); setPage(1); }} />
        <DatePicker placeholder="Desde" value={fechaDesde} onChange={(val) => { setFechaDesde(val); setPage(1); }} />
        <DatePicker placeholder="Hasta" value={fechaHasta} onChange={(val) => { setFechaHasta(val); setPage(1); }} />
      </div>

      <div className="bg-card rounded-xl border border-edge overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge">
              <th className="text-left px-4 py-3 font-medium text-muted">Fecha</th>
              <th className="text-left px-4 py-3 font-medium text-muted">Usuario</th>
              <th className="text-left px-4 py-3 font-medium text-muted">Tabla</th>
              <th className="text-left px-4 py-3 font-medium text-muted">Acción</th>
              <th className="text-left px-4 py-3 font-medium text-muted">Registro</th>
              <th className="text-right px-4 py-3 font-medium text-muted">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted">Cargando...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted">Sin registros de auditoría</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-edge hover:bg-elevated transition-colors">
                  <td className="px-4 py-3 text-body">
                    {new Date(log.created_at).toLocaleString("es-AR", {
                      day: "2-digit", month: "2-digit", year: "2-digit",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-heading">
                    {log.usuario ? `${log.usuario.nombre} ${log.usuario.apellido}` : log.usuario_id}
                  </td>
                  <td className="px-4 py-3 text-body">{log.tabla_afectada}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${accionColor(log.accion)}`}>
                      {accionLabel(log.accion)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">#{log.registro_id.slice(0, 4)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      className="p-1.5 rounded-md text-muted hover:text-heading hover:bg-elevated transition-colors"
                    >
                      <svg className={`w-4 h-4 transition-transform ${expandedId === log.id ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Expanded details rendered outside table for valid HTML */}
        {logs.map((log) => (
          expandedId === log.id && (
            <div key={`${log.id}-detail`} className="border-t border-edge bg-elevated px-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                {log.cambios_anteriores && (
                  <div>
                    <p className="text-xs font-semibold text-muted mb-1">Antes</p>
                    <pre className="text-xs bg-card border border-edge rounded-lg p-3 overflow-auto max-h-48 text-body">
                      {JSON.stringify(log.cambios_anteriores, null, 2)}
                    </pre>
                  </div>
                )}
                {log.cambios_nuevos && (
                  <div>
                    <p className="text-xs font-semibold text-muted mb-1">Después</p>
                    <pre className="text-xs bg-card border border-edge rounded-lg p-3 overflow-auto max-h-48 text-body">
                      {JSON.stringify(log.cambios_nuevos, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )
        ))}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-edge">
            <p className="text-sm text-muted">Página {page} de {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
