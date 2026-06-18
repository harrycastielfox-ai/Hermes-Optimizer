import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  BrushCleaning,
  CheckCircle2,
  Cpu,
  Gamepad2,
  Gauge,
  HardDrive,
  Loader2,
  Play,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  runOptimizeAllPhase,
  type OptimizeAllGameSelection,
  type OptimizeAllGameTarget,
  type OptimizeAllPhaseId,
  type OptimizeAllReports,
} from "@/lib/optimize-all";
import { HERMES_SAFE_TEST_MODE } from "@/lib/safe-mode";
import { RestartPrompt } from "@/components/optimization/RestartPrompt";
import {
  buildExecutionReport,
  type ExecutionReport,
  type ExecutionReportAction,
} from "@/lib/execution-report";
import {
  buildOptimizeAuditReportActions,
  OPTIMIZE_AUDIT_ACTION_TARGET,
} from "@/lib/optimize-audit-catalog";

type RunStatus = "idle" | "running" | "awaitingGame" | "completed" | "failed" | "cancelled";
type PhaseStatus = "pending" | "running" | "completed" | "unavailable" | "failed" | "cancelled";
type PhaseId = OptimizeAllPhaseId;

type OptimizePhase = {
  id: PhaseId;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  plannedActions: number;
  status: PhaseStatus;
  outputs: string[];
};

type LogItem = {
  id: string;
  level: "info" | "warning" | "error";
  message: string;
};

type PlanActionStatus = "ready" | "ok" | "pending" | "unavailable";

type PlanAction = {
  id: string;
  title: string;
  detail: string;
  status: PlanActionStatus;
};

const phaseTemplates: OptimizePhase[] = [
  phase("plan", "Plano inteligente", "Orquestrador + Hermes IA", BrainCircuit, 14),
  phase("safety", "Permissoes e confirmacao", "Modo teste, logs e controle", ShieldCheck, 10),
  phase("components", "Componentes essenciais", "VC++, DirectX e dependências", Wrench, 18),
  phase("cleanup", "Limpeza segura", "Temporários, cache e logs", BrushCleaning, 26),
  phase("startup", "Inicialização", "Apps de alto impacto", Zap, 18),
  phase("performance", "Performance", "Energia, Game Mode e rede", Gauge, 22),
  phase("gamer", "Sessao Gamer", "Jogo alvo, Discord e overlays", Gamepad2, 18),
  phase("profile", "Perfil recomendado", "Seguro, Trabalho, Gamer ou Extremo", Cpu, 16),
  phase(
    "manual",
    "Avançado guiado",
    "Comandos allowlistados e ajustes finos",
    SlidersHorizontal,
    8,
  ),
];

const TOTAL_PLANNED_ACTIONS = OPTIMIZE_AUDIT_ACTION_TARGET;

export function SmartOptimizeModal({
  open,
  runKey,
  onClose,
  onCompleted,
}: {
  open: boolean;
  runKey: number;
  onClose: () => void;
  onCompleted?: (executionReport: ExecutionReport) => void;
}) {
  const [phases, setPhases] = useState<OptimizePhase[]>(() => resetPhases());
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [reports, setReports] = useState<OptimizeAllReports>({});
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [currentStatus, setCurrentStatus] = useState("Aguardando otimização.");
  const [recommendedProfileId, setRecommendedProfileId] = useState("seguro");
  const [gameTargets, setGameTargets] = useState<OptimizeAllGameTarget[]>([]);
  const [selectedGameTarget, setSelectedGameTarget] = useState<OptimizeAllGameTarget | null>(null);
  const cancelRequested = useRef(false);
  const activeRun = useRef(0);
  const reportActions = useRef<ExecutionReportAction[]>([]);
  const resumeState = useRef<{
    runId: number;
    phaseIndex: number;
    reports: OptimizeAllReports;
    recommendedProfileId: string;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    activeRun.current += 1;
    const runId = activeRun.current;
    cancelRequested.current = false;
    setPhases(resetPhases());
    setLogs([]);
    setReports({});
    setGameTargets([]);
    setSelectedGameTarget(null);
    reportActions.current = [];
    resumeState.current = null;
    setRunStatus("running");
    setCurrentStatus("Preparando plano unico do Hermes.");
    void runSmartOptimization(runId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, runKey]);

  const processed = useMemo(
    () => phases.filter((item) => item.status !== "pending" && item.status !== "running").length,
    [phases],
  );
  const progress = Math.round((processed / phases.length) * 100);
  const remainingProgress = Math.max(0, 100 - progress);
  const completedActionCount = phases
    .filter((item) => item.status === "completed" || item.status === "unavailable")
    .reduce((total, item) => total + item.plannedActions, 0);
  const activePhase = phases.find((item) => item.status === "running");
  const canCancel =
    (runStatus === "running" || runStatus === "awaitingGame") && !cancelRequested.current;
  const canClose =
    (runStatus !== "running" && runStatus !== "awaitingGame") || cancelRequested.current;
  const planActions = useMemo(
    () => buildOptimizationPlan(reports, recommendedProfileId),
    [reports, recommendedProfileId],
  );

  async function runSmartOptimization(runId: number) {
    try {
      await runPhases(runId, 0, {}, recommendedProfileId);
    } catch (error) {
      if (activeRun.current !== runId) {
        return;
      }

      setRunStatus("failed");
      setCurrentStatus("Otimização interrompida em modo teste.");
      appendLog("error", errorMessage(error));
    }
  }

  async function runPhases(
    runId: number,
    startIndex: number,
    initialReports: OptimizeAllReports,
    initialRecommendedProfileId: string,
    gameSelection?: OptimizeAllGameSelection,
  ) {
    let nextReports: OptimizeAllReports = initialReports;
    let nextRecommendedProfileId = initialRecommendedProfileId;

    for (let index = startIndex; index < phaseTemplates.length; index += 1) {
      const template = phaseTemplates[index];
      let pausedForGame = false;

      if (shouldStop(runId)) return;

      await executePhase(runId, template.id, async () => {
        const result = await runOptimizeAllPhase(template.id, {
          reports: nextReports,
          recommendedProfileId: nextRecommendedProfileId,
          gameSelection: template.id === "gamer" ? gameSelection : undefined,
        });

        nextReports = { ...nextReports, ...result.reports };
        if (result.recommendedProfileId) {
          nextRecommendedProfileId = result.recommendedProfileId;
          setRecommendedProfileId(result.recommendedProfileId);
        }
        if (result.gameTargets) {
          setGameTargets(result.gameTargets);
          setSelectedGameTarget((current) => current ?? result.gameTargetsó.[0] ?? null);
        }
        setReports({ ...nextReports });

        if (result.requiresGameSelection && result.gameTargetsó.length) {
          pausedForGame = true;
          resumeState.current = {
            runId,
            phaseIndex: index,
            reports: nextReports,
            recommendedProfileId: nextRecommendedProfileId,
          };
          setRunStatus("awaitingGame");
          setCurrentStatus("Escolha o jogo alvo para continuar.");
          appendLog("info", "Aguardando escolha do jogo alvo.");
        }

        return result.outputs;
      });

      if (pausedForGame || shouldStop(runId)) {
        return;
      }
    }

    if (activeRun.current !== runId) {
      return;
    }

    setRunStatus("completed");
    setCurrentStatus("Plano unico concluido. Modo teste mantido.");
    appendLog("info", "Otimizar Tudo finalizado em modo teste.");
    onCompleted?.(
      buildExecutionReport({
        phase: "optimize",
        title: "Otimização Avançada",
        safeMode: HERMES_SAFE_TEST_MODE,
        actions: reportActions.current,
        notes: [
          "Botao 2 concluido em fluxo guiado.",
          "A meta de 150 ações e contabilizada por fases do plano Hermes.",
          HERMES_SAFE_TEST_MODE
            ? "Modo teste: nenhuma alteração real foi aplicada."
            : "Modo real: fases implementadas foram executadas.",
        ],
      }),
    );
  }

  function chooseGameTarget(target: OptimizeAllGameTarget) {
    const resume = resumeState.current;
    if (!resume) {
      return;
    }

    resumeState.current = null;
    setSelectedGameTarget(target);
    setRunStatus("running");
    setCurrentStatus(`Montando plano Gamer para ${target.label}.`);
    appendLog("info", `Jogo alvo escolhido: ${target.label}.`);
    void runPhases(resume.runId, resume.phaseIndex, resume.reports, resume.recommendedProfileId, {
      target,
    });
  }

  function skipGameSelection() {
    const resume = resumeState.current;
    if (!resume) {
      return;
    }

    resumeState.current = null;
    setSelectedGameTarget(null);
    setRunStatus("running");
    setCurrentStatus("Continuando sem alvo Gamer especifico.");
    appendLog("warning", "Seleção de jogo ignorada.");
    void runPhases(resume.runId, resume.phaseIndex, resume.reports, resume.recommendedProfileId, {
      skip: true,
    });
  }

  async function executePhase(
    runId: number,
    phaseId: PhaseId,
    task: () => Promise<string[]> | string[],
  ) {
    if (shouldStop(runId)) {
      return;
    }

    const template = phaseTemplates.find((item) => item.id === phaseId);
    setCurrentStatus(template?.title ?? "Executando fase.");
    updatePhase(phaseId, { status: "running", outputs: ["Executando validação local."] });
    appendLog("info", `Iniciando: ${template?.title ?? phaseId}.`);

    try {
      const outputs = await task();
      if (activeRun.current !== runId) {
        return;
      }

      updatePhase(phaseId, { status: "completed", outputs });
      upsertReportAction(phaseId, "completed", outputs);
      appendLog("info", `${template?.title ?? phaseId}: concluido.`);
    } catch (error) {
      const message = errorMessage(error);
      updatePhase(phaseId, {
        status: "unavailable",
        outputs: [message, "Fase isolada sem efeitos."],
      });
      upsertReportAction(phaseId, "unavailable", [message, "Fase isolada sem efeitos."]);
      appendLog("warning", `${template?.title ?? phaseId}: ${message}`);
    }
  }

  function upsertReportAction(
    phaseId: PhaseId,
    status: "completed" | "unavailable",
    outputs: string[],
  ) {
    const actions = buildOptimizeAuditReportActions({
      phaseId,
      phaseStatus: status,
      safeMode: HERMES_SAFE_TEST_MODE,
      outputs,
    });

    if (actions.length === 0) {
      return;
    }

    const actionIds = new Set(actions.map((action) => action.id));
    reportActions.current = [
      ...reportActions.current.filter((item) => !actionIds.has(item.id)),
      ...actions,
    ];
  }

  function requestCancel() {
    cancelRequested.current = true;
    resumeState.current = null;
    setRunStatus("cancelled");
    setCurrentStatus("Cancelamento solicitado. O Hermes não iniciara novas fases.");
    setPhases((current) =>
      current.map((item) =>
        item.status === "pending"
          ? { ...item, status: "cancelled", outputs: ["Cancelado pelo usuário."] }
          : item,
      ),
    );
    appendLog("warning", "Usuário cancelou o fluxo Resolver Agora.");
  }

  function shouldStop(runId: number) {
    if (activeRun.current !== runId) {
      return true;
    }

    if (!cancelRequested.current) {
      return false;
    }

    setRunStatus("cancelled");
    return true;
  }

  function updatePhase(phaseId: PhaseId, patch: Partial<OptimizePhase>) {
    setPhases((current) =>
      current.map((item) => (item.id === phaseId ? { ...item, ...patch } : item)),
    );
  }

  function appendLog(level: LogItem["level"], message: string) {
    setLogs((current) =>
      [{ id: `${Date.now()}-${current.length}`, level, message }, ...current].slice(0, 8),
    );
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-3 py-4 backdrop-blur-sm">
      <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-border/80 bg-card/95 text-card-foreground shadow-[0_30px_90px_-40px_rgba(15,23,42,0.55)] backdrop-blur-xl">
        <header className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_16px_34px_-22px_rgba(37,99,235,0.9)]">
              <Sparkles className="h-8 w-8" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-[0.22em] text-primary">MODO SIMPLES</p>
              <h2 className="mt-1 text-2xl font-black leading-tight text-foreground">
                Otimizar Tudo
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {activePhase?.title ?? currentStatus}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={!canClose}
            aria-label="Fechar Otimizar Tudo"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background/80 text-muted-foreground transition hover:bg-muted disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="overflow-auto px-5 py-5 lg:px-6">
          <section className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-4">
            <SummaryCard
              icon={Zap}
              label="Ações avaliadas"
              value={`${TOTAL_PLANNED_ACTIONS}`}
              sub={`Agrupadas em ${phaseTemplates.length} fases`}
            />
            <SummaryCard
              icon={CheckCircle2}
              label="Processadas"
              value={`${completedActionCount}`}
              sub={`${progress}% do fluxo`}
            />
            <SummaryCard
              icon={Cpu}
              label="Alvo"
              value={selectedGameTarget?.label ?? profileLabel(recommendedProfileId)}
              sub={
                selectedGameTarget?.engineHint ??
                reports.advisor?.summary.recommendedProfileReason ??
                "Auto"
              }
            />
            <SummaryCard
              icon={ShieldCheck}
              label="Modo"
              value={HERMES_SAFE_TEST_MODE ? "Teste" : "Real"}
              sub={HERMES_SAFE_TEST_MODE ? "Modo teste ativo" : "Execução real liberada"}
            />
          </section>

          <div className="mb-4 rounded-2xl border border-warning/25 bg-warning/10 px-4 py-3 text-warning">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="text-sm font-bold">
                  O Hermes mira 150 ações, mas executa apenas o que já existe no motor.
                </p>
                <p className="mt-1 text-[12px] leading-relaxed">
                  {HERMES_SAFE_TEST_MODE
                    ? "O modo teste ainda não aplica alterações reais. Ações ainda não implementadas ficam como planejamento ou indisponiveis, sem fingir execução."
                    : "Modo real ligado: o Hermes aplica apenas as ações implementadas, allowlistadas e confirmadas pelo motor."}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-3">
              {runStatus === "awaitingGame" && (
                <GameTargetPicker
                  targets={gameTargets}
                  selectedTarget={selectedGameTarget}
                  onSelect={chooseGameTarget}
                  onSkip={skipGameSelection}
                />
              )}

              <div className="rounded-2xl border border-border/70 bg-background/72 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{currentStatus}</h3>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      Fase atual: {activePhase?.title ?? "Finalizando"}.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-right">
                    <ProgressStat label="Concluido" value={`${progress}%`} />
                    <ProgressStat label="Falta" value={`${remainingProgress}%`} />
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {phases.map((item) => (
                  <PhaseCard key={item.id} phase={item} />
                ))}
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-background/72 p-4">
                <h3 className="text-[11px] font-bold tracking-[0.18em] text-primary">
                  PLANO DO PC
                </h3>
                <div className="mt-3 space-y-2">
                  {planActions.map((item) => (
                    <PlanActionRow key={item.id} item={item} />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/72 p-4">
                <h3 className="text-[11px] font-bold tracking-[0.18em] text-primary">LOG</h3>
                <div className="mt-3 space-y-2">
                  {logs.length > 0 ? (
                    logs.map((item) => <LogRow key={item.id} item={item} />)
                  ) : (
                    <p className="rounded-xl border border-dashed border-border bg-background/60 px-3 py-4 text-sm text-muted-foreground">
                      Aguardando primeira fase.
                    </p>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>

        {runStatus === "completed" && (
          <div className="border-t border-border/70 bg-background/78 px-5 py-4 lg:px-6">
            <RestartPrompt phase="optimize" />
          </div>
        )}

        <footer className="flex flex-col gap-3 border-t border-border/70 bg-background/78 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success" />
            {HERMES_SAFE_TEST_MODE
              ? "Modo de teste: nenhuma alteração real será aplicada."
              : "Modo real: executa funcoes implementadas com confirmacao."}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {canCancel && (
              <button
                type="button"
                onClick={requestCancel}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                Cancelar
              </button>
            )}
            <Link
              to="/perfis"
              search={{ perfil: recommendedProfileId }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 text-sm font-bold text-primary transition hover:bg-primary/15"
            >
              Abrir perfil sugerido
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={onClose}
              disabled={!canClose}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_-18px_rgba(37,99,235,0.9)] transition hover:bg-primary/95 disabled:opacity-50"
            >
              {runStatus === "running" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {runStatus === "awaitingGame"
                ? "Escolha o jogo"
                : runStatus === "running"
                  ? "Executando"
                  : "Concluir"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function buildOptimizationPlan(reports: OptimizeAllReports, profileId: string): PlanAction[] {
  const actions: PlanAction[] = [];

  if (reports.diagnostic) {
    actions.push({
      id: "diagnostic",
      title: "Diagnóstico do PC",
      detail: `Saude ${Math.round(reports.diagnostic.healthScore)}/100 analisada.`,
      status: "ok",
    });
  } else {
    actions.push({
      id: "diagnostic",
      title: "Diagnóstico do PC",
      detail: "Aguardando coleta inicial.",
      status: "pending",
    });
  }

  if (reports.clean) {
    let detail = "Sem volume relevante encontrado.";
    if (reports.cleanResult) {
      detail = `${reports.cleanResult.plannedEntries} item(ns) validados pela engine.`;
    } else if (reports.clean.totalGb > 0) {
      detail = `${formatGb(reports.clean.totalGb)} GB encontrados para revisar.`;
    }

    actions.push({
      id: "cleanup",
      title: "Limpeza segura",
      detail,
      status: reports.cleanResult || reports.clean.totalGb > 0 ? "ready" : "ok",
    });
  }

  if (reports.startup) {
    let detail = `${reports.startup.totalItems} item(ns) monitorados.`;
    if (reports.startupResult) {
      detail = `${reports.startupResult.selectedItems} item(ns) validados pela engine.`;
    } else if (reports.startup.highImpactCount > 0) {
      detail = `${reports.startup.highImpactCount} item(ns) de alto impacto.`;
    }

    actions.push({
      id: "startup",
      title: "Inicialização",
      detail,
      status: reports.startupResult || reports.startup.highImpactCount > 0 ? "ready" : "ok",
    });
  }

  if (reports.performance) {
    actions.push({
      id: "performance",
      title: "Performance",
      detail: reports.performanceResult
        ? `${reports.performanceResult.appliedActions.length} ajuste(s) validados pela engine.`
        : `Plano atual: ${reports.performance.powerPlan.activeSchemeName}.`,
      status: "ready",
    });
  }

  if (reports.gamer) {
    let detail = "Sem jogo alvo aberto. Seleção manual será necessária.";
    if (reports.gamerResult) {
      detail = `${reports.gamerResult.closedProcesses.length} processo(s) validados pela engine.`;
    } else if (reports.gamer.summary.detectedGames > 0) {
      detail = `${reports.gamer.summary.detectedGames} jogo(s) detectado(s).`;
    }

    actions.push({
      id: "gamer",
      title: "Sessao Gamer",
      detail,
      status: reports.gamerResult || reports.gamer.summary.detectedGames > 0 ? "ready" : "pending",
    });
  }

  actions.push({
    id: "profile",
    title: "Perfil recomendado",
    detail: reports.profileResult
      ? `${reports.profileResult.engineResults.length} engine(s) do perfil validadas.`
      : `${profileLabel(profileId)} sera usado como base do plano.`,
    status: "ready",
  });

  if (reports.advanced) {
    actions.push({
      id: "advanced",
      title: "Avançado guiado",
      detail: reports.advancedResult
        ? `${reports.advancedResult.appliedActions.length} comando(s) validados.`
        : `${reports.advanced.actions.length} comando(s) mapeados.`,
      status: reports.advancedResult ? "ready" : "pending",
    });
  }

  const componentCmds = reports.advanced?.actions.filter((action) => action.id.startsWith("dism-"));
  actions.push({
    id: "components",
    title: "Componentes CMD/DISM",
    detail: componentCmdsó.length
      ? `${componentCmds.length} comando(s): limpeza de componentes, NetFx3 e DirectPlay.`
      : "Aguardando mapeamento de componentes do Windows.",
    status: componentCmdsó.length ? "ready" : "pending",
  });

  return actions;
}

function ProgressStat({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-1.5">
      <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-primary">
        {label}
      </span>
      <span className="block text-sm font-black text-foreground">{value}</span>
    </span>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/72 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground">{label}</p>
          <p className="truncate text-base font-bold text-foreground">{value}</p>
          <p className="truncate text-[11px] text-muted-foreground">{sub}</p>
        </div>
      </div>
    </div>
  );
}

function GameTargetPicker({
  targets,
  selectedTarget,
  onSelect,
  onSkip,
}: {
  targets: OptimizeAllGameTarget[];
  selectedTarget: OptimizeAllGameTarget | null;
  onSelect: (target: OptimizeAllGameTarget) => void;
  onSkip: () => void;
}) {
  return (
    <section className="rounded-2xl border border-primary/25 bg-primary/10 p-4 shadow-[0_18px_42px_-34px_rgba(37,99,235,0.7)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-bold tracking-[0.18em] text-primary">SESSAO GAMER</p>
          <h3 className="mt-1 text-xl font-black text-foreground">Escolha o jogo alvo</h3>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Fate Trigger via Steam/UE5 e a prioridade Hermes. O alvo escolhido protege o jogo,
            preserva Steam/Discord, avalia overlays e ajusta o perfil para a engine detectada.
          </p>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-muted"
        >
          Continuar sem alvo
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {targets.map((target) => {
          const active = selectedTarget?.id === target.id;
          return (
            <button
              key={target.id}
              type="button"
              onClick={() => onSelect(target)}
              className={`group flex min-h-24 items-center gap-3 rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/70 bg-background/82 hover:border-primary/40 hover:bg-background"
              }`}
            >
              <span
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
                  active
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {target.label.toLowerCase().includes("fate") ? (
                  <Sparkles className="h-5 w-5" />
                ) : (
                  <Gamepad2 className="h-5 w-5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-black">{target.label}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${
                      active
                        ? "border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground"
                        : "border-primary/20 bg-primary/10 text-primary"
                    }`}
                  >
                    {gameSourceLabel(target)}
                  </span>
                  {target.engineHint && (
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${
                        active
                          ? "border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground"
                          : "border-success/20 bg-success/10 text-success"
                      }`}
                    >
                      {target.engineHint}
                    </span>
                  )}
                  {target.id === "preset-fate-trigger-ue5" && (
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${
                        active
                          ? "border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground"
                          : "border-warning/25 bg-warning/10 text-warning"
                      }`}
                    >
                      PRIORIDADE STEAM
                    </span>
                  )}
                </span>
                <span
                  className={`mt-1 block text-[12px] leading-relaxed ${
                    active ? "text-primary-foreground/80" : "text-muted-foreground"
                  }`}
                >
                  {target.detail}
                </span>
              </span>
              <Play
                className={`h-5 w-5 shrink-0 ${active ? "text-primary-foreground" : "text-primary"}`}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PlanActionRow({ item }: { item: PlanAction }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2">
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${planStatusDot(item.status)}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[12px] font-bold text-foreground">{item.title}</p>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold ${planStatusPill(
                item.status,
              )}`}
            >
              {planStatusLabel(item.status)}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{item.detail}</p>
        </div>
      </div>
    </div>
  );
}

function PhaseCard({ phase }: { phase: OptimizePhase }) {
  const Icon =
    phase.status === "running" ? Loader2 : phase.status === "completed" ? CheckCircle2 : phase.icon;

  return (
    <article className="rounded-2xl border border-border/70 bg-background/72 p-4">
      <div className="flex items-start gap-3">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${phaseIconClass(phase.status)}`}
        >
          <Icon className={`h-5 w-5 ${phase.status === "running" ? "animate-spin" : ""}`} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-foreground">{phase.title}</h3>
              <p className="mt-0.5 text-[12px] text-muted-foreground">{phase.subtitle}</p>
            </div>
            <span
              className={`rounded-full border px-2 py-1 text-[10px] font-bold ${phasePillClass(phase.status)}`}
            >
              {phaseStatusLabel(phase.status)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              {phase.plannedActions} ações
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              Engine real
            </span>
          </div>
          {phase.outputs.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {phase.outputs.slice(0, 3).map((output) => (
                <p
                  key={output}
                  className="rounded-lg border border-border/60 bg-muted/45 px-2.5 py-1.5 text-[11px] font-medium text-foreground"
                >
                  {output}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function LogRow({ item }: { item: LogItem }) {
  const className =
    item.level === "error"
      ? "border-destructive/20 bg-destructive/10 text-destructive"
      : item.level === "warning"
        ? "border-warning/25 bg-warning/10 text-warning"
        : "border-primary/20 bg-primary/10 text-primary";

  return (
    <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2">
      <div className="flex items-start gap-2">
        <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="flex-1 text-[12px] leading-relaxed text-foreground">{item.message}</p>
        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${className}`}>
          {item.level}
        </span>
      </div>
    </div>
  );
}

function phase(
  id: PhaseId,
  title: string,
  subtitle: string,
  icon: LucideIcon,
  plannedActions: number,
): OptimizePhase {
  return {
    id,
    title,
    subtitle,
    icon,
    plannedActions,
    status: "pending",
    outputs: [],
  };
}

function resetPhases() {
  return phaseTemplates.map((item) => ({
    ...item,
    status: "pending" as const,
    outputs: [],
  }));
}

function phaseIconClass(status: PhaseStatus) {
  if (status === "completed") return "bg-success/10 text-success";
  if (status === "running") return "bg-primary/10 text-primary";
  if (status === "unavailable") return "bg-warning/10 text-warning";
  if (status === "failed") return "bg-destructive/10 text-destructive";
  if (status === "cancelled") return "bg-muted text-muted-foreground";
  return "bg-primary-soft text-primary";
}

function phasePillClass(status: PhaseStatus) {
  if (status === "completed") return "border-success/20 bg-success/10 text-success";
  if (status === "running") return "border-primary/20 bg-primary/10 text-primary";
  if (status === "unavailable") return "border-warning/25 bg-warning/10 text-warning";
  if (status === "failed") return "border-destructive/20 bg-destructive/10 text-destructive";
  if (status === "cancelled") return "border-border bg-muted text-muted-foreground";
  return "border-border bg-muted text-muted-foreground";
}

function phaseStatusLabel(status: PhaseStatus) {
  if (status === "completed") return "Ok";
  if (status === "running") return "Rodando";
  if (status === "unavailable") return "Indisp.";
  if (status === "failed") return "Falha";
  if (status === "cancelled") return "Cancelado";
  return "Pendente";
}

function planStatusDot(status: PlanActionStatus) {
  if (status === "ready") return "bg-primary";
  if (status === "ok") return "bg-success";
  if (status === "pending") return "bg-warning";
  return "bg-muted-foreground";
}

function planStatusPill(status: PlanActionStatus) {
  if (status === "ready") return "border-primary/20 bg-primary/10 text-primary";
  if (status === "ok") return "border-success/20 bg-success/10 text-success";
  if (status === "pending") return "border-warning/25 bg-warning/10 text-warning";
  return "border-border bg-muted text-muted-foreground";
}

function planStatusLabel(status: PlanActionStatus) {
  if (status === "ready") return "Pronto";
  if (status === "ok") return "Ok";
  if (status === "pending") return "Pendente";
  return "Modulo";
}

function profileLabel(profileId: string) {
  if (profileId === "gamer") return "Gamer";
  if (profileId === "trabalho") return "Trabalho";
  if (profileId === "economia") return "Economia";
  if (profileId === "extremo") return "Extremo";
  return "Seguro";
}

function gameSourceLabel(target: OptimizeAllGameTarget) {
  if (target.source === "active") return "Ativo";
  if (target.source === "detected") return "Detectado";
  if (target.source === "profile") return "Perfil";
  return target.confidence === "high" ? "Preset" : "Sugerido";
}

function formatGb(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
