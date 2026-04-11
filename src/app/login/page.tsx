"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Email o contraseña incorrectos");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[--bg-primary] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[--accent] opacity-[0.04] rounded-full blur-3xl" />

      <div className="w-full max-w-sm relative z-10 animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[--accent] flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <h1 className="text-2xl font-bold text-[--text-primary]">CRM SitioHoy</h1>
          <p className="text-[--text-muted] mt-1 text-sm">Ingresá a tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[--bg-card] rounded-2xl border border-[--border-primary] p-8 space-y-5 shadow-lg">
          {error && (
            <div className="bg-[--danger-soft] text-[--danger] text-sm rounded-xl p-3.5 text-center border border-red-500/20">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[--text-secondary] mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[--bg-input] border border-[--border-primary] rounded-lg px-4 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:outline-none focus:ring-2 focus:ring-[--accent]/30 focus:border-[--accent] transition-all"
              placeholder="tu@sitiohoy.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[--text-secondary] mb-1.5">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[--bg-input] border border-[--border-primary] rounded-lg px-4 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:outline-none focus:ring-2 focus:ring-[--accent]/30 focus:border-[--accent] transition-all"
              placeholder="Tu contraseña"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[--accent] text-white font-medium rounded-lg px-4 py-2.5 hover:bg-[--accent-hover] focus:outline-none focus:ring-2 focus:ring-[--accent]/40 focus:ring-offset-2 focus:ring-offset-[--bg-card] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className="text-center text-[--text-muted] text-xs mt-6">
          sitiohoy.com.ar
        </p>
      </div>
    </div>
  );
}
