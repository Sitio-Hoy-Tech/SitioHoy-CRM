import { useState, useEffect } from "react";

const CHAT_MSG_EVENT = "crm:new-chat-message";
const CHAT_RESET_EVENT = "crm:chat-unread-reset";
const SUPPORT_REQUEST_EVENT = "crm:support-requested";
const SUPPORT_RESOLVED_EVENT = "crm:support-resolved";

export type ChatMessageEvent = {
  id: string;
  session_id: string;
  sender_type: string;
  sender_name: string | null;
  content: string;
  created_at: string;
};

export type SupportRequestEvent = {
  session_id: string;
  pending_since: string;
};

let activeChatSessionId: string | null = null;

export function setActiveChatSession(id: string | null) {
  activeChatSessionId = id;
}

export function getActiveChatSession() {
  return activeChatSessionId;
}

export function dispatchNewChatMessage(msg: ChatMessageEvent) {
  window.dispatchEvent(new CustomEvent(CHAT_MSG_EVENT, { detail: msg }));
}

export function dispatchChatUnreadReset(count: number) {
  window.dispatchEvent(new CustomEvent(CHAT_RESET_EVENT, { detail: { count } }));
}

export function dispatchSupportRequest(data: SupportRequestEvent) {
  window.dispatchEvent(new CustomEvent(SUPPORT_REQUEST_EVENT, { detail: data }));
}

export function dispatchSupportResolved() {
  window.dispatchEvent(new CustomEvent(SUPPORT_RESOLVED_EVENT));
}

// Single hook that fetches both counts in one request.
// The Sidebar uses this to avoid two parallel fetches to the same endpoint.
export function useChatBadges() {
  const [unread, setUnread] = useState(0);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    fetch("/api/chats/unread")
      .then(r => r.json())
      .then(json => {
        if (typeof json.count === "number") setUnread(json.count);
        if (typeof json.pending_count === "number") setPending(json.pending_count);
      })
      .catch(() => {});

    function onNewMsg(e: Event) {
      const msg = (e as CustomEvent<ChatMessageEvent>).detail;
      if (msg.sender_type === "client") setUnread(c => c + 1);
    }
    function onReset(e: Event) {
      const { count } = (e as CustomEvent<{ count: number }>).detail;
      setUnread(c => Math.max(0, c - count));
    }
    function onRequest() { setPending(c => c + 1); }
    function onResolved() { setPending(c => Math.max(0, c - 1)); }

    window.addEventListener(CHAT_MSG_EVENT, onNewMsg);
    window.addEventListener(CHAT_RESET_EVENT, onReset);
    window.addEventListener(SUPPORT_REQUEST_EVENT, onRequest);
    window.addEventListener(SUPPORT_RESOLVED_EVENT, onResolved);
    return () => {
      window.removeEventListener(CHAT_MSG_EVENT, onNewMsg);
      window.removeEventListener(CHAT_RESET_EVENT, onReset);
      window.removeEventListener(SUPPORT_REQUEST_EVENT, onRequest);
      window.removeEventListener(SUPPORT_RESOLVED_EVENT, onResolved);
    };
  }, []);

  return { unread, pending };
}

export function useOnNewChatMessage(handler: (msg: ChatMessageEvent) => void) {
  useEffect(() => {
    function onNew(e: Event) {
      handler((e as CustomEvent<ChatMessageEvent>).detail);
    }
    window.addEventListener(CHAT_MSG_EVENT, onNew);
    return () => window.removeEventListener(CHAT_MSG_EVENT, onNew);
  }, [handler]);
}

export function useOnSupportRequest(handler: (data: SupportRequestEvent) => void) {
  useEffect(() => {
    function onRequest(e: Event) {
      handler((e as CustomEvent<SupportRequestEvent>).detail);
    }
    window.addEventListener(SUPPORT_REQUEST_EVENT, onRequest);
    return () => window.removeEventListener(SUPPORT_REQUEST_EVENT, onRequest);
  }, [handler]);
}
