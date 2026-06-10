import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import { Contacto, EtiquetaNegocio, Cliente } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Helper para tiempo relativo premium con ajuste de zona horaria (ARG -3)
  function getRelativeTimeString(dateString: string) {
    const d = new Date(dateString);
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (mins < 1) return "Justo ahora";
    if (mins < 60) return `Hace ${mins} min`;

    const timeStr = d.toLocaleTimeString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });

    if (hours < 24) {
      // Verificar si es el mismo día calendario en Argentina
      const dArg = new Date(d.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
      const nowArg = new Date(now.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
      if (dArg.getDate() === nowArg.getDate()) return `Hoy a las ${timeStr}`;
      return `Ayer a las ${timeStr}`;
    }

    if (days === 1) return `Ayer a las ${timeStr}`;
    if (days < 7) return `Hace ${days} días`;
    return d.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
  }

  // Helper para gradientes de avatar
  function getAvatarGradient(name: string) {
    const colors = [
      "from-blue-500 to-cyan-400",
      "from-purple-500 to-pink-400",
      "from-emerald-500 to-teal-400",
      "from-orange-500 to-yellow-400",
      "from-indigo-500 to-blue-400",
      "from-rose-500 to-red-400"
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  // Helper para iconos basados en palabras clave
  function getActivityIcon(note: string) {
    const low = (note || "").toLowerCase();
    if (low.includes("llama") || low.includes("tel")) return "phone";
    if (low.includes("reun") || low.includes("cita") || low.includes("zoom")) return "calendar";
    if (low.includes("mail") || low.includes("corr")) return "mail";
    if (low.includes("whats") || low.includes("msj")) return "message";
    return "default";
  }

  const [
    contactosRes,
    clientesRes,
    nuevosContactosRes,
    vencimientosRes,
    seguimientosRes,
    etiquetasRes,
    distribucionRes
  ] = await Promise.all([
    supabaseAdmin.from("contactos").select("id", { count: "exact" }).is("deleted_at", null),
    supabaseAdmin.from("clientes").select("id", { count: "exact" }).is("deleted_at", null),
    supabaseAdmin.from("contactos").select("id", { count: "exact" }).is("deleted_at", null).gt("created_at", sevenDaysAgo.toISOString()),
    supabaseAdmin.from("clientes").select("id, nombre_empresa, fecha_vencimiento").is("deleted_at", null).lte("fecha_vencimiento", sevenDaysFromNow.toISOString()).order("fecha_vencimiento", { ascending: true }),
    supabaseAdmin.from("audit_log").select(`*, usuario:usuarios(id, nombre, apellido)`).in("tabla_afectada", ["contactos", "clientes", "seguimiento_contactos", "contact_messages", "tickets", "caja_gastos"]).order("created_at", { ascending: false }).limit(5),
    supabaseAdmin.from("etiquetas_negocio").select("id, nombre").is("deleted_at", null),
    supabaseAdmin.from("contactos").select("etiqueta_negocio_id").is("deleted_at", null)
  ]);

  const totalContactos = contactosRes.count ?? 0;
  const totalClientes = clientesRes.count ?? 0;
  const nuevosEstaSemana = nuevosContactosRes.count ?? 0;
  const ultimosVencimientos = (vencimientosRes.data ?? []) as Pick<Cliente, "id" | "nombre_empresa" | "fecha_vencimiento">[];
  const actividadReciente = (seguimientosRes.data ?? []) as any[];
  const etiquetas = (etiquetasRes.data ?? []) as Pick<EtiquetaNegocio, "id" | "nombre">[];
  const contactosRaw = (distribucionRes.data ?? []) as Pick<Contacto, "etiqueta_negocio_id">[];

  const distribucionEtiquetas = etiquetas.map(et => ({
    nombre: et.nombre,
    cantidad: contactosRaw.filter(c => c.etiqueta_negocio_id === et.id).length
  })).sort((a, b) => b.cantidad - a.cantidad);

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-heading tracking-tight">Dashboard</h1>
          <p className="text-muted text-sm mt-1">Sincronización en tiempo real activa.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-full">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-[10px] text-accent font-bold uppercase tracking-widest">Live Connect</span>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link href="/contactos" className="glass rounded-xl p-6 hover:border-accent-border transition-all duration-300 group glass-hover relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-accent/10 transition-colors" />
          <div className="flex items-start justify-between relative z-10">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            {nuevosEstaSemana > 0 && (
              <span className="text-[10px] font-bold bg-accent/20 text-accent px-2 py-1 rounded-full">+{nuevosEstaSemana}</span>
            )}
          </div>
          <div className="mt-4 relative z-10">
            <p className="text-xs text-muted font-bold uppercase tracking-wider">Total Contactos</p>
            <p className="text-3xl font-bold text-heading mt-1">{totalContactos.toLocaleString("es-AR")}</p>
          </div>
        </Link>

        <Link href="/clientes" className="glass rounded-xl p-6 hover:border-blue-500/30 transition-all duration-300 group glass-hover relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-blue-500/10 transition-colors" />
          <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center relative z-10">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="mt-4 relative z-10">
            <p className="text-xs text-muted font-bold uppercase tracking-wider">Clientes Activos</p>
            <p className="text-3xl font-bold text-heading mt-1">{totalClientes.toLocaleString("es-AR")}</p>
          </div>
        </Link>

        <Link href="/contactos/nuevo" className="glass rounded-xl p-6 hover:scale-[1.02] transition-all duration-300 flex flex-col justify-between glass-hover group">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center text-accent group-hover:bg-accent/20 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v12m6-6H6" />
            </svg>
          </div>
          <div className="mt-4">
            <p className="text-base font-bold text-heading">Nuevo Lead</p>
            <p className="text-xs text-muted">Captura rápida</p>
          </div>
        </Link>

        <Link href="/clientes/nuevo" className="glass rounded-xl p-6 hover:scale-[1.02] transition-all duration-300 flex flex-col justify-between glass-hover group">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center text-accent group-hover:bg-accent/20 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v12m6-6H6" />
            </svg>
          </div>
          <div className="mt-4">
            <p className="text-base font-bold text-heading">Nuevo Cliente</p>
            <p className="text-xs text-muted">Alta de negocio</p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          {/* Vencimientos */}
          <div className="glass rounded-xl overflow-hidden shadow-lg">
            <div className="px-6 py-4 border-b border-edge bg-white/[0.02] flex items-center justify-between">
              <h3 className="font-bold text-heading flex items-center gap-2">
                <svg className="w-4 h-4 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Vencimientos
              </h3>
            </div>
            <div className="divide-y divide-edge">
              {ultimosVencimientos.length > 0 ? (
                ultimosVencimientos.map((venc) => (
                  <Link key={venc.id} href={`/clientes/${venc.id}`} className="flex flex-col px-6 py-4 hover:bg-white/5 transition-colors">
                    <span className="text-sm font-bold text-heading">{venc.nombre_empresa}</span>
                    <span className="text-[11px] text-danger font-medium mt-1">Expira el {new Date(venc.fecha_vencimiento!).toLocaleDateString("es-AR")}</span>
                  </Link>
                ))
              ) : (
                <div className="px-6 py-10 text-center text-muted italic text-xs">Sin vencimientos cercanos</div>
              )}
            </div>
          </div>

          {/* Industrias */}
          <div className="glass rounded-xl p-6 shadow-lg">
            <h3 className="font-bold text-heading mb-6">Niches de Negocio</h3>
            <div className="space-y-5">
              {distribucionEtiquetas.slice(0, 5).map((dist) => (
                <div key={dist.nombre} className="space-y-2">
                  <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                    <span className="text-body opacity-70">{dist.nombre}</span>
                    <span className="text-accent">{dist.cantidad}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-accent h-full rounded-full transition-all duration-1000" style={{ width: `${totalContactos > 0 ? (dist.cantidad / totalContactos) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FEED DE ACTIVIDAD REDISEÑADO */}
        <div className="lg:col-span-2">
          <div className="glass rounded-xl h-full flex flex-col shadow-2xl border border-white/5">
            <div className="px-6 py-5 border-b border-edge flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
                <h3 className="font-bold text-heading text-xl tracking-tight">Actividad Reciente</h3>
              </div>
              <span className="text-[10px] bg-accent/10 text-accent px-2 py-1 rounded-md font-black uppercase tracking-widest border border-accent/20">Realtime</span>
            </div>

            <div className="p-2">
              {actividadReciente.length > 0 ? (
                <div className="space-y-1">
                  {actividadReciente.map((log) => {
                    const actorName = `${log.usuario?.nombre} ${log.usuario?.apellido || ""}`.trim() || "Sistema";
                    const initials = (log.usuario?.nombre?.[0] || "") + (log.usuario?.apellido?.[0] || "");

                    let actionText = "";
                    let targetName = "";
                    let targetLink = "";
                    let detailContent = "";
                    let iconType = "default";

                    const relevantData = log.cambios_nuevos || log.cambios_anteriores;

                    if (log.tabla_afectada === "seguimiento_contactos") {
                      actionText = log.accion === "DELETE" ? "eliminó una nota" : "agregó una nota";
                      detailContent = relevantData?.notas || "";
                      iconType = getActivityIcon(detailContent);
                      targetLink = `/contactos/${relevantData?.contacto_id}`;
                    } else if (log.tabla_afectada === "contactos") {
                      actionText = log.accion === "CREATE" ? "creó un contacto" : log.accion === "UPDATE" ? "actualizó un contacto" : "eliminó un contacto";
                      targetName = `${relevantData?.nombre} ${relevantData?.apellido || ""}`.trim();
                      targetLink = `/contactos/${log.registro_id}`;
                      iconType = "user";
                    } else if (log.tabla_afectada === "clientes") {
                      actionText = log.accion === "CREATE" ? "registró un cliente" : log.accion === "UPDATE" ? "actualizó un cliente" : "eliminó un cliente";
                      targetName = relevantData?.nombre_empresa || "Cliente";
                      targetLink = `/clientes/${log.registro_id}`;
                      iconType = "building";
                    } else if (log.tabla_afectada === "contact_messages") {
                      const newStatus = log.cambios_nuevos?.status;
                      const statusActions: Record<string, string> = {
                        archived: "solucionó un ticket",
                        reopened: "reabrió un ticket",
                        read:     "puso un ticket en revisión",
                        new:      "marcó un ticket como nuevo",
                      };
                      actionText = statusActions[newStatus] || "actualizó un ticket";
                      targetLink = `/solicitudes/${log.registro_id}`;
                      iconType = "ticket";
                    } else if (log.tabla_afectada === "tickets") {
                      const newStatus = log.cambios_nuevos?.status;
                      const statusActions: Record<string, string> = {
                        archived: "solucionó un ticket",
                        reopened: "reabrió un ticket",
                        read:     "puso un ticket en revisión",
                        new:      "marcó un ticket como nuevo",
                      };
                      actionText = statusActions[newStatus] || "actualizó un ticket";
                      targetName = log.cambios_nuevos?.name || log.cambios_nuevos?.email || "";
                      targetLink = `/solicitudes/${log.registro_id}`;
                      iconType = "ticket";
                    } else if (log.tabla_afectada === "caja_gastos") {
                      actionText = log.accion === "CREATE" ? "registró un gasto" : log.accion === "UPDATE" ? "actualizó un gasto" : "eliminó un gasto";
                      targetName = relevantData?.descripcion || "Gasto";
                      targetLink = "/caja";
                      iconType = "money";
                    }

                    return (
                      <div key={log.id} className="group p-4 rounded-xl hover:bg-white/[0.03] transition-all duration-300 border border-transparent hover:border-edge/50 animate-slide-in">
                        <div className="flex items-start gap-4">
                          <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${getAvatarGradient(actorName)} flex items-center justify-center flex-shrink-0 text-white font-black text-xs shadow-xl group-hover:scale-105 transition-transform ring-4 ring-transparent group-hover:ring-white/5`}>
                            {initials || "S"}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="leading-snug">
                                <span className="text-sm font-bold text-heading block">
                                  {actorName} <span className="text-muted font-normal lowercase">{actionText}</span>
                                </span>
                                {targetLink && (
                                  <Link href={targetLink} className="text-[11px] font-bold text-accent hover:underline inline-flex items-center gap-1 mt-0.5">
                                    {targetName || "Ver ticket"}
                                  </Link>
                                )}
                              </div>

                              <div className="flex flex-col items-end gap-2">
                                <span className="text-[10px] text-muted font-black whitespace-nowrap bg-white/5 px-2 py-1 rounded-md border border-white/5">
                                  {getRelativeTimeString(log.created_at)}
                                </span>
                                <div className="text-accent/40 group-hover:text-accent group-hover:scale-125 transition-all">
                                  {iconType === "phone" && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
                                  {iconType === "calendar" && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                                  {iconType === "mail" && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                                  {iconType === "message" && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>}
                                  {iconType === "user" && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                                  {iconType === "building" && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                                  {iconType === "ticket" && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                                  {iconType === "money" && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                  {iconType === "default" && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                </div>
                              </div>
                            </div>

                            {detailContent && (
                              <div className="mt-3 bg-white/[0.02] border border-white/5 rounded-xl rounded-tl-none p-4 group-hover:bg-white/[0.05] transition-colors relative">
                                <p className="text-sm text-body leading-relaxed opacity-90 italic">
                                  "{detailContent}"
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center px-6">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-muted border border-white/5 animate-pulse">
                    <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                  </div>
                  <h4 className="text-sm font-bold text-heading">Sin actividad reciente</h4>
                  <p className="text-xs text-muted mt-2 max-w-[220px]">Los seguimientos aparecerán aquí automáticamente.</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-edge bg-white/[0.01]">
              <Link href="/auditoria" className="flex items-center justify-center gap-2 w-full text-center py-3 text-xs font-black text-accent hover:bg-accent/10 rounded-xl transition-all border border-accent/20 hover:border-accent uppercase tracking-widest">
                Historial de Operaciones
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
