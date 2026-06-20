import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FolderOpen,
  Gauge,
  HardDrive,
  Loader2,
  MonitorCog,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  buildQuickPrepareTaskPlan,
  getDnsProvider,
  runQuickPrepareExecutor,
  type DnsProviderId,
  type QuickPreparePhaseId,
  type QuickPrepareReports,
  type QuickPrepareTaskUpdate,
} from "@/lib/quick-prepare";
import { HERMES_SAFE_TEST_MODE } from "@/lib/safe-mode";
import type { DiagnosticReport } from "@/lib/diagnostic";
import { RestartPrompt } from "@/components/optimization/RestartPrompt";
import {
  downloadOfficialGamerDependencyInstallers,
  installVerifiedGamerDependencies,
  openGamerDependencyCacheDir,
  type GamerDependencyDownloadResult,
  type GamerDependencyInstallActionResult,
  type GamerDependencyInstallActionStatus,
  type GamerDependencyInstallResult,
  type GamerDependencyVerificationItem,
  type GamerDependencyVerificationReport,
  type GamerDependencyVerificationStatus,
} from "@/lib/gamer-dependencies";
import {
  buildExecutionReport,
  type ExecutionReport,
  type ExecutionReportAction,
  type ExecutionReportStatus,
} from "@/lib/execution-report";

type RunStatus = "idle" | "running" | "completed" | "failed" | "cancelled";
type PhaseStatus = "pending" | "running" | "completed" | "unavailable" | "cancelled";

type PreparePhase = {
  id: QuickPreparePhaseId;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  status: PhaseStatus;
  outputs: string[];
};

type LogItem = {
  id: string;
  level: "info" | "warning" | "error";
  message: string;
};

const phaseTemplates: PreparePhase[] = [
  phase("scan", "Mapear máquina", "Leitura local do estado atual", MonitorCog),
  phase("components", "Dependências gamer", "VC++, DirectX, hash e assinatura", ShieldCheck),
  phase("cleanup", "Limpar temporários", "Cache, logs e arquivos seguros", HardDrive),
  phase("startup", "Reduzir inicialização", "Apps de alto impacto", Zap),
  phase("windows", "Ajustar Windows", "Game Mode, GameDVR e visual mínimo", Gauge),
  phase("processes", "Liberar processos", "Fecha segundo plano com proteções", Sparkles),
];

export function QuickPrepareModal({
  open,
  runKey,
  onClose,
  onDiagnostic,
  onCompleted,
  dnsProviderId,
}: {
  open: boolean;
  runKey: number;
  onClose: () => void;
  onDiagnostic?: (report: DiagnosticReport) => void;
  onCompleted?: (reports: QuickPrepareReports, executionReport: ExecutionReport) => void;
  dnsProviderId: DnsProviderId;
}) {
  const [phases, setPhases] = useState<PreparePhase[]>(() => resetPhases());
  const [reports, setReports] = useState<QuickPrepareReports>({});
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [currentStatus, setCurrentStatus] = useState("Aguardando preparo.");
  const [completedTasks, setCompletedTasks] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [finalExecutionReport, setFinalExecutionReport] = useState<ExecutionReport | null>(null);
  const activeRun = useRef(0);
  const cancelRequested = useRef(false);
  const phaseTaskTotals = useRef<Partial<Record<QuickPreparePhaseId, number>>>({});
  const phaseTaskCompleted = useRef<Partial<Record<QuickPreparePhaseId, number>>>({});
  const phaseHasUnavailable = useRef<Partial<Record<QuickPreparePhaseId, boolean>>>({});
  const reportActions = useRef<ExecutionReportAction[]>([]);
  const executionMode = HERMES_SAFE_TEST_MODE ? "dryRun" : "real";

  useEffect(() => {
    if (!open) {
      return;
    }

    activeRun.current += 1;
    const runId = activeRun.current;
    cancelRequested.current = false;
    setPhases(resetPhases());
    setReports({});
    setLogs([]);
    setFinalExecutionReport(null);
    setCompletedTasks(0);
    const taskPlan = buildQuickPrepareTaskPlan({ dnsProviderId, executionMode });
    setTotalTasks(taskPlan.length);
    phaseTaskTotals.current = countTasksByPhase(taskPlan);
    phaseTaskCompleted.current = {};
    phaseHasUnavailable.current = {};
    reportActions.current = [];
    setRunStatus("running");
    setCurrentStatus("Montando fila real do Preparar PC.");
    void runPrepare(runId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, runKey]);

  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const remainingProgress = Math.max(0, 100 - progress);
  const activePhase =
    phases.find((item) => item.status === "running") ??
    phases.find((item) => item.status === "pending");
  const canCancel = runStatus === "running" && !cancelRequested.current;
  const canClose = runStatus !== "running" || cancelRequested.current;
  const dnsProvider = getDnsProvider(dnsProviderId);

  async function runPrepare(runId: number) {
    try {
      const nextReports = await runQuickPrepareExecutor(
        { dnsProviderId, executionMode },
        {
          shouldCancel: () => shouldStop(runId),
          onTaskStart: (update) => handleTaskStart(runId, update),
          onTaskComplete: (update) => handleTaskComplete(runId, update),
        },
      );

      if (activeRun.current !== runId) {
        return;
      }

      setRunStatus("completed");
      const executionReport = buildExecutionReport({
        phase: "prepare",
        title: "Preparação da Máquina",
        safeMode: HERMES_SAFE_TEST_MODE,
        actions: reportActions.current,
        notes: [
          "Botão 1 concluído antes da Fase 2.",
          HERMES_SAFE_TEST_MODE
            ? "Modo teste: nenhuma alteração real foi aplicada."
            : "Modo real: ajustes implementados foram executados.",
        ],
      });
      setFinalExecutionReport(executionReport);
      setCurrentStatus("Preparo concluído. Reinicie o PC antes do Botão 2.");
      onCompleted?.(nextReports, executionReport);
      appendLog("info", "Preparar PC finalizado.");
      appendLog("warning", "Reinício recomendado antes de executar Otimizar Tudo.");
    } catch (error) {
      if (activeRun.current !== runId) {
        return;
      }

      setRunStatus("failed");
      setCurrentStatus("Preparo interrompido.");
      appendLog("error", error instanceof Error ? error.message : String(error));
    }
  }

  function handleTaskStart(runId: number, update: QuickPrepareTaskUpdate) {
    if (activeRun.current !== runId) {
      return;
    }

    setCurrentStatus(update.task.title);
    updatePhase(update.task.phaseId, {
      status: "running",
      outputs: [update.task.detail],
    });
    appendLog("info", `Iniciando: ${update.task.title}.`);
  }

  function handleTaskComplete(runId: number, update: QuickPrepareTaskUpdate) {
    if (activeRun.current !== runId) {
      return;
    }

    const phaseId = update.task.phaseId;
    phaseTaskCompleted.current[phaseId] = (phaseTaskCompleted.current[phaseId] ?? 0) + 1;
    if (update.status === "unavailable") {
      phaseHasUnavailable.current[phaseId] = true;
    }

    const totalForPhase = phaseTaskTotals.current[phaseId] ?? 1;
    const doneForPhase = phaseTaskCompleted.current[phaseId] ?? 0;
    const phaseDone = doneForPhase >= totalForPhase;
    const phaseStatus: PhaseStatus = phaseDone
      ? phaseHasUnavailable.current[phaseId]
        ? "unavailable"
        : "completed"
      : "running";

    setCompletedTasks(update.taskIndex + 1);
    if (update.reports?.diagnostic) {
      onDiagnostic?.(update.reports.diagnostic);
    }
    upsertReportAction(update);
    setReports((current) => ({ ...current, ...update.reports }));
    updatePhase(phaseId, {
      status: phaseStatus,
      outputs: appendPhaseOutput(update),
    });
    appendLog(
      update.status === "unavailable" ? "warning" : "info",
      `${update.task.title}: ${update.outputs[0] ?? "ok"}`,
    );
  }

  function upsertReportAction(update: QuickPrepareTaskUpdate) {
    const isScanOnly = update.task.realPolicy === "scanOnly";
    const isAdminOnly = update.task.realPolicy === "adminOnly";
    const action: ExecutionReportAction = {
      id: update.task.id,
      title: update.task.title,
      detail: update.task.detail,
      phase:
        phaseTemplates.find((item) => item.id === update.task.phaseId)?.title ??
        update.task.phaseId,
      status: quickPrepareReportStatus(update),
      outputs: update.outputs,
      plannedCount: quickPreparePlannedCount(update),
      technicalName: `QuickPrepare.${update.task.id}`,
      commandPreview: update.task.detail,
      method: isScanOnly ? "analysis" : isAdminOnly ? "admin-engine" : "engine",
      risk: isScanOnly ? "info" : isAdminOnly ? "medium" : "low",
      implemented: update.status !== "unavailable",
    };
    reportActions.current = [
      ...reportActions.current.filter((item) => item.id !== action.id),
      action,
    ];
  }

  function requestCancel() {
    cancelRequested.current = true;
    setRunStatus("cancelled");
    setCurrentStatus("Cancelamento solicitado.");
    setPhases((current) =>
      current.map((item) =>
        item.status === "pending"
          ? { ...item, status: "cancelled", outputs: ["Cancelado pelo usuário."] }
          : item,
      ),
    );
    appendLog("warning", "Usuário cancelou Preparar PC.");
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

  function updatePhase(phaseId: QuickPreparePhaseId, patch: Partial<PreparePhase>) {
    setPhases((current) =>
      current.map((item) => (item.id === phaseId ? { ...item, ...patch } : item)),
    );
  }

  function appendLog(level: LogItem["level"], message: string) {
    setLogs((current) =>
      [{ id: `${Date.now()}-${current.length}`, level, message }, ...current].slice(0, 7),
    );
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-3 py-4 backdrop-blur-sm">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-border/80 bg-card/95 text-card-foreground shadow-[0_30px_90px_-40px_rgba(15,23,42,0.55)] backdrop-blur-xl">
        <header className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_16px_34px_-22px_rgba(37,99,235,0.9)]">
              <Zap className="h-8 w-8" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-[0.22em] text-primary">PREPARAR PC</p>
              <h2 className="mt-1 text-2xl font-black leading-tight text-foreground">
                Um clique para deixar pronto
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{currentStatus}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={!canClose}
            aria-label="Fechar Preparar PC"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background/80 text-muted-foreground transition hover:bg-muted disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="overflow-auto px-5 py-5 lg:px-6">
          <div className="mb-4 rounded-2xl border border-warning/25 bg-warning/10 px-4 py-3 text-warning">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="text-sm font-bold">
                  {HERMES_SAFE_TEST_MODE
                    ? "Modo teste ativo: o Hermes valida o que faria sem alterar o Windows."
                    : "Modo real: o Hermes executa os ajustes implementados."}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed">
                  Este fluxo usa CMD/PowerShell/Registro allowlistados por baixo: Game Mode,
                  GameDVR, DNS escolhido, visual gamer mínimo, limpeza, inicialização e processos
                  seguros.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-3">
              <div className="rounded-2xl border border-border/70 bg-background/72 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{currentStatus}</h3>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      Fase atual: {activePhase?.title ?? "Finalizando"}.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-right">
                    <ProgressStat label="Concluído" value={`${progress}%`} />
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
                  <PreparePhaseCard key={item.id} phase={item} />
                ))}
              </div>

              {reports.gamerDependencyVerification && (
                <GamerDependenciesPanel report={reports.gamerDependencyVerification} />
              )}

              {finalExecutionReport && (
                <PrepareExecutionReportPanel report={finalExecutionReport} />
              )}
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-background/72 p-4">
                <h3 className="text-[11px] font-bold tracking-[0.18em] text-primary">RESUMO</h3>
                <div className="mt-3 space-y-2 text-sm">
                  <SummaryLine label="Saúde" value={formatScore(reports.diagnostic?.healthScore)} />
                  <SummaryLine
                    label="Passos"
                    value={totalTasks > 0 ? `${completedTasks}/${totalTasks}` : "Montando"}
                  />
                  <SummaryLine
                    label="Admin"
                    value={
                      reports.system ? (reports.system.isElevated ? "Sim" : "Não") : "Verificando"
                    }
                  />
                  <SummaryLine
                    label="Temporários"
                    value={reports.clean ? `${formatGb(reports.clean.totalGb)} GB` : "Aguardando"}
                  />
                  <SummaryLine
                    label="Inicialização"
                    value={
                      reports.startup
                        ? `${reports.startup.highImpactCount} alto impacto`
                        : "Aguardando"
                    }
                  />
                  <SummaryLine
                    label="VC++/DirectX"
                    value={
                      reports.gamerDependencyVerification
                        ? `${reports.gamerDependencyVerification.readyCount}/${reports.gamerDependencyVerification.totalPackages} prontas; ${reports.gamerDependencyVerification.installedLocallyCount} instaladas`
                        : "Aguardando"
                    }
                  />
                  <SummaryLine label="DNS" value={`${dnsProvider.label} ${dnsProvider.primary}`} />
                  <SummaryLine
                    label="Processos"
                    value={
                      reports.gamer
                        ? `${reports.gamer.summary.suggestedToClose} sugeridos`
                        : "Aguardando"
                    }
                  />
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
            <RestartPrompt phase="prepare" />
          </div>
        )}

        <footer className="flex flex-col gap-3 border-t border-border/70 bg-background/78 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success" />
            {HERMES_SAFE_TEST_MODE
              ? "Modo teste: ao terminar, reinicie antes do Botão 2."
              : "Modo real: reinicie o PC antes de executar o Botão 2."}
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
              {runStatus === "running" ? "Preparando" : "Concluir"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function PreparePhaseCard({ phase }: { phase: PreparePhase }) {
  const Icon =
    phase.status === "running" ? Loader2 : phase.status === "completed" ? CheckCircle2 : phase.icon;

  return (
    <article className="rounded-2xl border border-border/70 bg-background/72 p-4">
      <div className="flex items-start gap-3">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${phaseIconClass(
            phase.status,
          )}`}
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
              className={`rounded-full border px-2 py-1 text-[10px] font-bold ${phasePillClass(
                phase.status,
              )}`}
            >
              {phaseStatusLabel(phase.status)}
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

function PrepareExecutionReportPanel({ report }: { report: ExecutionReport }) {
  const summary = report.summary;
  const visibleActions = report.actions.filter((action) => action.status !== "planned").slice(0, 5);

  return (
    <section className="rounded-2xl border border-success/20 bg-success/10 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-success">
            Relatório do Preparar PC
          </p>
          <h3 className="mt-1 text-base font-black text-foreground">
            {summary.completedActions} ação(ões) contabilizada(s)
          </h3>
          <p className="mt-1 text-[12px] font-medium text-muted-foreground">
            Reinicie o PC antes de rodar o Botão 2 para seguir com mais estabilidade.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-right sm:grid-cols-4">
          <ReportStat label="Lidas" value={summary.scannedActions} tone="primary" />
          <ReportStat label="Simuladas" value={summary.simulatedActions} tone="primary" />
          <ReportStat label="Aplicadas" value={summary.appliedActions} tone="success" />
          <ReportStat label="Indisp." value={summary.unavailableActions} tone="warning" />
        </div>
      </div>

      {visibleActions.length > 0 && (
        <div className="mt-4 grid gap-2 lg:grid-cols-2">
          {visibleActions.map((action) => (
            <div
              key={action.id}
              className="rounded-xl border border-border/60 bg-background/60 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[12px] font-black text-foreground">{action.title}</p>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${reportStatusClass(
                    action.status,
                  )}`}
                >
                  {reportStatusLabel(action.status)}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-[11px] font-medium text-muted-foreground">
                {action.outputs[0] ?? action.detail}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ReportStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "success" | "warning";
}) {
  const className =
    tone === "success"
      ? "border-success/20 bg-success/10 text-success"
      : tone === "warning"
        ? "border-warning/25 bg-warning/10 text-warning"
        : "border-primary/20 bg-primary/10 text-primary";

  return (
    <span className={`rounded-xl border px-3 py-1.5 ${className}`}>
      <span className="block text-[9px] font-bold uppercase tracking-[0.12em]">{label}</span>
      <span className="block text-sm font-black">{value}</span>
    </span>
  );
}

function GamerDependenciesPanel({ report }: { report: GamerDependencyVerificationReport }) {
  const [currentReport, setCurrentReport] = useState(report);
  const [openError, setOpenError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [lastDownloadResult, setLastDownloadResult] =
    useState<GamerDependencyDownloadResult | null>(null);
  const [lastInstallResult, setLastInstallResult] = useState<GamerDependencyInstallResult | null>(
    null,
  );

  useEffect(() => {
    setCurrentReport(report);
    setActionMessage(null);
    setLastDownloadResult(null);
    setLastInstallResult(null);
  }, [report]);

  const sortedPackages = [...currentReport.packages].sort((left, right) => {
    const order: Record<GamerDependencyVerificationStatus, number> = {
      failed: 0,
      blocked: 1,
      missing: 2,
      verified: 3,
    };
    return order[left.status] - order[right.status] || left.title.localeCompare(right.title);
  });
  const cacheLabel =
    currentReport.cacheDir.length > 96
      ? `${currentReport.cacheDir.slice(0, 93)}...`
      : currentReport.cacheDir;
  const warnings = [
    ...(openError ? [openError] : []),
    ...(actionMessage ? [actionMessage] : []),
    ...currentReport.warnings,
  ];

  async function handleOpenCache() {
    try {
      setOpenError(null);
      await openGamerDependencyCacheDir();
    } catch (error) {
      setOpenError(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleDownloadOfficial() {
    try {
      setOpenError(null);
      setActionMessage(null);
      setIsDownloading(true);
      const result = await downloadOfficialGamerDependencyInstallers();
      setCurrentReport(result.report);
      setLastDownloadResult(result);
      setLastInstallResult(null);
      setActionMessage(
        `${result.downloadedCount} baixado(s), ${result.skippedCount} já no cache, ${result.failedCount} falha(s).`,
      );
    } catch (error) {
      setOpenError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleInstallVerified() {
    try {
      setOpenError(null);
      setActionMessage(null);
      setIsInstalling(true);
      const result = await installVerifiedGamerDependencies({
        confirmed: false,
        dryRun: true,
      });
      setCurrentReport(result.report);
      setLastInstallResult(result);
      setLastDownloadResult(null);
      setActionMessage(result.message);
    } catch (error) {
      setOpenError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsInstalling(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border/70 bg-background/72 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-[0.18em] text-primary">VC++ / DIRECTX</p>
          <h3 className="mt-1 text-base font-black text-foreground">
            Dependências verificadas no cache local
          </h3>
          <p className="mt-1 truncate text-[12px] text-muted-foreground">Cache: {cacheLabel}</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button
              type="button"
              onClick={handleDownloadOfficial}
              disabled={isDownloading || isInstalling}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-success/25 bg-success/10 px-3 py-2 text-xs font-black text-success transition hover:bg-success/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Baixar oficiais
            </button>
            <button
              type="button"
              onClick={handleInstallVerified}
              disabled={isDownloading || isInstalling}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-warning/25 bg-warning/10 px-3 py-2 text-xs font-black text-warning transition hover:bg-warning/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isInstalling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              Instalar verificados
            </button>
            <button
              type="button"
              onClick={handleOpenCache}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-black text-primary transition hover:bg-primary/15"
            >
              <FolderOpen className="h-4 w-4" />
              Abrir cache
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-right sm:grid-cols-4">
            <DependencyStat label="Prontas" value={currentReport.readyCount} tone="success" />
            <DependencyStat
              label="Instaladas"
              value={currentReport.installedLocallyCount}
              tone="success"
            />
            <DependencyStat label="Bloqueadas" value={currentReport.blockedCount} tone="warning" />
            <DependencyStat label="Total" value={currentReport.totalPackages} tone="primary" />
          </div>
        </div>
      </div>

      {(lastDownloadResult || lastInstallResult) && (
        <DependencyExecutionReport
          downloadResult={lastDownloadResult}
          installResult={lastInstallResult}
        />
      )}

      <div className="mt-4 max-h-64 overflow-auto rounded-xl border border-border/70">
        {sortedPackages.map((item) => (
          <DependencyRow key={item.packageId} item={item} />
        ))}
      </div>

      {warnings.length > 0 && (
        <div className="mt-3 space-y-1">
          {warnings.slice(0, 2).map((warning) => (
            <p
              key={warning}
              className="rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-[11px] font-semibold text-warning"
            >
              {warning}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

function DependencyExecutionReport({
  downloadResult,
  installResult,
}: {
  downloadResult: GamerDependencyDownloadResult | null;
  installResult: GamerDependencyInstallResult | null;
}) {
  if (installResult) {
    const visibleActions = installResult.actions.slice(0, 8);

    return (
      <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              Relatório da última ação
            </p>
            <h4 className="mt-1 text-sm font-black text-foreground">
              Instalação controlada VC++/DirectX
            </h4>
            <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
              {installResult.message}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <DependencyStat
              label="Simulados"
              value={countInstallStatus(installResult, "dryRun")}
              tone="primary"
            />
            <DependencyStat label="Pulados" value={installResult.skippedCount} tone="primary" />
            <DependencyStat label="Bloq." value={installResult.blockedCount} tone="warning" />
            <DependencyStat label="Falhas" value={installResult.failedCount} tone="warning" />
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-border/60">
          {visibleActions.map((action) => (
            <DependencyExecutionRow key={action.packageId} action={action} />
          ))}
        </div>
      </div>
    );
  }

  if (!downloadResult) {
    return null;
  }

  return (
    <div className="mt-4 rounded-2xl border border-success/15 bg-success/5 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-success">
            Relatório da última ação
          </p>
          <h4 className="mt-1 text-sm font-black text-foreground">Download oficial para cache</h4>
          <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
            Baixa apenas URLs Microsoft/aka.ms e valida assinatura antes de salvar no cache.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <DependencyStat label="Baixados" value={downloadResult.downloadedCount} tone="success" />
          <DependencyStat label="Cache" value={downloadResult.skippedCount} tone="primary" />
          <DependencyStat label="Falhas" value={downloadResult.failedCount} tone="warning" />
        </div>
      </div>
      {downloadResult.messages.length > 0 && (
        <div className="mt-3 space-y-1">
          {downloadResult.messages.slice(0, 4).map((message) => (
            <p
              key={message}
              className="truncate rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-[11px] font-semibold text-muted-foreground"
            >
              {message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function DependencyExecutionRow({ action }: { action: GamerDependencyInstallActionResult }) {
  return (
    <div className="grid gap-2 border-b border-border/60 bg-background/50 px-3 py-2.5 last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <p className="truncate text-[12px] font-black text-foreground">{action.title}</p>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{action.commandPreview}</p>
      </div>
      <p className="truncate text-[11px] font-medium text-muted-foreground">{action.message}</p>
      <span
        className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-black ${dependencyInstallStatusClass(
          action.status,
        )}`}
      >
        {dependencyInstallStatusLabel(action.status)}
      </span>
    </div>
  );
}

function DependencyRow({ item }: { item: GamerDependencyVerificationItem }) {
  const reason = item.installedLocally
    ? "Já instalado no Windows; o Hermes não reinstala."
    : (item.blockedReasons[0] ?? dependencyStatusLabel(item.status));
  const label = item.installedLocally ? "Instalado" : dependencyStatusLabel(item.status);

  return (
    <div className="grid gap-2 border-b border-border/60 bg-background/50 px-3 py-2.5 last:border-b-0 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.95fr)_auto] md:items-center">
      <div className="min-w-0">
        <p className="truncate text-[12px] font-black text-foreground">{item.title}</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {item.installerFileName}
        </p>
      </div>
      <p className="min-w-0 truncate text-[11px] font-medium text-muted-foreground">{reason}</p>
      <span
        className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-black ${dependencyStatusClass(
          item.status,
        )}`}
      >
        {label}
      </span>
    </div>
  );
}

function DependencyStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "success" | "warning";
}) {
  const className =
    tone === "success"
      ? "border-success/20 bg-success/10 text-success"
      : tone === "warning"
        ? "border-warning/25 bg-warning/10 text-warning"
        : "border-primary/20 bg-primary/10 text-primary";

  return (
    <span className={`rounded-xl border px-3 py-1.5 ${className}`}>
      <span className="block text-[9px] font-bold uppercase tracking-[0.12em]">{label}</span>
      <span className="block text-sm font-black">{value}</span>
    </span>
  );
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

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/70 px-3 py-2">
      <span className="text-[12px] font-bold text-muted-foreground">{label}</span>
      <span className="text-[12px] font-black text-foreground">{value}</span>
    </div>
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
  id: QuickPreparePhaseId,
  title: string,
  subtitle: string,
  icon: LucideIcon,
): PreparePhase {
  return {
    id,
    title,
    subtitle,
    icon,
    status: "pending",
    outputs: [],
  };
}

function resetPhases() {
  return phaseTemplates.map((item) => ({ ...item, status: "pending" as const, outputs: [] }));
}

function countTasksByPhase(tasks: Array<{ phaseId: QuickPreparePhaseId }>) {
  return tasks.reduce<Partial<Record<QuickPreparePhaseId, number>>>((totals, item) => {
    totals[item.phaseId] = (totals[item.phaseId] ?? 0) + 1;
    return totals;
  }, {});
}

function appendPhaseOutput(update: QuickPrepareTaskUpdate) {
  const firstOutput = update.outputs[0] ?? phaseStatusLabel(update.status);
  return [`${update.task.title}: ${firstOutput}`, ...update.outputs.slice(1, 3)];
}

function quickPrepareReportStatus(update: QuickPrepareTaskUpdate): ExecutionReportStatus {
  if (update.status === "unavailable") {
    return "unavailable";
  }
  if (update.task.realPolicy === "scanOnly") {
    return "scanned";
  }
  return HERMES_SAFE_TEST_MODE ? "simulated" : "applied";
}

function quickPreparePlannedCount(update: QuickPrepareTaskUpdate) {
  if (update.status === "unavailable") {
    return 1;
  }

  if (update.task.id === "check-admin") return 2;
  if (update.task.id === "scan-diagnostic") return 8;
  if (update.task.id === "scan-performance") return 4;
  if (update.task.id === "scan-advanced")
    return Math.max(1, update.reports?.advanced?.actions.length ?? 1);
  if (update.task.id === "scan-gamer-dependencies") {
    return Math.max(1, update.reports?.gamerDependencyVerification?.totalPackages ?? 1);
  }
  if (update.task.id === "install-gamer-dependencies") {
    return Math.max(1, update.reports?.gamerDependencyInstallResult?.actions.length ?? 1);
  }
  if (update.task.id === "scan-clean") return Math.max(1, update.reports?.clean?.items.length ?? 1);
  if (update.task.id === "apply-clean") {
    return Math.max(1, update.reports?.cleanResult?.plannedEntries ?? 1);
  }
  if (update.task.id === "scan-startup")
    return Math.max(1, update.reports?.startup?.totalItems ?? 1);
  if (update.task.id === "apply-startup") {
    return Math.max(1, update.reports?.startupResult?.selectedItems ?? 1);
  }
  if (update.task.id === "scan-processes") {
    return Math.max(1, update.reports?.gamer?.summary.suggestedToClose ?? 1);
  }
  if (update.task.id === "apply-processes") {
    return Math.max(1, update.reports?.gamerResult?.closedProcesses.length ?? 1);
  }
  if (update.task.id.startsWith("performance-")) {
    return Math.max(1, update.reports?.performanceResult?.appliedActions.length ?? 2);
  }
  if (update.task.id.startsWith("advanced-")) {
    return quickPrepareAdvancedActionWeight(update.task.id.replace("advanced-", ""));
  }

  return 1;
}

function quickPrepareAdvancedActionWeight(actionId: string) {
  const weights: Record<string, number> = {
    "enable-game-mode": 2,
    "disable-game-dvr": 2,
    "disable-xbox-game-bar-deep": 6,
    "set-visual-effects-gamer-minimal": 18,
    "disable-hibernation": 1,
    "disable-startup-delay": 1,
    "disable-advertising-id": 1,
    "disable-tailored-experiences": 1,
    "disable-consumer-features": 2,
    "disable-activity-history": 1,
    "disable-location-tracking": 1,
    "disable-recall-user": 1,
    "flush-dns-cache": 1,
    "dism-analyze-component-store": 1,
    "dism-start-component-cleanup": 1,
    "dism-check-netfx3": 1,
    "dism-check-directplay": 1,
    "check-gamer-dependencies": 6,
    "set-diagtrack-service-manual": 1,
    "set-mapsbroker-service-manual": 1,
    "set-dns-cloudflare": 3,
    "set-dns-google": 3,
    "set-dns-opendns": 3,
    "set-dns-quad9": 3,
    "set-dns-adguard": 3,
  };

  return weights[actionId] ?? 1;
}

function reportStatusClass(status: ExecutionReportAction["status"]) {
  if (status === "applied") return "border-success/20 bg-success/10 text-success";
  if (status === "simulated" || status === "scanned") {
    return "border-primary/20 bg-primary/10 text-primary";
  }
  if (status === "failed") return "border-destructive/20 bg-destructive/10 text-destructive";
  if (status === "unavailable") return "border-warning/25 bg-warning/10 text-warning";
  return "border-border bg-muted text-muted-foreground";
}

function reportStatusLabel(status: ExecutionReportAction["status"]) {
  if (status === "applied") return "Aplicado";
  if (status === "simulated") return "Simulado";
  if (status === "scanned") return "Lido";
  if (status === "unavailable") return "Indisp.";
  if (status === "failed") return "Falha";
  if (status === "cancelled") return "Cancelado";
  return "Planejado";
}

function phaseIconClass(status: PhaseStatus) {
  if (status === "completed") return "bg-success/10 text-success";
  if (status === "running") return "bg-primary/10 text-primary";
  if (status === "unavailable") return "bg-warning/10 text-warning";
  if (status === "cancelled") return "bg-muted text-muted-foreground";
  return "bg-primary-soft text-primary";
}

function phasePillClass(status: PhaseStatus) {
  if (status === "completed") return "border-success/20 bg-success/10 text-success";
  if (status === "running") return "border-primary/20 bg-primary/10 text-primary";
  if (status === "unavailable") return "border-warning/25 bg-warning/10 text-warning";
  if (status === "cancelled") return "border-border bg-muted text-muted-foreground";
  return "border-border bg-muted text-muted-foreground";
}

function phaseStatusLabel(status: PhaseStatus) {
  if (status === "completed") return "Ok";
  if (status === "running") return "Rodando";
  if (status === "unavailable") return "Indisp.";
  if (status === "cancelled") return "Cancelado";
  return "Pendente";
}

function dependencyStatusClass(status: GamerDependencyVerificationStatus) {
  if (status === "verified") return "border-success/20 bg-success/10 text-success";
  if (status === "failed") return "border-destructive/20 bg-destructive/10 text-destructive";
  if (status === "blocked") return "border-warning/25 bg-warning/10 text-warning";
  return "border-border bg-muted text-muted-foreground";
}

function dependencyStatusLabel(status: GamerDependencyVerificationStatus) {
  if (status === "verified") return "Pronto";
  if (status === "failed") return "Falha";
  if (status === "blocked") return "Bloqueado";
  return "Ausente";
}

function countInstallStatus(
  result: GamerDependencyInstallResult,
  status: GamerDependencyInstallActionStatus,
) {
  return result.actions.filter((item) => item.status === status).length;
}

function dependencyInstallStatusClass(status: GamerDependencyInstallActionStatus) {
  if (status === "installed") return "border-success/20 bg-success/10 text-success";
  if (status === "dryRun") return "border-primary/20 bg-primary/10 text-primary";
  if (status === "skipped") return "border-border bg-muted text-muted-foreground";
  if (status === "failed") return "border-destructive/20 bg-destructive/10 text-destructive";
  return "border-warning/25 bg-warning/10 text-warning";
}

function dependencyInstallStatusLabel(status: GamerDependencyInstallActionStatus) {
  if (status === "installed") return "Instalado";
  if (status === "dryRun") return "Simulado";
  if (status === "skipped") return "Pulado";
  if (status === "failed") return "Falha";
  return "Bloqueado";
}

function formatScore(value?: number) {
  return typeof value === "number" ? `${Math.round(value)}/100` : "Aguardando";
}

function formatGb(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value);
}
