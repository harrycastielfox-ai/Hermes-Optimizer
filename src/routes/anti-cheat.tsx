import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, LockKeyhole, RefreshCw, Shield } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import {
  analyzeAntiCheat,
  fallbackAntiCheatReport,
  loadCachedAntiCheatReport,
  type AntiCheatCheck,
  type AntiCheatReport,
} from "@/lib/anti-cheat";

export const Route = createFileRoute("/anti-cheat")({
  head: () => ({
    meta: [
      { title: "Hermes Optimizer - Anti-Cheat" },
      { name: "description", content: "Compatibilidade local com anti-cheats modernos." },
    ],
  }),
  component: AntiCheatPage,
});

function AntiCheatPage() {
  const [report, setReport] = useState<AntiCheatReport>(fallbackAntiCheatReport);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    setReport(loadCachedAntiCheatReport());
  }, []);

  const executeAnalysis = useCallback(async () => {
    if (isRunning) return;

    setIsRunning(true);
    try {
      setReport(await analyzeAntiCheat());
    } finally {
      setIsRunning(false);
    }
  }, [isRunning]);

  return (
    <div className="lightning-bg min-h-screen flex">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-auto px-5 pb-4 pt-6 xl:px-8 xl:pt-7">
          <div className="mb-6">
            <p className="mb-2 text-xs font-bold tracking-[0.22em] text-primary">
              COMPATIBILIDADE COMPETITIVA
            </p>
            <h1 className="text-[clamp(26px,2vw,32px)] font-bold leading-tight tracking-tight text-foreground">
              Anti-Cheat
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Verifique TPM, Secure Boot, integridade do sistema e servicos de jogos sem alterar o
              Windows.
            </p>
          </div>

          <AntiCheatCard report={report} isRunning={isRunning} onAnalyze={executeAnalysis} />
        </main>
      </div>
    </div>
  );
}

function AntiCheatCard({
  report,
  isRunning,
  onAnalyze,
}: {
  report: AntiCheatReport;
  isRunning: boolean;
  onAnalyze: () => void;
}) {
  const [showActivationGuide, setShowActivationGuide] = useState(false);
  const hasAnalyzed = report.generatedAt !== "0";
  const checklist = [
    report.checks.tpm,
    report.checks.secureBoot,
    report.checks.coreIsolation,
    report.checks.driverSignature,
    report.services.riotVanguard,
    report.services.easyAntiCheat,
    report.services.faceit,
    report.services.battleye,
  ];
  const activationItems = hasAnalyzed ? buildActivationItems(report) : [];

  return (
    <section className="max-w-5xl rounded-2xl border border-border/60 bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft">
              <LockKeyhole className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-foreground">Anti-Cheat</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${antiCheatTone(report.score)}`}
                >
                  {report.status}
                </span>
              </div>
              <p className="text-[13px] text-muted-foreground">
                Compatibilidade com anti-cheats modernos
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <SafetyBadge label="Leitura" />
            <SafetyBadge label="Seguro" />
            <SafetyBadge label="Sem alteracoes" />
          </div>
        </div>

        <div className="shrink-0 md:text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Anti-Cheat Score
          </p>
          <p className="text-3xl font-bold leading-tight text-foreground">{report.score}/100</p>
        </div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${report.score}%` }} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {checklist.map((check) => (
          <ChecklistItem key={check.label} check={check} />
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
        <p className="text-[10px] font-bold tracking-[0.18em] text-primary">HERMES AI</p>
        <p className="mt-1 text-[13px] text-muted-foreground">{report.summary}</p>
      </div>

      {report.warnings.length > 0 && (
        <div className="mt-3 rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 text-[12px] text-warning">
          {report.warnings[0]}
        </div>
      )}

      {showActivationGuide && hasAnalyzed && (
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            Guia seguro
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            O Hermes mostra o caminho recomendado sem alterar BIOS, drivers, jogos ou configuracoes
            do Windows.
          </p>
          <div className="mt-3 space-y-2">
            {activationItems.length > 0 ? (
              activationItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-border/60 bg-card/65 px-3 py-2"
                >
                  <p className="text-[12px] font-bold text-foreground">{item.label}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{item.guidance}</p>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-300">
                Nenhuma funcao desativada foi detectada nesta leitura.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-5">
        {hasAnalyzed ? (
          <button
            type="button"
            onClick={() => setShowActivationGuide((current) => !current)}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/70 bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[0_0_22px_rgba(37,99,235,0.42),0_16px_32px_-18px_rgba(37,99,235,0.95)] transition hover:bg-primary/95"
          >
            <Shield className="h-4 w-4" />
            {showActivationGuide ? "Ocultar guia seguro" : "Ativar funcoes desativadas"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onAnalyze}
            disabled={isRunning}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[0_12px_26px_-18px_rgba(37,99,235,0.95)] transition hover:bg-primary/95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isRunning ? "animate-spin" : ""}`} />
            Analisar Anti-Cheat
          </button>
        )}
      </div>
    </section>
  );
}

function ChecklistItem({ check }: { check: AntiCheatCheck }) {
  const iconClass = check.ok
    ? "text-emerald-500"
    : check.status === "Aguardando"
      ? "text-muted-foreground"
      : "text-warning";
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/60 px-3 py-3">
      <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`} />
      <div className="min-w-0">
        <p className="truncate text-[12px] font-bold text-foreground">{check.label}</p>
        <p className="truncate text-[11px] text-muted-foreground">{check.status}</p>
      </div>
    </div>
  );
}

function SafetyBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
      {label}
    </span>
  );
}

function buildActivationItems(report: AntiCheatReport) {
  const checks = [
    {
      check: report.checks.tpm,
      guidance: "Verifique no BIOS/UEFI se TPM, Intel PTT ou AMD fTPM esta ativo.",
    },
    {
      check: report.checks.secureBoot,
      guidance:
        "Confira o Secure Boot no BIOS/UEFI. Alguns jogos competitivos exigem esse recurso.",
    },
    {
      check: report.checks.coreIsolation,
      guidance: "Abra Seguranca do Windows > Seguranca do dispositivo > Isolamento do nucleo.",
    },
    {
      check: report.checks.driverSignature,
      guidance: "Prefira atualizar drivers pelo fabricante quando houver driver nao assinado.",
    },
    {
      check: report.services.riotVanguard,
      guidance: "Abra o Riot Client ou Valorant e use o reparo oficial do Vanguard.",
    },
    {
      check: report.services.easyAntiCheat,
      guidance: "Abra o jogo ou launcher e utilize o reparo oficial do Easy Anti-Cheat.",
    },
    {
      check: report.services.faceit,
      guidance: "Abra o FACEIT Anti-Cheat oficial e confira se esta instalado e ativo.",
    },
    {
      check: report.services.battleye,
      guidance: "Abra o jogo ou launcher e permita a inicializacao oficial do BattlEye.",
    },
  ];

  return checks
    .filter(({ check }) => !check.ok && check.status !== "Aguardando")
    .map(({ check, guidance }) => ({ label: check.label, guidance }));
}

function antiCheatTone(score: number) {
  if (score >= 85)
    return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20";
  if (score >= 60)
    return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/20";
  if (score > 0)
    return "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20";
  return "bg-muted text-muted-foreground ring-border";
}
