import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";

export default async function DashboardPage() {
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

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-heading mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <Link
          href="/contactos"
          className="bg-card rounded-xl border border-edge p-6 hover:border-accent-border transition-all duration-300 group"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-accent/15 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted font-medium">Contactos</p>
              <p className="text-3xl font-bold text-heading mt-1">{totalContactos.toLocaleString("es-AR")}</p>
            </div>
          </div>
        </Link>

        <Link
          href="/clientes"
          className="bg-card rounded-xl border border-edge p-6 hover:border-accent-border transition-all duration-300 group"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-accent/15 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted font-medium">Clientes</p>
              <p className="text-3xl font-bold text-heading mt-1">{totalClientes.toLocaleString("es-AR")}</p>
            </div>
          </div>
        </Link>
      </div>

      <h2 className="text-base font-semibold text-heading mb-3">Accesos rápidos</h2>
      <div className="flex gap-3">
        <Link
          href="/contactos/nuevo"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
          </svg>
          Nuevo contacto
        </Link>
        <Link
          href="/clientes/nuevo"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-accent border border-accent-border bg-accent-soft rounded-lg hover:bg-accent/15 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
          </svg>
          Nuevo cliente
        </Link>
      </div>
    </div>
  );
}
