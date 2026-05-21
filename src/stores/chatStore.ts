import { useState, useEffect } from "react";

const CHAT_MSG_EVENT = "crm:new-chat-message";
const CHAT_RESET_EVENT = "crm:chat-unread-reset";

export type ChatMessageEvent = {
  id: string;
  session_id: string;
  sender_type: string;
  sender_name: string | null;
  content: string;
  created_at: string;
};

export function dispatchNewChatMessage(msg: ChatMessageEvent) {
  window.dispatchEvent(new CustomEvent(CHAT_MSG_EVENT, { detail: msg }));
}

export function dispatchChatUnreadReset() {
  window.dispatchEvent(new CustomEvent(CHAT_RESET_EVENT));
}

export function useUnreadChatCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch("/api/chats/unread")
      .then(r => r.json())
      .then(json => { if (typeof json.count === "number") setCount(json.count); })
      .catch(() => {});

    function onNew(e: Event) {
      const msg = (e as CustomEvent<ChatMessageEvent>).detail;
      if (msg.sender_type === "client") setCount(c => c + 1);
    }
    function onReset() { setCount(0); }

    window.addEventListener(CHAT_MSG_EVENT, onNew);
    window.addEventListener(CHAT_RESET_EVENT, onReset);
    return () => {
      window.removeEventListener(CHAT_MSG_EVENT, onNew);
      window.removeEventListener(CHAT_RESET_EVENT, onReset);
    };
  }, []);

  return count;
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
