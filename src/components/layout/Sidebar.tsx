"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useNewTicketCount, dispatchTicketsReset } from "@/stores/ticketStore";
import { useChatBadges } from "@/stores/chatStore";

const navigation = [
  { name: "Dashboard", href: "/", icon: "M3 3h7v7H3V3zm11 0h7v7h-7V3zm-11 11h7v7H3v-7zm11 0h7v7h-7v-7z" },
  { name: "Contactos", href: "/contactos", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { name: "Clientes", href: "/clientes", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  {
    name: "Catálogos",
    href: "/catalogos/planes",
    icon: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z",
    children: [
      { name: "Planes", href: "/catalogos/planes" },
      { name: "Estados contacto", href: "/catalogos/estados-contacto" },
      { name: "Etiquetas negocio", href: "/catalogos/etiquetas-negocio" },
      { name: "Cuentas MP", href: "/catalogos/mp-cuentas" },
    ],
  },
  { name: "Tickets", href: "/solicitudes", icon: "M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" },
  { name: "Chats", href: "/chats", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
  { name: "Caja", href: "/caja", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { name: "Estadísticas", href: "/estadisticas", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { name: "Calendario", href: "/calendario", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { name: "Usuarios", href: "/usuarios", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  { name: "Auditoría", href: "/auditoria", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const newTicketCount = useNewTicketCount();
  const { unread: unreadChatCount, pending: pendingSupportCount } = useChatBadges();

  return (
    <aside className="w-60 glass border-r border-edge min-h-screen flex flex-col sticky top-0 h-screen z-50">
      <div className="px-5 py-5">
        <div className="flex items-center gap-3">
          <img
            src="/logo-sitio-hoy.png"
            alt="SitioHoy Logo"
            className="w-10 h-10 object-contain"
          />
          <h1 className="text-base font-bold text-heading">SitioHoy CRM</h1>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          const isCatalogActive =
            item.children &&
            item.children.some(
              (child) =>
                pathname === child.href ||
                pathname.startsWith(child.href + "/")
            );

          return (
            <div key={item.name}>
              <Link
                href={item.href}
                onClick={() => {
                if (item.href === "/solicitudes") dispatchTicketsReset();
              }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative ${isActive || isCatalogActive
                  ? "bg-accent/10 text-accent"
                  : "text-body hover:bg-elevated hover:text-heading"
                  }`}
              >
                {(isActive || isCatalogActive) && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-accent" />
                )}
                <svg
                  className="w-[18px] h-[18px] flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d={item.icon}
                  />
                </svg>
                {item.name}
                {item.href === "/solicitudes" && newTicketCount > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-black flex items-center justify-center">
                    {newTicketCount > 99 ? "99+" : newTicketCount}
                  </span>
                )}
                {item.href === "/chats" && (unreadChatCount > 0 || pendingSupportCount > 0) && (
                  <span className="ml-auto flex items-center gap-1">
                    {pendingSupportCount > 0 && (
                      <span
                        className="min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-black flex items-center justify-center"
                        style={{ backgroundColor: "#FE920A" }}
                      >
                        {pendingSupportCount > 99 ? "99+" : pendingSupportCount}
                      </span>
                    )}
                    {unreadChatCount > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-black flex items-center justify-center">
                        {unreadChatCount > 99 ? "99+" : unreadChatCount}
                      </span>
                    )}
                  </span>
                )}
              </Link>

              {item.children && (isActive || isCatalogActive) && (
                <div className="ml-9 mt-1 space-y-0.5">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`block px-3 py-1.5 rounded-md text-sm transition-all duration-200 ${pathname === child.href ||
                        pathname.startsWith(child.href + "/")
                        ? "text-accent font-medium"
                        : "text-muted hover:text-heading"
                        }`}
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="mt-auto border-t border-edge p-4 bg-white/[0.01]">
        <div className="flex items-center gap-3 mb-4 px-1">
          <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-white/5">
            <span className="text-white text-sm font-black">
              {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-heading truncate">
              {session?.user?.name || "Usuario"}
            </p>
            <p className="text-[10px] text-muted font-medium truncate uppercase tracking-wider">
              {session?.user.role}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-black text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-rose-500/20 hover:border-rose-500 uppercase tracking-widest cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
