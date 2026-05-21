"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { dispatchNewTicket } from "@/stores/ticketStore";

const SOURCE_LABELS: Record<string, string> = {
  password_reset_request: "Cambio de contraseña",
  support_billing: "Soporte / Facturación",
};

type NewTicket = {
  id: string;
  name: string;
  source: string | null;
  message: string;
};

function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function TicketNotifier() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const showBrowserNotification = useCallback(
    (ticket: NewTicket) => {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      const source = SOURCE_LABELS[ticket.source ?? ""] ?? ticket.source ?? "Sin origen";
      const notif = new Notification(`Nuevo ticket — ${ticket.name}`, {
        body: `${source}\n${ticket.message}`,
        icon: "/logo-sitio-hoy.png",
      });
      notif.onclick = () => {
        window.focus();
        router.push(`/solicitudes/${ticket.id}`);
        notif.close();
      };
    },
    [router]
  );

  const showToast = useCallback((ticket: NewTicket) => {
    if (!containerRef.current) return;

    const toast = document.createElement("div");
    toast.style.cssText = "opacity:0;transform:translateX(16px);transition:opacity 0.25s,transform 0.25s;";
    toast.className = [
      "flex items-start gap-3 bg-[#0f172a] border border-[rgba(16,185,129,0.4)]",
      "rounded-xl p-4 shadow-2xl w-80 cursor-pointer",
      "hover:border-[rgba(16,185,129,0.7)] transition-colors",
    ].join(" ");

    toast.innerHTML = `
      <div style="width:32px;height:32px;background:rgba(16,185,129,0.1);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px">
        <svg width="16" height="16" fill="none" stroke="#10b981" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
        </svg>
      </div>
      <div style="flex:1;min-width:0">
        <p style="font-size:10px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px">Nuevo ticket</p>
        <p style="font-size:14px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(ticket.name)}</p>
        <p style="font-size:12px;color:#94a3b8;margin-top:2px">${escapeHtml(SOURCE_LABELS[ticket.source ?? ""] ?? ticket.source ?? "Sin origen")}</p>
        <p style="font-size:12px;color:#64748b;margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${escapeHtml(ticket.message)}</p>
      </div>
      <button style="color:#64748b;font-size:20px;line-height:1;flex-shrink:0;margin-top:2px;background:none;border:none;cursor:pointer" aria-label="Cerrar">&times;</button>
    `;

    let timeout: ReturnType<typeof setTimeout>;

    const dismiss = () => {
      clearTimeout(timeout);
      toast.style.opacity = "0";
      toast.style.transform = "translateX(16px)";
      setTimeout(() => toast.remove(), 250);
    };

    toast.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).tagName === "BUTTON") return;
      dismiss();
      router.push(`/solicitudes/${ticket.id}`);
    });

    toast.querySelector("button")!.addEventListener("click", (e) => {
      e.stopPropagation();
      dismiss();
    });

    containerRef.current.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateX(0)";
    });

    timeout = setTimeout(dismiss, 8000);
  }, [router]);

  useEffect(() => {
    const channel = supabase
      .channel("crm-new-tickets")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tickets" },
        (payload) => {
          const ticket = payload.new as NewTicket;
          dispatchNewTicket();
          showToast(ticket);
          if (document.hidden || !document.hasFocus()) {
            showBrowserNotification(ticket);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showToast, showBrowserNotification]);

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 items-end pointer-events-none [&>*]:pointer-events-auto"
    />
  );
}
