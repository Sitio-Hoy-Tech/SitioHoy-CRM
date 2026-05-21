"use client";

import { useState, useEffect } from "react";

export const TICKET_EVENT = "crm:new-ticket";
export const TICKET_RESET_EVENT = "crm:tickets-reset";

export function dispatchNewTicket() {
  window.dispatchEvent(new CustomEvent(TICKET_EVENT));
}

export function dispatchTicketsReset() {
  window.dispatchEvent(new CustomEvent(TICKET_RESET_EVENT));
}

export function useNewTicketCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch("/api/solicitudes/nuevos")
      .then((r) => r.json())
      .then(({ count: initial }) => {
        if (typeof initial === "number") setCount(initial);
      })
      .catch(() => {});

    const onNew = () => setCount((n) => n + 1);
    const onReset = () => setCount(0);
    window.addEventListener(TICKET_EVENT, onNew);
    window.addEventListener(TICKET_RESET_EVENT, onReset);
    return () => {
      window.removeEventListener(TICKET_EVENT, onNew);
      window.removeEventListener(TICKET_RESET_EVENT, onReset);
    };
  }, []);

  return count;
}

export function useTicketRefresh(onRefresh: () => void) {
  useEffect(() => {
    window.addEventListener(TICKET_EVENT, onRefresh);
    return () => window.removeEventListener(TICKET_EVENT, onRefresh);
  }, [onRefresh]);
}
