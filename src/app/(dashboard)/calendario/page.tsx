"use client";

const CALENDLY_USERNAME = process.env.NEXT_PUBLIC_CALENDLY_USERNAME || "";

export default function CalendarioPage() {
  if (!CALENDLY_USERNAME) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-[--text-primary] mb-4">Calendario</h1>
        <div className="bg-[--bg-card] rounded-xl border border-[--border-primary] p-12 text-center">
          <svg className="w-12 h-12 text-[--text-muted] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h2 className="text-lg font-semibold text-[--text-primary] mb-2">Calendly no configurado</h2>
          <p className="text-sm text-[--text-muted] max-w-md mx-auto">
            Configurá tu <code className="bg-[--bg-elevated] px-1 rounded">NEXT_PUBLIC_CALENDLY_USERNAME</code> en el archivo <code className="bg-[--bg-elevated] px-1 rounded">.env.local</code> para ver el calendario.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[--text-primary]">Calendario</h1>
          <p className="text-sm text-[--text-muted] mt-1">Reservas y llamadas programadas</p>
        </div>
        <a
          href={`https://calendly.com/${CALENDLY_USERNAME}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[--accent] bg-[--accent-soft] border border-[--accent-border] rounded-lg hover:bg-[--accent-soft] transition-colors"
        >
          Abrir en Calendly
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      <div className="bg-[--bg-card] rounded-xl border border-[--border-primary] overflow-hidden">
        <iframe
          src={`https://calendly.com/${CALENDLY_USERNAME}?hide_landing_page_details=1&hide_gdpr_banner=1`}
          className="w-full border-0"
          style={{ height: "calc(100vh - 200px)", minHeight: "700px" }}
          title="Calendly"
          loading="lazy"
        />
      </div>

      <p className="text-xs text-[--text-muted] mt-3 text-center">
        Powered by Calendly
      </p>
    </div>
  );
}
