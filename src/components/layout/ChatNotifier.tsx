"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { dispatchNewChatMessage, type ChatMessageEvent } from "@/stores/chatStore";

function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function ChatNotifier() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const showToast = useCallback(
    (msg: ChatMessageEvent, sessionId: string) => {
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
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
        </div>
        <div style="flex:1;min-width:0">
          <p style="font-size:10px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px">Nuevo mensaje</p>
          <p style="font-size:14px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(msg.sender_name ?? "Cliente")}</p>
          <p style="font-size:12px;color:#64748b;margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${escapeHtml(msg.content)}</p>
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
        router.push(`/chats?session=${sessionId}`);
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
    },
    [router]
  );

  useEffect(() => {
    const channel = supabase
      .channel("crm-chat-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const msg = payload.new as ChatMessageEvent;
          dispatchNewChatMessage(msg);
          if (msg.sender_type === "client") {
            showToast(msg, msg.session_id);
            if ("Notification" in window && Notification.permission === "granted" && (document.hidden || !document.hasFocus())) {
              const notif = new Notification(`Mensaje de ${msg.sender_name ?? "Cliente"}`, {
                body: msg.content,
                icon: "/logo-sitio-hoy.png",
              });
              notif.onclick = () => {
                window.focus();
                router.push(`/chats?session=${msg.session_id}`);
                notif.close();
              };
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [showToast, router]);

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 items-end pointer-events-none [&>*]:pointer-events-auto"
    />
  );
}
