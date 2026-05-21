"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Button from "@/components/common/Button";
import { useOnNewChatMessage, dispatchChatUnreadReset, type ChatMessageEvent } from "@/stores/chatStore";

type Cliente = { id: string; nombre_empresa: string };

type Session = {
  id: string;
  cliente_id: string | null;
  status: string;
  created_at: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_agent_count: number;
  cliente: Cliente | null;
};

type Message = {
  id: string;
  session_id: string;
  sender_type: "agent" | "client";
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

  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;

  // Load sessions
  const loadSessions = useCallback(async () => {
    const res = await fetch("/api/chats");
    const json = await res.json();
    if (json.data) setSessions(json.data);
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

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
    dispatchChatUnreadReset();
    // Clear unread on the active session locally
    setSessions(prev => prev.map(s => s.id === activeId ? { ...s, unread_agent_count: 0 } : s));
  }, [activeId]);

  // Scroll to bottom when messages load or new message arrives
  useEffect(() => {
    if (!loadingMsgs) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [loadingMsgs, messages.length]);

  // Real-time: listen to new messages via ChatNotifier events
  useOnNewChatMessage(useCallback((msg: ChatMessageEvent) => {
    // Update session list preview
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

    // Add client message to active chat
    if (msg.sender_type === "client" && msg.session_id === activeIdRef.current) {
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
      sender_name: "Yo",
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
    await fetch(`/api/chats/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    setSessions(prev => prev.map(s => s.id === activeId ? { ...s, status: "closed" } : s));
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
                  isActive ? "bg-accent/10" : "hover:bg-elevated"
                }`}
              >
                <Avatar name={name} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-semibold truncate ${isActive ? "text-accent" : "text-heading"}`}>
                      {name}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {session.status === "closed" && (
                        <span className="text-[10px] text-muted border border-edge rounded px-1">Cerrado</span>
                      )}
                      {session.last_message_at && (
                        <span className="text-[11px] text-muted">{formatTime(session.last_message_at)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-muted truncate flex-1">
                      {session.last_message_preview ?? "Sin mensajes aún"}
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
                  ) : (
                    <span className="text-muted">Conversación cerrada</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeSession?.status === "open" ? (
                <Button size="sm" variant="secondary" onClick={closeSession}>
                  Cerrar conversación
                </Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={reopenSession}>
                  Reabrir conversación
                </Button>
              )}
            </div>
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
                      {msg.content}
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
            ) : (
              <div className="flex items-end gap-3">
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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
