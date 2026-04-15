"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardRealtimeManager() {
  const router = useRouter();

  useEffect(() => {
    console.log("Real-time: Iniciando suscripciones...");

    const channel = supabase
      .channel("dashboard-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contactos" },
        (payload) => {
          console.log("Real-time: Cambio detectado en contactos", payload);
          router.refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clientes" },
        (payload) => {
          console.log("Real-time: Cambio detectado en clientes", payload);
          router.refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "seguimiento_contactos" },
        (payload) => {
          console.log("Real-time: Cambio detectado en seguimientos", payload);
          router.refresh();
        }
      )
      .subscribe((status) => {
        console.log("Real-time Status:", status);
        if (status === 'CHANNEL_ERROR') {
          console.error("Error en el canal Realtime. ¿Habilitaste las tablas en la consola de Supabase?");
        }
      });

    return () => {
      console.log("Real-time: Limpiando suscripciones...");
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null; // Este componente no renderiza nada, solo gestiona la reactividad
}
