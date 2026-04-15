"use client";

import { ReactNode } from "react";

interface FiltersBarProps {
  children: ReactNode;
  onClear?: () => void;
  showClear?: boolean;
}

export default function FiltersBar({ children, onClear, showClear = false }: FiltersBarProps) {
  return (
    <div className="glass rounded-xl border border-edge/30 p-4 mb-8 animate-fade-in shadow-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Label Section */}
          <div className="flex items-center gap-2.5 text-muted/70 mr-2 select-none">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10 shadow-inner">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] leading-tight">Filtros</span>
              <span className="text-[9px] font-medium opacity-50 uppercase tracking-wider">Avanzados</span>
            </div>
          </div>
          
          <div className="h-6 w-px bg-edge/30 hidden md:block mx-1" />

          {/* Filters Content */}
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {children}
          </div>
        </div>
        
        {/* Actions Section */}
        {showClear && (
          <div className="flex items-center lg:border-l lg:border-edge/30 lg:pl-4 transition-all duration-300">
            <button
              onClick={onClear}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-muted hover:text-white hover:bg-white/5 border border-edge/50 hover:border-white/20 rounded-lg transition-all duration-300 group shadow-sm active:scale-95"
              title="Restablecer todos los filtros"
            >
              <svg 
                className="w-3.5 h-3.5 transition-transform duration-500 group-hover:rotate-180" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Limpiar filtros</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
