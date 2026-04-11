"use client";

import { useState } from "react";

const UMAMI_SHARE_URL = "https://cloud.umami.is/share/usKaaaTn3oMRKgvd";

const PERIODS = [
  { label: "24h", value: "24h" },
  { label: "7 días", value: "7d" },
  { label: "30 días", value: "30d" },
  { label: "90 días", value: "90d" },
  { label: "Este año", value: "1y" },
];

export default function EstadisticasPage() {
  const [period, setPeriod] = useState("30d");

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[--text-primary]">Estadísticas</h1>
          <p className="text-sm text-[--text-muted] mt-1">Analítica de tus sitios web</p>
        </div>
        <div className="flex gap-1 bg-[--bg-card] rounded-lg border border-[--border-primary] p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === p.value
                  ? "bg-[--accent] text-white"
                  : "text-[--text-secondary] hover:bg-[--bg-elevated]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[--bg-card] rounded-xl border border-[--border-primary] overflow-hidden">
        <iframe
          src={`${UMAMI_SHARE_URL}?period=${period}`}
          className="w-full border-0"
          style={{ height: "calc(100vh - 200px)", minHeight: "600px" }}
          title="Umami Analytics"
          loading="lazy"
        />
      </div>

      <p className="text-xs text-[--text-muted] mt-3 text-center">
        Powered by Umami &middot;{" "}
        <a href={UMAMI_SHARE_URL} target="_blank" rel="noopener noreferrer" className="text-[--accent] hover:underline">
          Abrir en nueva pestaña
        </a>
      </p>
    </div>
  );
}
