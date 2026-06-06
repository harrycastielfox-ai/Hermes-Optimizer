import type { LucideIcon } from "lucide-react";
import { ArrowRight, BrainCircuit, CalendarClock, LockKeyhole, MonitorCog, ShieldCheck, Wrench } from "lucide-react";

const settingsAreas: Array<{
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  status: string;
}> = [
  {
    title: "Seguranca e Recuperacao",
    description: "Snapshots, rollback, logs e relatorio local.",
    href: "#seguranca-recuperacao",
    icon: ShieldCheck,
    status: "Real",
  },
  {
    title: "Centro de Reparo",
    description: "Integridade do Windows, SFC e DISM preparados com confirmacao.",
    href: "#centro-reparo",
    icon: Wrench,
    status: "Seguro",
  },
  {
    title: "Manutencao Programada",
    description: "Tarefas locais conservadoras, sem servico residente.",
    href: "#manutencao-programada",
    icon: CalendarClock,
    status: "Local",
  },
  {
    title: "Hermes AI",
    description: "Score, problemas, fontes usadas e plano de acao.",
    href: "#hermes-ai",
    icon: BrainCircuit,
    status: "Read-only",
  },
  {
    title: "Configuracoes Completas",
    description: "Atualizacoes, aparencia, notificacoes, idioma e licenca.",
    href: "#configuracoes-completas",
    icon: MonitorCog,
    status: "Preparado",
  },
  {
    title: "Privacidade",
    description: "Local first, sem nuvem obrigatoria e sem telemetria ativa.",
    href: "#configuracoes-completas",
    icon: LockKeyhole,
    status: "Offline",
  },
];

export function HermesSettingsOverview() {
  return (
    <section className="mb-5 rounded-2xl border border-border/60 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_34px_-20px_rgba(15,23,42,0.16)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold tracking-[0.22em] text-primary">CENTRAL HERMES</p>
          <h2 className="mt-1 text-lg font-bold text-foreground">Mapa rapido de configuracoes</h2>
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Atalhos internos para as areas administrativas, mantendo tudo local e sem mudar a estrutura principal do app.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {settingsAreas.map((area) => (
          <a
            key={area.title}
            href={area.href}
            className="group flex min-h-[104px] items-start gap-3 rounded-2xl border border-border/70 bg-background/70 p-4 transition hover:-translate-y-0.5 hover:border-primary/25 hover:bg-primary/5 hover:shadow-[0_14px_34px_-28px_rgba(37,99,235,0.9)]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <area.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold leading-tight text-foreground">{area.title}</h3>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                  {area.status}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">{area.description}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-primary">
                Abrir area
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
