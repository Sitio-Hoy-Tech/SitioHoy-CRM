"use client";

import { signOut, useSession } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <header className="bg-[--bg-secondary] border-b border-[--border-primary] px-6 py-3 flex items-center justify-between">
      <div />
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[--accent] flex items-center justify-center">
            <span className="text-white text-sm font-bold">
              {session?.user?.name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <span className="text-sm text-[--text-primary] font-medium">
            {session?.user?.name}
          </span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 text-sm text-[--text-muted] hover:text-[--text-primary] transition-colors px-3 py-1.5 rounded-lg border border-[--border-primary] hover:bg-[--bg-elevated]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Salir
        </button>
      </div>
    </header>
  );
}
