"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Button from "@/components/common/Button";
import { useOnNewChatMessage, useOnSupportRequest, dispatchChatUnreadReset, dispatchSupportResolved, dispatchBadgesRefresh, setActiveChatSession, type ChatMessageEvent } from "@/stores/chatStore";

type Cliente = { id: string; nombre_empresa: string };

type Session = {
  id: string;
  cliente_id: string | null;
  status: string;
  created_at: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_agent_count: number;
  pending_since: string | null;
  cliente: Cliente | null;
};

type Message = {
  id: string;
  session_id: string;
  sender_type: "agent" | "client" | "system";
  sender_name: string | null;
  content: string;
  created_at: string;
  _optimistic?: boolean;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return d.toLocaleDateString("es-AR", { weekday: "short" });
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

function formatMsgTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function isImageUrl(content: string) {
  try {
    const url = new URL(content.trim());
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url.pathname);
  } catch {
    return false;
  }
}

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/40 rounded-full p-2 transition-colors"
        aria-label="Cerrar"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="imagen"
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (isImageUrl(content)) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={content.trim()}
          alt="imagen"
          className="rounded-lg object-cover cursor-pointer"
          style={{ width: 200, height: 150 }}
          loading="lazy"
          onClick={() => setLightbox(content.trim())}
        />
        {lightbox && <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />}
      </>
    );
  }
  return <>{content}</>;
}

function ElapsedTimer({ since, nowMs }: { since: string; nowMs: number }) {
  const totalSecs = Math.floor((nowMs - new Date(since).getTime()) / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  if (hours > 0) return <span>{hours}h {mins}m esperando</span>;
  if (mins > 0) return <span>{mins}m {secs}s esperando</span>;
  return <span>{Math.max(0, secs)}s esperando</span>;
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const letter = name.charAt(0).toUpperCase();
  const cls = size === "sm"
    ? "w-8 h-8 text-xs"
    : "w-9 h-9 text-sm";
  return (
    <div className={`${cls} rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center flex-shrink-0`}>
      {letter}
    </div>
  );
}

function ChatPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: authSession } = useSession();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const [showNewChat, setShowNewChat] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [newClienteId, setNewClienteId] = useState("");
  const [creating, setCreating] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const hasPending = sessions.some(s => s.status === "pending" && s.pending_since);
    if (!hasPending) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sessions]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;
  const sessionsRef = useRef<Session[]>([]);
  sessionsRef.current = sessions;

  // Load sessions
  const loadSessions = useCallback(async () => {
    const res = await fetch("/api/chats");
    const json = await res.json();
    if (json.data) setSessions(json.data);
  }, []);

  const loadSessionsRef = useRef(loadSessions);
  loadSessionsRef.current = loadSessions;

  useEffect(() => { loadSessions(); }, [loadSessions]);

  useEffect(() => {
    setActiveChatSession(activeId);
    return () => setActiveChatSession(null);
  }, [activeId]);

  // Activate session from URL query param
  useEffect(() => {
    const sid = searchParams.get("session");
    if (sid) setActiveId(sid);
  }, [searchParams]);

  // Load messages when active session changes
  useEffect(() => {
    if (!activeId) { setMessages([]); setHasMore(false); return; }
    setLoadingMsgs(true);
    setMessages([]);
    setHasMore(false);
    fetch(`/api/chats/${activeId}/messages`)
      .then(r => r.json())
      .then(json => {
        setMessages(json.data ?? []);
        setHasMore(json.hasMore ?? false);
        setLoadingMsgs(false);
      });

    const sessionUnread = sessionsRef.current.find(s => s.id === activeId)?.unread_agent_count ?? 0;
    if (sessionUnread > 0) {
      dispatchChatUnreadReset(sessionUnread);
      fetch(`/api/chats/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markRead: true }),
      }).catch(() => {});
    }
    setSessions(prev => prev.map(s => s.id === activeId ? { ...s, unread_agent_count: 0 } : s));
  }, [activeId]);

  // Scroll to bottom when messages load or new message arrives
  useEffect(() => {
    if (!loadingMsgs) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [loadingMsgs, messages.length]);

  // Real-time: update session status when client requests support
  useOnSupportRequest(useCallback(({ session_id, pending_since }) => {
    const exists = sessionsRef.current.some(s => s.id === session_id);
    if (exists) {
      setSessions(prev => prev.map(s => s.id === session_id ? { ...s, status: "pending", pending_since } : s));
    } else {
      loadSessionsRef.current();
      dispatchBadgesRefresh();
    }
  }, []));

  // Real-time: listen to new messages via ChatNotifier events
  useOnNewChatMessage(useCallback((msg: ChatMessageEvent) => {
    // Update session list preview
    const sessionExists = sessionsRef.current.some(s => s.id === msg.session_id);
    if (!sessionExists) {
      loadSessionsRef.current();
      dispatchBadgesRefresh();
      return;
    }
    setSessions(prev => prev.map(s => {
      if (s.id !== msg.session_id) return s;
      return {
        ...s,
        last_message_at: msg.created_at,
        last_message_preview: msg.content.slice(0, 120),
        unread_agent_count: msg.sender_type === "client" && activeIdRef.current !== msg.session_id
          ? s.unread_agent_count + 1
          : s.unread_agent_count,
      };
    }));

    // Add incoming message to active chat (client or another agent)
    if (msg.session_id === activeIdRef.current) {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg as Message];
      });
    }
  }, []));

  async function loadMore() {
    if (!activeId || !messages.length) return;
    setLoadingMore(true);
    const oldest = messages[0].created_at;
    const res = await fetch(`/api/chats/${activeId}/messages?before=${encodeURIComponent(oldest)}`);
    const json = await res.json();
    setLoadingMore(false);
    if (json.data) {
      const container = messagesRef.current;
      const prevScrollHeight = container?.scrollHeight ?? 0;
      setMessages(prev => [...(json.data as Message[]), ...prev]);
      setHasMore(json.hasMore ?? false);
      // Keep scroll position after prepend
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - prevScrollHeight;
        }
      });
    }
  }

  async function sendMessage() {
    if (!activeId || !input.trim() || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      session_id: activeId,
      sender_type: "agent",
      sender_name: authSession?.user?.name ?? "Agente",
      content,
      created_at: new Date().toISOString(),
      _optimistic: true,
    };
    setMessages(prev => [...prev, tempMsg]);

    const res = await fetch(`/api/chats/${activeId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setSending(false);

    if (res.ok) {
      const json = await res.json();
      const real: Message = json.data;
      setMessages(prev => prev.map(m => m.id === tempId ? real : m));
      setSessions(prev => prev.map(s =>
        s.id === activeId
          ? { ...s, last_message_at: real.created_at, last_message_preview: content.slice(0, 120) }
          : s
      ));
    } else {
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function closeSession() {
    if (!activeId) return;
    const wasPending = sessionsRef.current.find(s => s.id === activeId)?.status === "pending";
    await fetch(`/api/chats/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    if (wasPending) dispatchSupportResolved();
    setSessions(prev => prev.map(s => s.id === activeId ? { ...s, status: "closed", pending_since: null } : s));
  }

  async function reopenSession() {
    if (!activeId) return;
    await fetch(`/api/chats/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "open" }),
    });
    setSessions(prev => prev.map(s => s.id === activeId ? { ...s, status: "open" } : s));
  }

  async function acceptSession() {
    if (!activeId || accepting) return;
    setAccepting(true);
    const res = await fetch(`/api/chats/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "open" }),
    });
    setAccepting(false);
    if (res.ok) {
      dispatchSupportResolved();
      setSessions(prev => prev.map(s => s.id === activeId ? { ...s, status: "open", pending_since: null } : s));
    }
  }

  async function deleteSession() {
    if (!activeId || deleting) return;
    setDeleting(true);
    const res = await fetch(`/api/chats/${activeId}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      setSessions(prev => prev.filter(s => s.id !== activeId));
      setActiveId(null);
      setMessages([]);
      setConfirmDelete(false);
      router.push("/chats", { scroll: false });
    }
  }

  async function openNewChatPanel() {
    setShowNewChat(true);
    if (clientes.length === 0) {
      const res = await fetch("/api/clientes?limit=200");
      const json = await res.json();
      setClientes((json.data ?? []).map((c: { id: string; nombre_empresa: string }) => ({ id: c.id, nombre_empresa: c.nombre_empresa })));
    }
  }

  async function createSession() {
    if (!newClienteId) return;
    setCreating(true);
    const res = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cliente_id: newClienteId }),
    });
    setCreating(false);
    if (res.ok) {
      const json = await res.json();
      const session: Session = json.data;
      setShowNewChat(false);
      setNewClienteId("");
      await loadSessions();
      setActiveId(session.id);
      router.push(`/chats?session=${session.id}`, { scroll: false });
    }
  }

  const activeSession = sessions.find(s => s.id === activeId) ?? null;

  return (
    <div className="-m-6 flex overflow-hidden" style={{ height: "100vh" }}>
      {/* ── LEFT: sessions panel ── */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r border-edge bg-card">
        {/* Header */}
        <div className="p-4 border-b border-edge">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-bold text-heading">Chats</h1>
            <button
              type="button"
              onClick={openNewChatPanel}
              className="w-8 h-8 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors flex items-center justify-center"
              title="Nueva conversación"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* New chat form */}
          {showNewChat && (
            <div className="bg-elevated rounded-lg p-3 space-y-2 border border-edge">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Nueva conversación</p>
              <select
                value={newClienteId}
                onChange={e => setNewClienteId(e.target.value)}
                className="w-full bg-card border border-edge rounded-lg px-3 py-2 text-sm text-body focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Seleccionar cliente...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre_empresa}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button size="sm" onClick={createSession} loading={creating} disabled={!newClienteId} className="flex-1 justify-center">
                  Iniciar
                </Button>
                <Button size="sm" variant="secondary" onClick={() => { setShowNewChat(false); setNewClienteId(""); }}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
              <div className="w-12 h-12 rounded-xl bg-elevated flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm text-muted">No hay conversaciones</p>
              <p className="text-xs text-muted/60 mt-1">Iniciá una nueva con el botón +</p>
            </div>
          )}
          {sessions.map(session => {
            const isActive = session.id === activeId;
            const name = session.cliente?.nombre_empresa ?? "Sin cliente";
            return (
              <button
                key={session.id}
                type="button"
                onClick={() => {
                  setActiveId(session.id);
                  router.push(`/chats?session=${session.id}`, { scroll: false });
                }}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-edge/50 ${
                  isActive
                    ? session.status === "pending" ? "bg-amber-500/10" : "bg-accent/10"
                    : session.status === "pending" ? "hover:bg-amber-500/5 bg-amber-500/5" : "hover:bg-elevated"
                }`}
              >
                <div className="relative flex-shrink-0">
                  <Avatar name={name} />
                  {session.status === "pending" && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-500 border-2 border-card animate-pulse" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-semibold truncate ${
                      isActive
                        ? session.status === "pending" ? "text-amber-500" : "text-accent"
                        : "text-heading"
                    }`}>
                      {name}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {session.status === "pending" && (
                        <span className="text-[10px] font-semibold text-amber-500 border border-amber-500/40 bg-amber-500/10 rounded px-1.5 py-0.5">
                          Soporte
                        </span>
                      )}
                      {session.status === "closed" && (
                        <span className="text-[10px] text-muted border border-edge rounded px-1">Cerrado</span>
                      )}
                      {session.last_message_at && (
                        <span className="text-[11px] text-muted">{formatTime(session.last_message_at)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs truncate flex-1" style={{ color: session.status === "pending" ? "#FE920A" : undefined }}>
                      {session.status === "pending" && session.pending_since
                        ? <ElapsedTimer since={session.pending_since} nowMs={nowMs} />
                        : session.status === "pending"
                          ? "Solicita soporte"
                          : <span className="text-muted">{session.last_message_preview ?? "Sin mensajes aún"}</span>}
                    </p>
                    {session.unread_agent_count > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
                        {session.unread_agent_count > 99 ? "99+" : session.unread_agent_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: chat area ── */}
      {!activeId ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <div className="w-16 h-16 rounded-2xl bg-elevated flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-base font-semibold text-heading mb-1">Seleccioná una conversación</p>
          <p className="text-sm text-muted">O iniciá una nueva con el botón +</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-edge bg-card flex-shrink-0">
            <div className="flex items-center gap-3">
              <Avatar name={activeSession?.cliente?.nombre_empresa ?? "?"} />
              <div>
                <p className="text-sm font-bold text-heading">
                  {activeSession?.cliente?.nombre_empresa ?? "Cliente"}
                </p>
                <p className="text-xs text-muted">
                  {activeSession?.status === "open" ? (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
                      Conversación activa
                    </span>
                  ) : activeSession?.status === "pending" ? (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
                      <span className="text-amber-500">Solicitud de soporte pendiente</span>
                    </span>
                  ) : (
                    <span className="text-muted">Conversación cerrada</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeSession?.status === "pending" ? (
                <>
                  <Button size="sm" onClick={acceptSession} loading={accepting} className="bg-amber-500 hover:bg-amber-600 border-amber-500 hover:border-amber-600">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Aceptar chat
                  </Button>
                  <Button size="sm" variant="secondary" onClick={closeSession}>
                    Rechazar
                  </Button>
                </>
              ) : activeSession?.status === "open" ? (
                <Button size="sm" variant="secondary" onClick={closeSession}>
                  Cerrar conversación
                </Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={reopenSession}>
                  Reabrir conversación
                </Button>
              )}
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                title="Eliminar conversación"
                className="p-2 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {/* Confirm delete modal */}
            {confirmDelete && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDelete(false)}>
                <div className="border border-edge rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4" style={{ backgroundColor: "#0f172a" }} onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-heading">Eliminar conversación</p>
                      <p className="text-xs text-muted">Esta acción no se puede deshacer</p>
                    </div>
                  </div>
                  <p className="text-sm text-body mb-6">
                    Se borrarán permanentemente todos los mensajes e imágenes de esta conversación con <span className="font-medium">{activeSession?.cliente?.nombre_empresa ?? "este cliente"}</span>.
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 px-4 py-2 text-sm rounded-lg border border-edge text-body hover:bg-elevated transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={deleteSession}
                      disabled={deleting}
                      className="flex-1 px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-60"
                    >
                      {deleting ? "Eliminando…" : "Eliminar"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <div ref={messagesRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
            {hasMore && (
              <div className="flex justify-center pb-2">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="text-xs text-muted hover:text-accent transition-colors disabled:opacity-50"
                >
                  {loadingMore ? "Cargando..." : "Cargar mensajes anteriores"}
                </button>
              </div>
            )}

            {loadingMsgs && (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-edge border-t-accent rounded-full animate-spin" />
              </div>
            )}

            {!loadingMsgs && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                <p className="text-sm text-muted">No hay mensajes aún.</p>
                <p className="text-xs text-muted/60 mt-1">Escribí algo para iniciar la conversación.</p>
              </div>
            )}

            {messages.map((msg, i) => {
              if (msg.sender_type === "system") {
                return (
                  <div key={msg.id} className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-edge" />
                    <span className="text-[11px] text-muted/70 whitespace-nowrap">
                      {msg.content === "__session_reopened__"
                      ? "Conversación reabierta"
                      : msg.content === "__session_closed__"
                      ? "Conversación cerrada"
                      : msg.content}
                    </span>
                    <div className="flex-1 h-px bg-edge" />
                  </div>
                );
              }

              const isAgent = msg.sender_type === "agent";
              const prevMsg = i > 0 ? messages[i - 1] : null;
              const showSender = !prevMsg || prevMsg.sender_type !== msg.sender_type;
              const nextMsg = i < messages.length - 1 ? messages[i + 1] : null;
              const isLast = !nextMsg || nextMsg.sender_type !== msg.sender_type;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isAgent ? "justify-end" : "justify-start"} ${showSender ? "mt-4" : "mt-0.5"}`}
                >
                  {!isAgent && showSender && (
                    <div className="w-7 h-7 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                      {(msg.sender_name ?? "C").charAt(0).toUpperCase()}
                    </div>
                  )}
                  {!isAgent && !showSender && <div className="w-9 flex-shrink-0" />}

                  <div className={`max-w-[65%] ${isAgent ? "items-end" : "items-start"} flex flex-col`}>
                    {showSender && (
                      <p className={`text-[11px] text-muted mb-1 ${isAgent ? "text-right" : "text-left"}`}>
                        {isAgent ? (msg.sender_name ?? "Agente") : (msg.sender_name ?? "Cliente")}
                      </p>
                    )}
                    <div
                      className={`px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        isAgent
                          ? `bg-accent text-white ${showSender ? "rounded-tl-2xl" : "rounded-tl-2xl"} rounded-tr-sm rounded-bl-2xl rounded-br-2xl`
                          : `bg-elevated text-body border border-edge ${showSender ? "rounded-tr-2xl" : "rounded-tr-2xl"} rounded-tl-sm rounded-bl-2xl rounded-br-2xl`
                      } ${msg._optimistic ? "opacity-70" : ""}`}
                    >
                      <MessageContent content={msg.content} />
                    </div>
                    {isLast && (
                      <p className="text-[10px] text-muted/60 mt-1 px-1">
                        {formatMsgTime(msg.created_at)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-edge p-4 bg-card">
            {activeSession?.status === "closed" ? (
              <div className="flex items-center justify-center py-2 text-sm text-muted gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Conversación cerrada · <button type="button" onClick={reopenSession} className="text-accent hover:underline">Reabrir</button>
              </div>
            ) : activeSession?.status === "pending" ? (
              <div className="flex items-center justify-center py-2 text-sm gap-2">
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-amber-500 font-medium">Aceptá el chat para responder</span>
                <button type="button" onClick={acceptSession} className="text-accent hover:underline">
                  Aceptar ahora
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribí tu mensaje… (Enter para enviar, Shift+Enter para nueva línea)"
                  rows={2}
                  className="flex-1 bg-elevated border border-edge rounded-xl px-4 py-3 text-sm text-body placeholder:text-muted resize-none focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
                />
                <Button
                  onClick={sendMessage}
                  loading={sending}
                  disabled={!input.trim()}
                  className="flex-shrink-0"
                >
                  <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatsPage() {
  return (
    <Suspense>
      <ChatPageInner />
    </Suspense>
  );
}
