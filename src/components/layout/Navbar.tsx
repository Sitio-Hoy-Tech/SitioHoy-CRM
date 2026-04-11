"use client";

import { signOut, useSession } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <header className="bg-[--bg-secondary] border-b border-[--border-primary] px-6 py-3 flex items-center justify-between">
      <div />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[--accent-soft] border border-[--accent-border] flex items-center justify-center">
            <span className="text-[--accent] text-xs font-bold">
              {session?.user?.name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <span className="text-sm text-[--text-secondary] font-medium">
            {session?.user?.name}
          </span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-[--text-muted] hover:text-[--danger] transition-colors px-2 py-1 rounded-md hover:bg-[--danger-soft]"
        >
          Salir
        </button>
      </div>
    </header>
  );
}
