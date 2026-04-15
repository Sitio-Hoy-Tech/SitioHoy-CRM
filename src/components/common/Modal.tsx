"use client";

import { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="backdrop:bg-black/20 backdrop:backdrop-blur-xl rounded-[2rem] p-0 w-[90%] max-w-md shadow-[0_32px_64px_-15px_rgba(0,0,0,0.8)] border border-white/10 text-heading outline-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
      }}
    >
      <div className="flex flex-col h-full animate-fade-in">
        {/* Header del Modal */}
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

        {/* Contenido del Modal */}
        <div className="p-8">
          {children}
        </div>
      </div>
    </dialog>
  );
}
