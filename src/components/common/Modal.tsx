"use client";

import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative z-50 w-[90%] max-w-md rounded-[2rem] shadow-[0_32px_64px_-15px_rgba(0,0,0,0.8)] border border-white/10 text-heading overflow-hidden animate-fade-in"
        style={{
          background: 'linear-gradient(160deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <h2 className="text-xl font-bold text-heading tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-heading transition-all p-2 rounded-xl hover:bg-white/10 group"
          >
            <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido */}
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
