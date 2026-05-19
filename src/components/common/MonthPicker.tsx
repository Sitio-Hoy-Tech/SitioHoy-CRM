"use client";

import { useState, useRef, useEffect } from "react";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MESES_FULL = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

interface MonthPickerProps {
  value: string; // YYYY-MM
  onChange: (value: string) => void;
}

export default function MonthPicker({ value, onChange }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedYear = value ? parseInt(value.split("-")[0]) : new Date().getFullYear();
  const selectedMonth = value ? parseInt(value.split("-")[1]) - 1 : new Date().getMonth();
  const [viewYear, setViewYear] = useState(selectedYear);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function select(monthIndex: number) {
    const month = String(monthIndex + 1).padStart(2, "0");
    onChange(`${viewYear}-${month}`);
    setOpen(false);
  }

  const label = value
    ? `${MESES_FULL[selectedMonth]} ${selectedYear}`
    : "Seleccionar mes";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setViewYear(selectedYear); setOpen(o => !o); }}
        className="flex items-center gap-2 bg-[#0f172a]/80 border border-edge rounded-lg px-3.5 py-2 text-sm text-heading hover:border-accent/50 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all whitespace-nowrap"
      >
        <svg className="w-4 h-4 text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="capitalize">{label}</span>
        <svg className={`w-3.5 h-3.5 text-muted transition-transform ml-1 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-[#0f172a] border border-edge rounded-xl shadow-2xl overflow-hidden animate-fade-in">
          {/* Header año */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-edge">
            <button
              type="button"
              onClick={() => setViewYear(y => y - 1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-heading hover:bg-elevated transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-bold text-heading">{viewYear}</span>
            <button
              type="button"
              onClick={() => setViewYear(y => y + 1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-heading hover:bg-elevated transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Grid de meses */}
          <div className="grid grid-cols-3 gap-1 p-3">
            {MESES.map((mes, i) => {
              const isSelected = viewYear === selectedYear && i === selectedMonth;
              const isCurrentMonth = viewYear === new Date().getFullYear() && i === new Date().getMonth();
              return (
                <button
                  key={mes}
                  type="button"
                  onClick={() => select(i)}
                  className={`py-2 rounded-lg text-sm font-medium transition-all ${
                    isSelected
                      ? "bg-accent text-white shadow-sm"
                      : isCurrentMonth
                      ? "text-accent border border-accent/30 hover:bg-accent/10"
                      : "text-body hover:bg-elevated hover:text-heading"
                  }`}
                >
                  {mes}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
