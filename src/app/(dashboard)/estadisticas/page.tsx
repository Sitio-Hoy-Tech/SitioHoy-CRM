"use client";

import { useState } from "react";

const UMAMI_SHARE_URL = "https://cloud.umami.is/share/usKaaaTn3oMRKgvd";

const PERIODS = [
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "1y", value: "1y" },
];

export default function EstadisticasPage() {
  const [period, setPeriod] = useState("24h");

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[--text-primary]">Estadísticas</h1>
        <div className="flex bg-[--bg-card] rounded-lg border border-[--border-primary] p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                period === p.value
                  ? "bg-[--accent] text-white"
                  : "text-[--text-secondary] hover:text-[--text-primary]"
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
    </div>
  );
}
