"use client";

import { useEffect, useRef, useState } from "react";
import type { MpCuenta } from "@/types";

type Props = {
  value: string | null;
  onChange: (id: string | null) => void;
  cuentas: MpCuenta[];
  disabled?: boolean;
};

export default function MpCuentaSelect({ value, onChange, cuentas, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = cuentas.find(c => c.id === value) ?? null;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const options = [
    { id: null, nombre: "Sin asignar", email_titular: null },
    ...cuentas.filter(c => c.activo),
  ];

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-2 bg-input border rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
          open ? "border-accent/50 ring-2 ring-accent/20" : "border-edge hover:border-accent/30"
        } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
              <span className="text-heading font-medium truncate">{selected.nombre}</span>
              {selected.email_titular && (
                <span className="text-muted text-xs truncate hidden sm:inline">{selected.email_titular}</span>
              )}
            </>
          ) : (
            <span className="text-muted">Sin asignar</span>
          )}
        </span>
        <svg
          className={`w-4 h-4 text-muted flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 right-0 bg-[#0f172a] border border-edge rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden">
          {options.map(opt => {
            const isSelected = opt.id === value;
            return (
              <button
                key={opt.id ?? "none"}
                type="button"
                onClick={() => { onChange(opt.id); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150 text-left ${
                  isSelected
                    ? "bg-accent/10 text-accent"
                    : "text-body hover:bg-elevated hover:text-heading"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isSelected ? "bg-accent" : opt.id ? "bg-muted/40" : "bg-transparent"}`} />
                <span className="flex-1 min-w-0">
                  <span className="block font-medium truncate">{opt.nombre}</span>
                  {opt.email_titular && (
                    <span className="block text-xs text-muted truncate">{opt.email_titular}</span>
                  )}
                </span>
                {isSelected && (
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
