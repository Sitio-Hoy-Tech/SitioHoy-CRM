import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();

  const [contactosRes, clientesRes] = await Promise.all([
    supabaseAdmin
      .from("contactos")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    supabaseAdmin
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
  ]);

  const totalContactos = contactosRes.count ?? 0;
  const totalClientes = clientesRes.count ?? 0;

  const stats = [
    {
      label: "Contactos",
      value: totalContactos,
      href: "/contactos",
      icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    },
    {
      label: "Clientes",
      value: totalClientes,
      href: "/clientes",
      icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[--text-primary]">
          Hola, {session?.user?.name}
        </h1>
        <p className="text-[--text-muted] mt-1 text-sm">
          Resumen de tu CRM
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-[--bg-card] rounded-xl border border-[--border-primary] p-6 hover:border-[--accent-border] hover:bg-[--bg-card-hover] transition-all duration-300 group"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-[--text-muted] font-medium">{stat.label}</p>
              <svg className="w-5 h-5 text-[--text-muted] group-hover:text-[--accent] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={stat.icon} />
              </svg>
            </div>
            <p className="text-3xl font-bold text-[--text-primary]">{stat.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
        <Link
          href="/contactos/nuevo"
          className="flex items-center gap-4 bg-[--bg-card] rounded-xl border border-[--border-primary] p-6 hover:border-[--accent-border] transition-all duration-300 group"
        >
          <div className="w-12 h-12 bg-[--accent-soft] border border-[--accent-border] rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
            <svg className="w-6 h-6 text-[--accent]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-[--text-primary]">Nuevo contacto</h3>
            <p className="text-sm text-[--text-muted]">Registrar un nuevo contacto</p>
          </div>
        </Link>

        <Link
          href="/clientes/nuevo"
          className="flex items-center gap-4 bg-[--bg-card] rounded-xl border border-[--border-primary] p-6 hover:border-[--accent-border] transition-all duration-300 group"
        >
          <div className="w-12 h-12 bg-[--accent-soft] border border-[--accent-border] rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
            <svg className="w-6 h-6 text-[--accent]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-[--text-primary]">Nuevo cliente</h3>
            <p className="text-sm text-[--text-muted]">Registrar un nuevo cliente</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
