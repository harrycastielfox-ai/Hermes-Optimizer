import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadAdvisorAiReport, type AdvisorAiReport } from "@/lib/advisor-ai";
import { loadCleanScanReport, type CleanScanReport } from "@/lib/clean";
import { loadDiagnosticReport, type DiagnosticReport } from "@/lib/diagnostic";
import { runOptimizeNowPlan, type OptimizeNowPlan } from "@/lib/optimizer";
import { loadPerformanceReport, type PerformanceReport } from "@/lib/performance";
import { createRestoreSnapshot, type RestoreSnapshot } from "@/lib/restore";
import { loadStartupReport, type StartupReport } from "@/lib/startup";

type StageStatus = "pending" | "running" | "completed" | "prepared" | "failed" | "cancelled";
type RunStatus = "idle" | "running" | "completed" | "cancelled" | "failed";

type OptimizationStage = {
  id: string;
  title: string;
  engine: string;
  description: string;
  status: StageStatus;
  realProgress: boolean;
  source: string;
  outputs: string[];
};

type OptimizationLog = {
  id: string;
  level: "info" | "warning" | "error";
  message: string;
};

type OptimizationSummary = {
  diagnostic?: DiagnosticReport;
  clean?: CleanScanReport;
  startup?: StartupReport;
  performance?: PerformanceReport;
  plan?: OptimizeNowPlan;
  advisorAi?: AdvisorAiReport;
  snapshot?: RestoreSnapshot;
};

const stageTemplates: OptimizationStage[] = [
  stage("snapshot", "Criando snapshot de seguranca", "Restore Engine", "Registro local antes de qualquer acao real."),
  stage("diagnostic", "Analisando sistema", "Diagnostic Engine", "Leitura de CPU, RAM, disco, seguranca e saude geral."),
  stage("clean", "Escaneando limpeza segura", "Clean Engine", "Calcula temporarios e caches sem apagar arquivos."),
  stage("startup", "Analisando inicializacao", "Startup Engine", "Classifica programas que iniciam com o Windows."),
  stage("performance", "Calculando otimizacoes", "Performance Engine", "Le plano de energia, Game Mode e efeitos visuais."),
  stage("apply", "Aplicando perfil/acoes seguras", "Profiles Engine", "Ponto de confirmacao para acoes reais reversiveis."),
  stage("report", "Gerando relatorio final", "Hermes AI Local", "Resume fontes, beneficios e recomendacoes locais."),
];

export function PremiumOptimizationModal({
  open,
  runKey,
  onClose,
}: {
  open: boolean;
  runKey: number;
  onClose: () => void;
}) {
  const [stages, setStages] = useState<OptimizationStage[]>(() => resetStages());
  const [logs, setLogs] = useState<OptimizationLog[]>([]);
  const [benefits, setBenefits] = useState<string[]>([]);
  const [summary, setSummary] = useState<OptimizationSummary>({});
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [currentStatus, setCurrentStatus] = useState("Aguardando inicio seguro.");
  const cancelRequested = useRef(false);
  const activeRun = useRef(0);

  useEffect(() => {
    if (!open) {
      return;
    }

    activeRun.current += 1;
    const runId = activeRun.current;
    cancelRequested.current = false;
    setStages(resetStages());
    setLogs([]);
    setBenefits([]);
    setSummary({});
    setRunStatus("running");
    setCurrentStatus("Preparando Hermes Optimization Engine.");
    void runOptimizationFlow(runId);
  }, [open, runKey]);

  const processedStages = useMemo(
    () => stages.filter((item) => item.status !== "pending" && item.status !== "running").length,
    [stages],
  );
  const progress = Math.round((processedStages / stages.length) * 100);
  const activeStage = stages.find((item) => item.status === "running");
  const snapshotId = summary.snapshot?.id;

  async function runOptimizationFlow(runId: number) {
    const nextSummary: OptimizationSummary = {};
    const nextBenefits: string[] = [];

    try {
      await executeStage(runId, "snapshot", async () => {
        if (!isTauriRuntime()) {
          return prepared("Restore Engine real disponivel somente dentro do app Tauri.", [
            "Snapshot local preparado para o app desktop.",
            "Nenhuma alteracao foi simulada como concluida.",
          ]);
        }

        const snapshot = await createRestoreSnapshot({
          name: "Hermes Optimization Engine",
          description: "Snapshot local criado para o fluxo premium Otimizar Agora.",
          plannedActions: [
            {
              id: "optimize-now-readonly",
              engine: "Hermes Optimization Engine",
              title: "Fluxo Otimizar Agora",
              description: "Coletar diagnostico, limpeza, inicializacao, performance e relatorio local.",
              risk: "low",
              willModifySystem: false,
              requiresAdmin: false,
            },
          ],
          rollbackManifest: [],
          previousState: [
            {
              key: "uxPremium",
              category: "metadata",
              value: "Otimizar Agora iniciado em modo seguro.",
              source: "Hermes UX Premium",
              captured: true,
            },
          ],
        });
        nextSummary.snapshot = snapshot;
        setSummary((current) => ({ ...current, snapshot }));

        return completed("Snapshot local criado pelo Restore Engine.", [
          `Snapshot: ${snapshot.id}`,
          "Retencao local e rollback estrutural preservados.",
        ]);
      });

      if (shouldStop(runId)) return;

      await executeStage(runId, "diagnostic", async () => {
        const diagnostic = await loadDiagnosticReport();
        nextSummary.diagnostic = diagnostic;
        setSummary((current) => ({ ...current, diagnostic }));
        nextBenefits.push(`${Math.round(diagnostic.healthScore)}/100 de saude geral`);
        nextBenefits.push(`${formatGb(diagnostic.disk.freeGb)} GB livres no disco ${diagnostic.disk.mount}`);
        setBenefits([...nextBenefits]);

        return stageResultFromRuntime("Diagnostic Engine lido com sucesso.", [
          `CPU: ${Math.round(diagnostic.cpu.usagePercent)}%`,
          `RAM: ${Math.round(diagnostic.ram.usedPercent)}% em uso`,
          `Disco: ${Math.round(diagnostic.disk.usedPercent)}% em uso`,
        ]);
      });

      if (shouldStop(runId)) return;

      await executeStage(runId, "clean", async () => {
        const clean = await loadCleanScanReport();
        nextSummary.clean = clean;
        setSummary((current) => ({ ...current, clean }));
        nextBenefits.push(`${formatGb(clean.totalGb)} GB candidatos a limpeza segura`);
        setBenefits([...nextBenefits]);

        return stageResultFromRuntime("Scan de limpeza concluido sem apagar arquivos.", [
          `${clean.items.length} areas allowlistadas analisadas`,
          `Protegido: ${clean.protectedLocations.slice(0, 4).join(", ")}`,
        ]);
      });

      if (shouldStop(runId)) return;

      await executeStage(runId, "startup", async () => {
        const startup = await loadStartupReport();
        nextSummary.startup = startup;
        setSummary((current) => ({ ...current, startup }));
        nextBenefits.push(`${startup.totalItems} itens de inicializacao detectados`);
        setBenefits([...nextBenefits]);

        return stageResultFromRuntime("Inicializacao analisada em modo seguro.", [
          `${startup.highImpactCount} alto impacto`,
          `${startup.mediumImpactCount} medio impacto`,
          `${startup.disabledItems} ja desativado(s) pelo Hermes`,
        ]);
      });

      if (shouldStop(runId)) return;

      await executeStage(runId, "performance", async () => {
        const [performance, plan] = await Promise.all([loadPerformanceReport(), runOptimizeNowPlan()]);
        nextSummary.performance = performance;
        nextSummary.plan = plan;
        setSummary((current) => ({ ...current, performance, plan }));
        nextBenefits.push(`Plano atual: ${performance.powerPlan.activeSchemeName}`);
        setBenefits([...nextBenefits]);

        return stageResultFromRuntime("Otimizacoes calculadas sem aplicar ajustes.", [
          `Game Mode: ${performance.gameMode.status}`,
          `Efeitos visuais: ${performance.visualEffects.status}`,
          `${plan.summary.totalStages} etapas no plano seguro`,
        ]);
      });

      if (shouldStop(runId)) return;

      await executeStage(runId, "apply", async () =>
        prepared("Acoes reais aguardam confirmacao dedicada.", [
          "Nenhuma limpeza, perfil ou tweak foi aplicado por este modal.",
          "Profiles Engine e Performance Engine permanecem prontos para fluxo confirmado.",
        ]),
      );

      if (shouldStop(runId)) return;

      await executeStage(runId, "report", async () => {
        const advisorAi = await loadAdvisorAiReport();
        nextSummary.advisorAi = advisorAi;
        setSummary((current) => ({ ...current, advisorAi }));

        if (advisorAi.hermesScore.value !== null) {
          nextBenefits.push(`Score Hermes: ${advisorAi.hermesScore.value}/100`);
        }
        if (advisorAi.summary.recommendedProfile) {
          nextBenefits.push(`Perfil sugerido: ${advisorAi.summary.recommendedProfile}`);
        }
        setBenefits([...nextBenefits]);

        if (!isTauriRuntime() || advisorAi.hermesScore.status === "unavailable") {
          return prepared("Hermes AI visual preparado; analise real depende do backend local.", [
            "Sem chatbot, nuvem ou telemetria.",
            "Relatorio final montado com fontes disponiveis.",
          ]);
        }

        return completed("Relatorio Hermes AI local gerado em modo somente leitura.", [
          `${advisorAi.recommendations.length} recomendacao(oes) locais`,
          `Confianca: ${advisorAi.summary.confidence}`,
        ]);
      });

      if (activeRun.current !== runId) {
        return;
      }

      setRunStatus("completed");
      setCurrentStatus("Fluxo premium concluido sem aplicar acoes destrutivas.");
      appendLog("info", "Otimizar Agora concluiu leituras e preparou as acoes confirmaveis.");
    } catch (error) {
      if (activeRun.current !== runId) {
        return;
      }

      setRunStatus("failed");
      setCurrentStatus("Fluxo interrompido com erro seguro.");
      appendLog("error", errorMessage(error));
    }
  }

  async function executeStage(runId: number, stageId: string, task: () => Promise<StageExecutionResult>) {
    if (shouldStop(runId)) {
      return;
    }

    updateStage(stageId, {
      status: "running",
      source: "Executando agora",
      outputs: ["Aguardando resposta da engine local."],
    });
    setCurrentStatus(stageTemplates.find((item) => item.id === stageId)?.title ?? "Executando etapa.");
    appendLog("info", `Iniciando: ${stageTemplates.find((item) => item.id === stageId)?.title ?? stageId}.`);

    try {
      const result = await task();
      if (activeRun.current !== runId) {
        return;
      }

      updateStage(stageId, {
        status: result.status,
        realProgress: result.realProgress,
        source: result.source,
        outputs: result.outputs,
      });
      appendLog(result.status === "prepared" ? "warning" : "info", result.message);
    } catch (error) {
      updateStage(stageId, {
        status: "failed",
        realProgress: false,
        source: "Falha segura",
        outputs: [errorMessage(error)],
      });
      throw error;
    }
  }

  function requestCancel() {
    cancelRequested.current = true;
    setRunStatus("cancelled");
    setCurrentStatus("Cancelamento solicitado. O Hermes vai parar antes da proxima etapa segura.");
    setStages((current) =>
      current.map((item) => (item.status === "pending" ? { ...item, status: "cancelled", source: "Cancelado pelo usuario" } : item)),
    );
    appendLog("warning", "Usuario solicitou cancelamento seguro do fluxo.");
  }

  function shouldStop(runId: number) {
    if (activeRun.current !== runId) {
      return true;
    }

    if (!cancelRequested.current) {
      return false;
    }

    setRunStatus("cancelled");
    setCurrentStatus("Fluxo cancelado sem executar novas etapas.");
    return true;
  }

  function updateStage(stageId: string, patch: Partial<OptimizationStage>) {
    setStages((current) => current.map((stageItem) => (stageItem.id === stageId ? { ...stageItem, ...patch } : stageItem)));
  }

  function appendLog(level: OptimizationLog["level"], message: string) {
    setLogs((current) => [{ id: `${Date.now()}-${current.length}`, level, message }, ...current].slice(0, 8));
  }

  if (!open) {
    return null;
  }

  const canCancel = runStatus === "running" && !cancelRequested.current;
  const canClose = runStatus !== "running" || cancelRequested.current;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 px-3 py-4 backdrop-blur-sm">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white/88 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.50)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 opacity-80">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.95),transparent_32%),radial-gradient(circle_at_85%_22%,rgba(37,99,235,0.13),transparent_30%),linear-gradient(135deg,rgba(248,250,252,0.94),rgba(255,255,255,0.72))]" />
          <div className="absolute -left-12 top-16 h-px w-72 rotate-[118deg] bg-gradient-to-r from-transparent via-primary/22 to-transparent" />
          <div className="absolute right-10 top-2 h-px w-64 rotate-[142deg] bg-gradient-to-r from-transparent via-amber-300/45 to-transparent" />
          <div className="absolute bottom-16 left-1/3 h-px w-80 rotate-[108deg] bg-gradient-to-r from-transparent via-primary/14 to-transparent" />
        </div>

        <div className="relative flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/80 bg-white shadow-[0_14px_34px_-22px_rgba(15,23,42,0.65)]">
              <img src="/hermes-logo.png" alt="Hermes Optimizer" className="h-full w-full object-contain p-1.5" />
              <div className="absolute inset-x-2 bottom-1 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-[0.22em] text-primary">UX PREMIUM</p>
              <h2 className="mt-1 text-2xl font-bold leading-tight text-foreground">Hermes Optimization Engine</h2>
              <p className="mt-1 text-sm text-muted-foreground">{activeStage?.title ?? currentStatus}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={!canClose}
            aria-label="Fechar janela de otimizacao"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-white/80 text-muted-foreground transition hover:bg-muted disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative overflow-auto px-5 py-5 lg:px-6">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-white/72 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] font-bold tracking-[0.18em] text-primary">PROGRESSO GERAL</p>
                    <p className="mt-1 text-sm text-muted-foreground">{currentStatus}</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-primary/15 bg-primary/8 px-3 py-1.5 text-sm font-bold text-primary">
                    {runStatus === "running" && <Loader2 className="h-4 w-4 animate-spin" />}
                    {progress}%
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary via-sky-400 to-amber-300 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                {stages.map((item, index) => (
                  <StageRow key={item.id} index={index + 1} stage={item} />
                ))}
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-white/72 p-4">
                <h3 className="text-[11px] font-bold tracking-[0.18em] text-primary">BENEFICIOS DETECTADOS</h3>
                <div className="mt-3 space-y-2">
                  {benefits.length > 0 ? (
                    benefits.slice(0, 6).map((item) => (
                      <div key={item} className="flex items-start gap-2 rounded-xl border border-border/60 bg-white/70 px-3 py-2 text-sm text-foreground">
                        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <span>{item}</span>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-xl border border-dashed border-border bg-white/60 px-3 py-4 text-sm text-muted-foreground">
                      Os beneficios aparecem conforme as engines retornam dados reais.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-white/72 p-4">
                <h3 className="text-[11px] font-bold tracking-[0.18em] text-primary">SNAPSHOT</h3>
                <div className="mt-3 rounded-xl border border-border/60 bg-white/70 px-3 py-3">
                  <div className="flex items-start gap-2">
                    <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground">{snapshotId ? "Snapshot criado" : "Aguardando Restore Engine"}</p>
                      <p className="mt-1 break-all text-[11px] text-muted-foreground">{snapshotId ?? "Nenhum snapshot criado fora do app Tauri."}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-white/72 p-4">
                <h3 className="text-[11px] font-bold tracking-[0.18em] text-primary">LOGS</h3>
                <div className="mt-3 space-y-2">
                  {logs.length > 0 ? (
                    logs.map((item) => <LogRow key={item.id} log={item} />)
                  ) : (
                    <p className="rounded-xl border border-dashed border-border bg-white/60 px-3 py-4 text-sm text-muted-foreground">
                      Aguardando primeira etapa.
                    </p>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className="relative flex flex-col gap-3 border-t border-border/70 bg-white/78 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Sem telemetria. Sem servico residente. Acoes reais exigem confirmacao.
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {canCancel && (
              <button
                type="button"
                onClick={requestCancel}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                Cancelar quando seguro
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={!canClose}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_-18px_rgba(37,99,235,0.9)] transition hover:bg-primary/95 disabled:opacity-50"
            >
              {runStatus === "running" ? <Clock3 className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {runStatus === "running" ? "Executando" : "Concluir"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type StageExecutionResult = {
  status: "completed" | "prepared";
  realProgress: boolean;
  source: string;
  message: string;
  outputs: string[];
};

function completed(message: string, outputs: string[]): StageExecutionResult {
  return {
    status: "completed",
    realProgress: true,
    source: "Engine real",
    message,
    outputs,
  };
}

function prepared(message: string, outputs: string[]): StageExecutionResult {
  return {
    status: "prepared",
    realProgress: false,
    source: "Preparado sem execucao real",
    message,
    outputs,
  };
}

function stageResultFromRuntime(message: string, outputs: string[]): StageExecutionResult {
  return isTauriRuntime() ? completed(message, outputs) : prepared(`${message} Fallback visual usado fora do Tauri.`, outputs);
}

function StageRow({ stage: stageItem, index }: { stage: OptimizationStage; index: number }) {
  const Icon = stageIcon(stageItem.status);

  return (
    <div className="rounded-2xl border border-border/70 bg-white/72 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stageIconClass(stageItem.status)}`}>
          <Icon className={`h-5 w-5 ${stageItem.status === "running" ? "animate-spin" : ""}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-wider text-muted-foreground">
                ETAPA {index} - {stageItem.engine}
              </p>
              <h3 className="mt-0.5 text-sm font-bold text-foreground">{stageItem.title}</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{stageItem.description}</p>
            </div>
            <StagePill status={stageItem.status} realProgress={stageItem.realProgress} />
          </div>
          {stageItem.outputs.length > 0 && (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {stageItem.outputs.slice(0, 4).map((output) => (
                <div key={output} className="rounded-lg border border-border/60 bg-slate-50/80 px-2.5 py-2 text-[11px] font-medium text-foreground">
                  {output}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StagePill({ status, realProgress }: { status: StageStatus; realProgress: boolean }) {
  return (
    <span className={`w-fit shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${stagePillClass(status)}`}>
      {stageStatusLabel(status)}
      {status !== "pending" && status !== "running" ? ` - ${realProgress ? "real" : "preparado"}` : ""}
    </span>
  );
}

function LogRow({ log }: { log: OptimizationLog }) {
  const className =
    log.level === "error"
      ? "border-destructive/20 bg-destructive/10 text-destructive"
      : log.level === "warning"
        ? "border-warning/25 bg-warning/10 text-warning"
        : "border-primary/20 bg-primary/10 text-primary";

  return (
    <div className="rounded-xl border border-border/60 bg-white/70 px-3 py-2">
      <div className="flex items-start gap-2">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="flex-1 text-[12px] leading-relaxed text-foreground">{log.message}</p>
        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${className}`}>{log.level}</span>
      </div>
    </div>
  );
}

function resetStages(): OptimizationStage[] {
  return stageTemplates.map((item) => ({
    ...item,
    status: "pending",
    realProgress: false,
    source: "Aguardando",
    outputs: [],
  }));
}

function stage(
  id: string,
  title: string,
  engine: string,
  description: string,
): OptimizationStage {
  return {
    id,
    title,
    engine,
    description,
    status: "pending",
    realProgress: false,
    source: "Aguardando",
    outputs: [],
  };
}

function stageIcon(status: StageStatus) {
  if (status === "running") return Loader2;
  if (status === "completed") return CheckCircle2;
  if (status === "prepared") return ShieldCheck;
  if (status === "failed") return AlertTriangle;
  if (status === "cancelled") return X;
  return Zap;
}

function stageIconClass(status: StageStatus) {
  if (status === "completed") return "bg-success/10 text-success";
  if (status === "prepared") return "bg-warning/10 text-warning";
  if (status === "failed") return "bg-destructive/10 text-destructive";
  if (status === "cancelled") return "bg-muted text-muted-foreground";
  if (status === "running") return "bg-primary/10 text-primary";
  return "bg-primary-soft text-primary";
}

function stagePillClass(status: StageStatus) {
  if (status === "completed") return "border-success/20 bg-success/10 text-success";
  if (status === "prepared") return "border-warning/25 bg-warning/10 text-warning";
  if (status === "failed") return "border-destructive/20 bg-destructive/10 text-destructive";
  if (status === "cancelled") return "border-border bg-muted text-muted-foreground";
  if (status === "running") return "border-primary/20 bg-primary/10 text-primary";
  return "border-border bg-muted/60 text-muted-foreground";
}

function stageStatusLabel(status: StageStatus) {
  if (status === "running") return "Executando";
  if (status === "completed") return "Concluido";
  if (status === "prepared") return "Preparado";
  if (status === "failed") return "Falha";
  if (status === "cancelled") return "Cancelado";
  return "Pendente";
}

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function formatGb(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
