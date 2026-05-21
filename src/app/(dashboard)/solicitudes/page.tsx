"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTicketRefresh } from "@/stores/ticketStore";
import Select from "@/components/common/Select";
import FiltersBar from "@/components/common/FiltersBar";
import DatePicker from "@/components/common/DatePicker";
import Toast from "@/components/common/Toast";

type Solicitud = {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  phone: string | null;
  crm_phone: string | null;
  message: string;
  source: string | null;
  status: string | null;
  created_at: string;
  tenant: { id: string; name: string; origin_phone: string | null; contact_email: string | null } | null;
};

function StatusBadge({ status }: { status: string | null }) {
  if (status === "archived") {
    return (
      <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-soft text-accent border border-accent-border">
        Solucionado
      </span>
    );
  }
  if (status === "reopened") {
    return (
      <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
        Reabierto
      </span>
    );
  }
  if (status === "read") {
    return (
      <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
        En revisión
      </span>
    );
  }
  return (
    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
      Nuevo
    </span>
  );
}

export default function SolicitudesPage() {
  const router = useRouter();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchSolicitudes = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (source) params.set("source", source);
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);

    const res = await fetch(`/api/solicitudes?${params}`);
    const json = await res.json();
    setSolicitudes(json.data || []);
    setCount(json.count || 0);
    setLoading(false);
  }, [page, search, status, source, dateFrom, dateTo]);

  useEffect(() => { fetchSolicitudes(); }, [fetchSolicitudes]);
  useTicketRefresh(fetchSolicitudes);

  const totalPages = Math.ceil(count / limit);
  const from = count === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, count);
  const hasActiveFilters = !!(search || status || source || dateFrom || dateTo);

  const clearFilters = () => {
    setSearch(""); setStatus(""); setSource(""); setDateFrom(""); setDateTo(""); setPage(1);
  };

  const maxVisible = 5;
  const startPage = Math.max(1, Math.min(page - 2, totalPages - maxVisible + 1));
  const endPage = Math.min(totalPages, startPage + maxVisible - 1);
  const visiblePages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-heading">Tickets</h1>
          <p className="text-sm text-muted mt-0.5">Mensajes y tickets de clientes</p>
        </div>
      </div>

      <FiltersBar onClear={clearFilters} showClear={hasActiveFilters}>
        <div className="relative group">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            placeholder="Buscar nombre, email o mensaje..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className={`w-56 bg-input border rounded-lg pl-9 pr-3.5 py-2 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all ${
              search ? "border-accent/50 ring-1 ring-accent/20" : "border-edge"
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            options={[
              { value: "password_reset_request", label: "Cambio de contraseña" },
              { value: "support_billing", label: "Soporte / Facturación" },
            ]}
            placeholder="Origen"
            value={source}
            onChange={(e) => { setSource(e.target.value); setPage(1); }}
            className={`!py-2 !h-auto min-w-[180px] ${source ? "border-accent/50 ring-1 ring-accent/20" : ""}`}
          />
          <Select
            options={[
              { value: "new", label: "Nuevo" },
              { value: "read", label: "En revisión" },
              { value: "reopened", label: "Reabierto" },
              { value: "archived", label: "Solucionado" },
            ]}
            placeholder="Estado"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className={`!py-2 !h-auto min-w-[140px] ${status ? "border-accent/50 ring-1 ring-accent/20" : ""}`}
          />
          <DatePicker
            placeholder="Desde"
            value={dateFrom}
            onChange={(val) => { setDateFrom(val); setPage(1); }}
          />
          <DatePicker
            placeholder="Hasta"
            value={dateTo}
            onChange={(val) => { setDateTo(val); setPage(1); }}
          />
        </div>
      </FiltersBar>

      <div className="bg-card rounded-xl border border-edge overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge">
                <th className="text-left px-4 py-3 font-medium text-muted">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Teléfono</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Mensaje</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-muted">Cargando...</td></tr>
              ) : solicitudes.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-muted">No hay tickets</td></tr>
              ) : (
                solicitudes.map((s) => (
                  <tr key={s.id} className="border-b border-edge hover:bg-elevated transition-colors">
                    <td className="px-4 py-3 text-body whitespace-nowrap">
                      {new Date(s.created_at).toLocaleDateString("es-AR", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                      })}
                      <div className="text-xs text-muted">
                        {new Date(s.created_at).toLocaleTimeString("es-AR", {
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-heading">
                      {s.tenant?.name ?? <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 text-body">{s.name}</td>
                    <td className="px-4 py-3 text-body">
                      <a href={`mailto:${s.email}`} className="hover:text-accent transition-colors">
                        {s.email}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-body">{s.phone || s.tenant?.origin_phone || s.crm_phone || <span className="text-muted">—</span>}</td>
                    <td className="px-4 py-3 text-body max-w-[220px]">
                      <p className="truncate" title={s.message}>{s.message}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/solicitudes/${s.id}`)}
                        className="p-1.5 rounded-md text-muted hover:text-heading hover:bg-elevated transition-colors"
                        title="Ver detalle"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {count > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-edge">
            <p className="text-sm text-muted">
              Mostrando {from}–{to} de {count} tickets
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(1)}
                  className="px-2 py-1 text-sm text-muted hover:text-heading disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Primera página"
                >
                  «
                </button>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-2 py-1 text-sm text-muted hover:text-heading disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ‹
                </button>
                {startPage > 1 && <span className="px-1 text-muted text-sm">…</span>}
                {visiblePages.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      page === p ? "bg-accent text-white" : "text-muted hover:bg-elevated"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                {endPage < totalPages && <span className="px-1 text-muted text-sm">…</span>}
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-2 py-1 text-sm text-muted hover:text-heading disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ›
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(totalPages)}
                  className="px-2 py-1 text-sm text-muted hover:text-heading disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Última página"
                >
                  »
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
