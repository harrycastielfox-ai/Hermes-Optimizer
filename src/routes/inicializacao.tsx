import { createFileRoute } from "@tanstack/react-router";
import { Clock, ListChecks, ShieldCheck, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { fallbackStartupReport, loadStartupReport, type StartupImpact, type StartupReport } from "@/lib/startup";

export const Route = createFileRoute("/inicializacao")({
  head: () => ({
    meta: [
      { title: "Hermes Optimizer - Inicializacao" },
      { name: "description", content: "Leitura local dos programas de inicializacao do Hermes Optimizer." },
    ],
  }),
  component: InicializacaoPage,
});

function InicializacaoPage() {
  const [report, setReport] = useState<StartupReport>(fallbackStartupReport);

  useEffect(() => {
    let mounted = true;
    const timer = window.setTimeout(() => {
      loadStartupReport().then((nextReport) => {
        if (mounted) {
          setReport(nextReport);
        }
      });
    }, 250);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="lightning-bg min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 px-5 pt-6 pb-4 overflow-auto xl:px-8 xl:pt-7">
          <div className="mb-6">
            <p className="text-xs font-bold tracking-[0.22em] text-primary mb-2">STARTUP ENGINE</p>
            <h1 className="text-[clamp(26px,2vw,32px)] leading-tight font-bold tracking-tight text-foreground">Inicializacao</h1>
            <p className="text-[13px] text-muted-foreground mt-1">
              Leitura local dos programas que iniciam com o Windows. Nenhum item e desativado nesta fase.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 mb-4 lg:grid-cols-4">
            <SummaryCard icon={ListChecks} label="ITENS ENCONTRADOS" value={`${report.totalItems}`} sub="Somente leitura" />
            <SummaryCard icon={Zap} label="ALTO IMPACTO" value={`${report.highImpactCount}`} sub="Prioridade de revisao" />
            <SummaryCard icon={Clock} label="MEDIO IMPACTO" value={`${report.mediumImpactCount}`} sub="Pode afetar boot" />
            <SummaryCard icon={ShieldCheck} label="BAIXO IMPACTO" value={`${report.lowImpactCount}`} sub="Acompanhar" />
          </div>

          <section className="rounded-2xl bg-card border border-border/60 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-1 mb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-[0.18em] text-primary">PROGRAMAS DE INICIALIZACAO</h2>
                <p className="text-[12px] text-muted-foreground mt-1">Detecta e classifica impacto. Desativacao sera uma fase futura com confirmacao.</p>
              </div>
              <span className="inline-flex w-fit items-center rounded-full border border-success/20 bg-success/10 px-3 py-1 text-[11px] font-semibold text-success">
                Read-only
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-border/70">
              <div className="hidden grid-cols-[1.1fr_1.5fr_0.8fr_0.7fr] bg-muted/40 px-4 py-3 text-[11px] font-bold tracking-wider text-muted-foreground md:grid">
                <span>NOME</span>
                <span>CAMINHO</span>
                <span>IMPACTO</span>
                <span>STATUS</span>
              </div>

              <div className="divide-y divide-border/70">
                {report.items.map((item) => (
                  <div key={item.id} className="grid gap-3 px-4 py-3 md:grid-cols-[1.1fr_1.5fr_0.8fr_0.7fr] md:items-center">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground md:hidden">{item.location}</p>
                    </div>
                    <p className="min-w-0 truncate text-[12px] text-muted-foreground" title={item.command}>
                      {item.command}
                    </p>
                    <ImpactBadge impact={item.impact} />
                    <span className="w-fit rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-foreground">
                      {item.status === "active" ? "Ativo" : "Desconhecido"}
                    </span>
                  </div>
                ))}

                {report.items.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Nenhum programa de inicializacao foi encontrado pela leitura local.
                  </div>
                )}
              </div>
            </div>

            {report.warnings.length > 0 && (
              <div className="mt-3 rounded-xl bg-warning/10 px-3 py-2 text-[12px] text-warning">
                {report.warnings[0]}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub }: { icon: typeof Zap; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border/60 p-4 flex items-center gap-3 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
      <div className="w-11 h-11 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-wider text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold leading-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
      </div>
    </div>
  );
}

function ImpactBadge({ impact }: { impact: StartupImpact }) {
  const config = {
    high: { label: "Alto", className: "bg-warning/15 text-warning border-warning/25" },
    medium: { label: "Medio", className: "bg-info/15 text-info border-info/25" },
    low: { label: "Baixo", className: "bg-success/15 text-success border-success/25" },
  }[impact];

  return (
    <span className={`w-fit rounded-full border px-3 py-1 text-[11px] font-bold ${config.className}`}>
      {config.label}
    </span>
  );
}
