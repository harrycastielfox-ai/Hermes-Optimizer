import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Eye, Gauge, Gamepad2, LockKeyhole, MonitorCog, Palette, Power, ShieldCheck, Sparkles, Terminal, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import {
  applyAdvancedActions,
  fallbackAdvancedCatalog,
  loadAdvancedCatalog,
  type AdvancedAction,
  type AdvancedApplyResult,
  type AdvancedCatalog,
  type AdvancedMethod,
  type AdvancedRisk,
} from "@/lib/advanced";
import { fallbackPerformanceReport, loadPerformanceReport, type PerformanceReport, type PerformanceSetting } from "@/lib/performance";

export const Route = createFileRoute("/otimizacoes")({
  head: () => ({
    meta: [
      { title: "Hermes Optimizer - Otimizacoes" },
      { name: "description", content: "Performance Engine somente leitura do Hermes Optimizer." },
    ],
  }),
  component: OtimizacoesPage,
});

function OtimizacoesPage() {
  const [report, setReport] = useState<PerformanceReport>(fallbackPerformanceReport);
  const [advancedCatalog, setAdvancedCatalog] = useState<AdvancedCatalog>(fallbackAdvancedCatalog);
  const [advancedResult, setAdvancedResult] = useState<AdvancedApplyResult | null>(null);
  const [advancedError, setAdvancedError] = useState<string | null>(null);
  const [isAdvancedApplying, setIsAdvancedApplying] = useState(false);

  useEffect(() => {
    let mounted = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        const nextReport = await loadPerformanceReport();
        if (!mounted) {
          return;
        }
        setReport(nextReport);

        const nextCatalog = await loadAdvancedCatalog();
        if (!mounted) {
          return;
        }
        setAdvancedCatalog(nextCatalog);
      })();
    }, 350);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, []);

  async function runAdvanced(dryRun: boolean) {
    setAdvancedError(null);
    setAdvancedResult(null);

    if (!dryRun) {
      const confirmed = window.confirm("Aplicar comandos avancados allowlistados? Um snapshot sera criado antes.");
      if (!confirmed) {
        return;
      }
    }

    setIsAdvancedApplying(true);
    try {
      const nextResult = await applyAdvancedActions({
        confirmed: !dryRun,
        dryRun,
        actionIds: advancedCatalog.actions.map((action) => action.id),
      });
      setAdvancedResult(nextResult);
      const nextCatalog = await loadAdvancedCatalog();
      setAdvancedCatalog(nextCatalog);
    } catch (nextError) {
      setAdvancedError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setIsAdvancedApplying(false);
    }
  }

  return (
    <div className="lightning-bg min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 px-5 pt-6 pb-4 overflow-auto xl:px-8 xl:pt-7">
          <div className="mb-6">
            <p className="text-xs font-bold tracking-[0.22em] text-primary mb-2">PERFORMANCE ENGINE</p>
            <h1 className="text-[clamp(26px,2vw,32px)] leading-tight font-bold tracking-tight text-foreground">Otimizacoes</h1>
            <p className="text-[13px] text-muted-foreground mt-1">
              Leitura local de configuracoes de desempenho. Nenhum ajuste e aplicado nesta fase.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 mb-4 lg:grid-cols-4">
            <SummaryCard icon={Power} label="ENERGIA" value={report.powerPlan.status} sub={report.powerPlan.activeSchemeName} />
            <SummaryCard icon={Gamepad2} label="GAME MODE" value={report.gameMode.status} sub="Registro do usuario" />
            <SummaryCard icon={Palette} label="EFEITOS VISUAIS" value={report.visualEffects.status} sub={report.visualEffects.profile} />
            <SummaryCard icon={MonitorCog} label="SEGUNDO PLANO" value={report.backgroundApps.status} sub="Apps em background" />
          </div>

          <section className="rounded-2xl bg-card border border-border/60 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-1 mb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-[0.18em] text-primary">CONFIGURACOES DETECTADAS</h2>
                <p className="text-[12px] text-muted-foreground mt-1">
                  Dados coletados via PowerShell, CMD e Registro. Alteracoes ficam para a fase controlada.
                </p>
              </div>
              <span className="inline-flex w-fit items-center rounded-full border border-success/20 bg-success/10 px-3 py-1 text-[11px] font-semibold text-success">
                Read-only
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {report.settings.map((item) => (
                <SettingRow key={item.id} item={item} />
              ))}
            </div>

            {report.warnings.length > 0 && (
              <div className="mt-3 rounded-xl bg-warning/10 px-3 py-2 text-[12px] text-warning">
                {report.warnings[0]}
              </div>
            )}
          </section>

          <section className="mt-4 rounded-2xl bg-card border border-border/60 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
            <h2 className="text-sm font-bold tracking-[0.18em] text-primary">PREPARADO PARA REVERSAO</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A Performance Engine ja esta separada para usar snapshots da Restore Engine antes de qualquer ajuste real futuro.
            </p>
          </section>

          <AdvancedEnginePanel
            catalog={advancedCatalog}
            result={advancedResult}
            error={advancedError}
            isApplying={isAdvancedApplying}
            onRun={runAdvanced}
          />
        </main>
      </div>
    </div>
  );
}

function AdvancedEnginePanel({
  catalog,
  result,
  error,
  isApplying,
  onRun,
}: {
  catalog: AdvancedCatalog;
  result: AdvancedApplyResult | null;
  error: string | null;
  isApplying: boolean;
  onRun: (dryRun: boolean) => void;
}) {
  return (
    <section className="mt-4 rounded-2xl bg-card border border-border/60 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-sm font-bold tracking-[0.18em] text-primary">CMD / REGISTRO / POWERSHELL</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Acoes avancadas com allowlist, snapshot e rollback. Itens perigosos ficam bloqueados.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={isApplying}
            onClick={() => onRun(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
          >
            <CheckCircle2 className="w-4 h-4" />
            Validar
          </button>
          <button
            type="button"
            disabled={isApplying}
            onClick={() => onRun(false)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[0_10px_26px_-14px_rgba(37,99,235,0.85)] transition hover:bg-primary/95 disabled:opacity-60"
          >
            <Terminal className="w-4 h-4" />
            Aplicar
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
        {catalog.actions.map((action) => (
          <AdvancedActionRow key={action.id} action={action} />
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-border/70 bg-background/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <LockKeyhole className="w-4 h-4 text-primary" />
          <h3 className="text-[11px] font-bold tracking-[0.18em] text-primary">BLOQUEADOS NESTA FASE</h3>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 xl:grid-cols-2">
          {catalog.blockedActions.map((item) => (
            <div key={item.id} className="rounded-xl border border-border/70 bg-card px-3 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
              </div>
              <p className="mt-1 text-[12px] text-muted-foreground">{item.reason}</p>
            </div>
          ))}
        </div>
      </div>

      {result && (
        <div className="mt-4 rounded-xl border border-success/20 bg-success/10 px-4 py-3">
          <p className="text-sm font-semibold text-success">{result.dryRun ? "Dry-run avancado concluido" : "Acoes avancadas aplicadas"}</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Snapshot: {result.snapshotId}. {result.message}
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          {error}
        </div>
      )}

      {catalog.warnings.length > 0 && (
        <div className="mt-3 rounded-xl bg-warning/10 px-3 py-2 text-[12px] text-warning">
          {catalog.warnings[0]}
        </div>
      )}
    </section>
  );
}

function AdvancedActionRow({ action }: { action: AdvancedAction }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/70 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{action.title}</p>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${riskVisual(action.risk)}`}>
              {riskLabel(action.risk)}
            </span>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              {methodLabel(action.method)}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground">{action.description}</p>
          <p className="mt-2 truncate text-[11px] text-muted-foreground" title={action.commandPreview}>
            {action.commandPreview}
          </p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="text-[11px] text-muted-foreground">Atual</p>
          <p className="text-sm font-semibold text-foreground">{action.currentValue}</p>
          <p className="mt-1 text-[11px] font-semibold text-primary">{action.plannedChange}</p>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub }: { icon: typeof Power; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border/60 p-4 flex items-center gap-3 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
      <div className="w-11 h-11 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-wider text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold leading-tight truncate">{value}</p>
        <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
      </div>
    </div>
  );
}

function methodLabel(method: AdvancedMethod) {
  if (method === "cmd") {
    return "CMD";
  }

  if (method === "powerShell") {
    return "PowerShell";
  }

  return "Registro";
}

function riskLabel(risk: AdvancedRisk) {
  if (risk === "high") {
    return "Risco alto";
  }

  if (risk === "medium") {
    return "Risco medio";
  }

  return "Risco baixo";
}

function riskVisual(risk: AdvancedRisk) {
  if (risk === "high") {
    return "bg-destructive/10 text-destructive border-destructive/20";
  }

  if (risk === "medium") {
    return "bg-warning/15 text-warning border-warning/25";
  }

  return "bg-success/15 text-success border-success/25";
}

function SettingRow({ item }: { item: PerformanceSetting }) {
  const Icon = getSettingIcon(item.id);
  const visual = getStatusVisual(item.status);

  return (
    <div className="rounded-xl border border-border/70 bg-background/70 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{item.label}</p>
            <p className="text-[12px] text-muted-foreground truncate">{item.source}</p>
          </div>
        </div>
        <span className={`w-fit rounded-full border px-3 py-1 text-[11px] font-bold ${visual}`}>
          {item.value}
        </span>
      </div>
    </div>
  );
}

function getSettingIcon(id: string) {
  if (id === "power-plan") {
    return Power;
  }

  if (id === "game-mode") {
    return Gamepad2;
  }

  if (id === "transparency") {
    return Eye;
  }

  if (id === "animations" || id === "shadows") {
    return Sparkles;
  }

  if (id === "background-apps") {
    return Gauge;
  }

  return ShieldCheck;
}

function getStatusVisual(status: PerformanceSetting["status"]) {
  if (status === "optimized" || status === "disabled") {
    return "bg-success/15 text-success border-success/25";
  }

  if (status === "balanced") {
    return "bg-info/15 text-info border-info/25";
  }

  if (status === "enabled") {
    return "bg-warning/15 text-warning border-warning/25";
  }

  return "bg-muted text-muted-foreground border-border";
}
