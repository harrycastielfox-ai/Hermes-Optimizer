import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Gamepad2,
  Gauge,
  HardDrive,
  ListChecks,
  Lock,
  Power,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { SafeTestModeNotice } from "@/components/common/SafeTestModeNotice";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { QuickPrepareModal } from "@/components/optimization/QuickPrepareModal";
import { SmartOptimizeModal } from "@/components/optimization/SmartOptimizeModal";
import {
  DNS_PROVIDERS,
  type DnsProvider,
  type DnsProviderId,
  type QuickPrepareReports,
} from "@/lib/quick-prepare";
import {
  fallbackDiagnosticReport,
  loadDiagnosticReport,
  type DiagnosticReport,
} from "@/lib/diagnostic";
import { HERMES_SAFE_TEST_MODE } from "@/lib/safe-mode";
import { readSystemBootContext, type SystemBootContext } from "@/lib/system";
import {
  HERMES_ACTION_TARGET,
  type ExecutionReport,
  type ExecutionReportRisk,
  type ExecutionReportStatus,
} from "@/lib/execution-report";

const QUICK_PREPARE_STORAGE_KEY = "hermes.quickPrepare.completed.v1";
const RESTART_RECOMMENDATION_STORAGE_KEY = "hermes.restart.recommended.v1";
const EXECUTION_REPORT_STORAGE_KEY = "hermes.execution.report.v1";

type QuickPrepareGate = {
  completedAt: string;
  dnsProviderId: DnsProviderId;
  safeMode: boolean;
  bootIdAtCompletion?: string;
  bootedAtAtCompletion?: string;
};

type RestartRecommendation = {
  phase: "prepare" | "optimize";
  createdAt: string;
  safeMode: boolean;
  message: string;
  bootIdAtCreated?: string;
};

type PrepareRebootStatus = "missing" | "unknown" | "pending" | "confirmed";

export const Route = createFileRoute("/otimizar")({
  head: () => ({
    meta: [
      { title: "Hermes Optimizer - Otimizar" },
      {
        name: "description",
        content: "Area de otimiza??o guiada do Hermes Optimizer.",
      },
    ],
  }),
  component: OtimizarPage,
});

function OtimizarPage() {
  const [diagnostic, setDiagnostic] = useState<DiagnosticReport>(fallbackDiagnosticReport);
  const [isQuickPrepareOpen, setIsQuickPrepareOpen] = useState(false);
  const [quickPrepareRunKey, setQuickPrepareRunKey] = useState(0);
  const [isSmartOptimizeOpen, setIsSmartOptimizeOpen] = useState(false);
  const [smartOptimizeRunKey, setSmartOptimizeRunKey] = useState(0);
  const [selectedDnsProviderId, setSelectedDnsProviderId] = useState<DnsProviderId>("cloudflare");
  const [quickPrepareGate, setQuickPrepareGate] = useState<QuickPrepareGate | null>(() =>
    readQuickPrepareGate(),
  );
  const [restartRecommendation, setRestartRecommendation] = useState<RestartRecommendation | null>(
    () => readRestartRecommendation(),
  );
  const [executionReport, setExecutionReport] = useState<ExecutionReport | null>(() =>
    readExecutionReport(),
  );
  const [systemBootContext, setSystemBootContext] = useState<SystemBootContext | null>(null);

  useEffect(() => {
    let mounted = true;

    void loadDiagnosticReport().then((report) => {
      if (mounted) {
        setDiagnostic(report);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    void readSystemBootContext().then((context) => {
      if (mounted) {
        setSystemBootContext(context);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const handlePrepareNow = useCallback(() => {
    if (isQuickPrepareOpen) {
      return;
    }

    setQuickPrepareRunKey((current) => current + 1);
    setIsQuickPrepareOpen(true);
  }, [isQuickPrepareOpen]);

  const handleOptimizeNow = useCallback(() => {
    if (!quickPrepareGate) {
      return;
    }
    if (isSmartOptimizeOpen) {
      return;
    }

    setSmartOptimizeRunKey((current) => current + 1);
    setIsSmartOptimizeOpen(true);
  }, [isSmartOptimizeOpen, quickPrepareGate]);

  const handleDiagnosticUpdate = useCallback((report: DiagnosticReport) => {
    setDiagnostic(report);
  }, []);

  const handlePrepareCompleted = useCallback(
    (_reports: QuickPrepareReports, report: ExecutionReport) => {
      void (async () => {
        const bootContext = systemBootContext?.available
          ? systemBootContext
          : await readSystemBootContext();

        if (bootContext.available) {
          setSystemBootContext(bootContext);
        }

        const completedAt = new Date().toISOString();
        const nextGate: QuickPrepareGate = {
          completedAt,
          dnsProviderId: selectedDnsProviderId,
          safeMode: HERMES_SAFE_TEST_MODE,
          bootIdAtCompletion: bootContext.currentBootId,
          bootedAtAtCompletion: bootContext.bootedAt,
        };
        setQuickPrepareGate(nextGate);
        writeQuickPrepareGate(nextGate);
        const nextRestart: RestartRecommendation = {
          phase: "prepare",
          createdAt: completedAt,
          safeMode: HERMES_SAFE_TEST_MODE,
          message: "Reinicie o PC antes de executar a Otimiza??o Avan?ada.",
          bootIdAtCreated: bootContext.currentBootId,
        };
        setRestartRecommendation(nextRestart);
        writeRestartRecommendation(nextRestart);
        setExecutionReport(report);
        writeExecutionReport(report);
      })();
    },
    [selectedDnsProviderId, systemBootContext],
  );

  const handleOptimizeCompleted = useCallback((report: ExecutionReport) => {
    const nextRestart: RestartRecommendation = {
      phase: "optimize",
      createdAt: new Date().toISOString(),
      safeMode: HERMES_SAFE_TEST_MODE,
      message: "Reinicio final recomendado para consolidar o plano aplicado.",
    };
    setRestartRecommendation(nextRestart);
    writeRestartRecommendation(nextRestart);
    setExecutionReport(report);
    writeExecutionReport(report);
  }, []);

  const healthScore = Math.round(diagnostic.healthScore);
  const projectStats = [
    { label: "Sa?de", value: `${healthScore}/100` },
    { label: "Meta", value: "150 a??es" },
    { label: "Modo", value: HERMES_SAFE_TEST_MODE ? "Teste" : "Real" },
  ];
  const machineFacts = [
    { icon: Cpu, label: "CPU", value: compactValue(diagnostic.cpu.name) },
    { icon: HardDrive, label: "Disco", value: diagnostic.disk.healthStatus },
    { icon: Gamepad2, label: "GPU", value: compactValue(diagnostic.gpu.name) },
  ];
  const projectPhases = [
    { icon: Activity, title: "Diagn?stico", text: "Entende o PC antes de qualquer decis?o." },
    {
      icon: Wrench,
      title: "Componentes",
      text: "VC++, DirectX e depend?ncias entram como modulo.",
    },
    { icon: Gauge, title: "Performance", text: "Energia, inicializa??o, limpeza e modo gamer." },
  ];
  const optimizeLocked =
    !quickPrepareGate ||
    quickPrepareGate.safeMode !== HERMES_SAFE_TEST_MODE ||
    quickPrepareGate.dnsProviderId !== selectedDnsProviderId;
  const prepareRebootStatus = getPrepareRebootStatus(quickPrepareGate, systemBootContext);
  const selectedDnsProvider =
    DNS_PROVIDERS.find((provider) => provider.id === selectedDnsProviderId) ?? DNS_PROVIDERS[0];

  return (
    <div className="lightning-bg flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-auto px-5 pb-4 pt-6 xl:px-8 xl:pt-7">
          <div className="mx-auto flex min-h-full w-full max-w-[1220px] flex-col">
            <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div>
                <p className="mb-2 text-xs font-bold tracking-[0.22em] text-primary">
                  PROJETO DE OTIMIZACAO
                </p>
                <h1 className="text-[clamp(30px,3vw,48px)] font-black leading-tight tracking-normal text-foreground">
                  Hermes em dois passos
                </h1>
                <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">
                  O Dashboard acompanha o PC. Esta area concentra a parte que resolve: analisar,
                  montar o plano e preparar a otimiza??o em fases.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 self-end">
                {projectStats.map((item) => (
                  <MiniStat key={item.label} label={item.label} value={item.value} />
                ))}
              </div>
            </div>

            <SafeTestModeNotice />

            <DnsProviderPicker
              selectedProviderId={selectedDnsProviderId}
              onSelect={setSelectedDnsProviderId}
            />

            <OptimizationPhaseBoard
              selectedDnsProvider={selectedDnsProvider}
              quickPrepareGate={quickPrepareGate}
              isQuickPrepareOpen={isQuickPrepareOpen}
              isSmartOptimizeOpen={isSmartOptimizeOpen}
              optimizeLocked={optimizeLocked}
              restartRecommendation={restartRecommendation}
              prepareRebootStatus={prepareRebootStatus}
              onPrepare={handlePrepareNow}
              onOptimize={handleOptimizeNow}
            />

            {executionReport && <ExecutionReportPanel report={executionReport} />}

            <section className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
              {machineFacts.map((item) => (
                <InfoTile key={item.label} icon={item.icon} label={item.label} value={item.value} />
              ))}
            </section>

            <section className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
              {projectPhases.map((item) => (
                <TrustCard key={item.title} icon={item.icon} title={item.title} text={item.text} />
              ))}
            </section>
          </div>
        </main>
      </div>

      <QuickPrepareModal
        open={isQuickPrepareOpen}
        runKey={quickPrepareRunKey}
        onClose={() => setIsQuickPrepareOpen(false)}
        onDiagnostic={handleDiagnosticUpdate}
        onCompleted={handlePrepareCompleted}
        dnsProviderId={selectedDnsProviderId}
      />
      <SmartOptimizeModal
        open={isSmartOptimizeOpen}
        runKey={smartOptimizeRunKey}
        onClose={() => setIsSmartOptimizeOpen(false)}
        onCompleted={handleOptimizeCompleted}
      />
    </div>
  );
}

function readQuickPrepareGate(): QuickPrepareGate | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(QUICK_PREPARE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as QuickPrepareGate;
    if (!parsed.completedAt || !parsed.dnsProviderId) {
      return null;
    }
    if (parsed.safeMode !== HERMES_SAFE_TEST_MODE) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeQuickPrepareGate(gate: QuickPrepareGate) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(QUICK_PREPARE_STORAGE_KEY, JSON.stringify(gate));
}

function readRestartRecommendation(): RestartRecommendation | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(RESTART_RECOMMENDATION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as RestartRecommendation;
    if (!parsed.createdAt || !parsed.message || parsed.safeMode !== HERMES_SAFE_TEST_MODE) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeRestartRecommendation(recommendation: RestartRecommendation) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(RESTART_RECOMMENDATION_STORAGE_KEY, JSON.stringify(recommendation));
}

function readExecutionReport(): ExecutionReport | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(EXECUTION_REPORT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as ExecutionReport;
    if (!parsed.createdAt || !parsed.title || !parsed.summary || !Array.isArray(parsed.actions)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeExecutionReport(report: ExecutionReport) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(EXECUTION_REPORT_STORAGE_KEY, JSON.stringify(report));
}

function getPrepareRebootStatus(
  gate: QuickPrepareGate | null,
  bootContext: SystemBootContext | null,
): PrepareRebootStatus {
  if (!gate) {
    return "missing";
  }
  if (!gate.bootIdAtCompletion || !bootContext?.available || !bootContext.currentBootId) {
    return "unknown";
  }
  return gate.bootIdAtCompletion === bootContext.currentBootId ? "pending" : "confirmed";
}

function ExecutionReportPanel({ report }: { report: ExecutionReport }) {
  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(report.createdAt));
  const visibleActions = report.actions.slice(-7).reverse();
  const missingLabel =
    report.summary.missingToTarget === 0
      ? "Meta mapeada"
      : `${report.summary.missingToTarget} faltam`;

  return (
    <section className="mt-4 rounded-2xl border border-border/70 bg-card/90 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-24px_rgba(15,23,42,0.22)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <ListChecks className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.2em] text-primary">RELATORIO DE EXECUCAO</p>
            <h2 className="mt-1 text-lg font-black text-foreground">{report.title}</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              {report.safeMode
                ? "Modo teste: a??es contabilizadas como leitura ou simulacao."
                : "Modo real: a??es implementadas contabilizadas como aplicadas."}
            </p>
          </div>
        </div>
        <span className="w-fit rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-bold text-muted-foreground">
          {dateLabel}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-7">
        <ReportStat label="Meta" value={`${HERMES_ACTION_TARGET}`} />
        <ReportStat label="Mapeadas" value={`${report.summary.plannedActions}`} />
        <ReportStat
          label={report.safeMode ? "Simuladas" : "Aplicadas"}
          value={`${report.safeMode ? report.summary.simulatedActions : report.summary.appliedActions}`}
        />
        <ReportStat label="Leituras" value={`${report.summary.scannedActions}`} />
        <ReportStat label="Planejadas" value={`${report.summary.plannedOnlyActions}`} />
        <ReportStat label="Indisp." value={`${report.summary.unavailableActions}`} />
        <ReportStat label="Para 150" value={missingLabel} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-2">
          {visibleActions.length > 0 ? (
            visibleActions.map((action) => <ExecutionActionRow key={action.id} action={action} />)
          ) : (
            <p className="rounded-xl border border-dashed border-border bg-background/60 px-3 py-4 text-sm text-muted-foreground">
              Nenhuma a??o registrada ainda.
            </p>
          )}
        </div>
        <div className="rounded-xl border border-border/70 bg-background/70 p-3">
          <p className="text-[11px] font-bold tracking-[0.16em] text-primary">PROXIMO FOCO</p>
          <p className="mt-2 text-sm font-black text-foreground">
            {report.summary.plannedOnlyActions > 0
              ? "Converter planejadas em motor real"
              : report.summary.missingToTarget === 0
                ? "Auditoria completa"
                : "Aumentar catalogo real"}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            {report.summary.plannedOnlyActions > 0
              ? `${report.summary.plannedOnlyActions} acao(oes) ja estao desenhadas, mas ainda nao devem ser tratadas como executadas. O proximo passo e implementar esses itens no motor allowlistado.`
              : report.summary.missingToTarget === 0
                ? "As 150 a??es estao mapeadas como itens tecnicos auditaveis. Agora o refinamento e aumentar a parte aplicada no modo real."
                : "A Fase 1 ainda mostra a distancia at? 150. O caminho e converter mais ajustes seguros em a??es reais do motor Hermes."}
          </p>
          {report.notes.length > 0 && (
            <div className="mt-3 space-y-1">
              {report.notes.slice(0, 3).map((note) => (
                <p key={note} className="text-[11px] font-semibold text-muted-foreground">
                  {note}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-base font-black text-foreground">{value}</p>
    </div>
  );
}

function ExecutionActionRow({ action }: { action: ExecutionReport["actions"][number] }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-black text-foreground">{action.title}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {action.phase} - {action.detail}
          </p>
          {(action.technicalName || action.method || action.risk) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {action.technicalName && (
                <span className="rounded-full border border-border/70 bg-card/80 px-2 py-1 text-[10px] font-bold text-muted-foreground">
                  {action.technicalName}
                </span>
              )}
              {action.method && (
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                  {methodLabel(action.method)}
                </span>
              )}
              {action.risk && (
                <span
                  className={`rounded-full border px-2 py-1 text-[10px] font-bold ${riskClass(
                    action.risk,
                  )}`}
                >
                  {riskLabel(action.risk)}
                </span>
              )}
            </div>
          )}
          {action.commandPreview && (
            <code className="mt-2 block max-w-full overflow-hidden text-ellipsis rounded-lg border border-border/70 bg-muted/55 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground">
              {action.commandPreview}
            </code>
          )}
          {action.outputs[0] && (
            <p className="mt-1 truncate text-[11px] font-semibold text-muted-foreground">
              {action.outputs[0]}
            </p>
          )}
        </div>
        <span
          className={`inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${executionStatusClass(
            action.status,
          )}`}
        >
          {executionStatusLabel(action.status)}
          {action.plannedCount > 1 && ` x${action.plannedCount}`}
        </span>
      </div>
    </div>
  );
}

function executionStatusLabel(status: ExecutionReportStatus) {
  if (status === "planned") return "Planejado";
  if (status === "scanned") return "Leitura";
  if (status === "simulated") return "Simulado";
  if (status === "applied") return "Aplicado";
  if (status === "unavailable") return "Indisp.";
  if (status === "failed") return "Falhou";
  return "Cancelado";
}

function executionStatusClass(status: ExecutionReportStatus) {
  if (status === "planned") {
    return "border-primary/20 bg-primary/10 text-primary";
  }
  if (status === "applied" || status === "simulated" || status === "scanned") {
    return "border-success/20 bg-success/10 text-success";
  }
  if (status === "unavailable") {
    return "border-warning/25 bg-warning/10 text-warning";
  }
  return "border-destructive/20 bg-destructive/10 text-destructive";
}

function methodLabel(method: string) {
  if (method === "cmd") return "CMD";
  if (method === "powershell") return "PowerShell";
  if (method === "registry") return "Registro";
  if (method === "analysis") return "Leitura";
  if (method === "profile") return "Perfil";
  if (method === "admin-engine") return "Admin";
  return "Engine";
}

function riskLabel(risk: ExecutionReportRisk) {
  if (risk === "info") return "Info";
  if (risk === "low") return "Baixo";
  if (risk === "medium") return "Medio";
  return "Alto";
}

function riskClass(risk: ExecutionReportRisk) {
  if (risk === "info") return "border-border bg-muted text-muted-foreground";
  if (risk === "low") return "border-success/20 bg-success/10 text-success";
  if (risk === "medium") return "border-warning/25 bg-warning/10 text-warning";
  return "border-destructive/20 bg-destructive/10 text-destructive";
}

function OptimizationPhaseBoard({
  selectedDnsProvider,
  quickPrepareGate,
  isQuickPrepareOpen,
  isSmartOptimizeOpen,
  optimizeLocked,
  restartRecommendation,
  prepareRebootStatus,
  onPrepare,
  onOptimize,
}: {
  selectedDnsProvider: DnsProvider;
  quickPrepareGate: QuickPrepareGate | null;
  isQuickPrepareOpen: boolean;
  isSmartOptimizeOpen: boolean;
  optimizeLocked: boolean;
  restartRecommendation: RestartRecommendation | null;
  prepareRebootStatus: PrepareRebootStatus;
  onPrepare: () => void;
  onOptimize: () => void;
}) {
  const completedLabel = quickPrepareGate
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(quickPrepareGate.completedAt))
    : null;
  const phase2Ideal = !optimizeLocked && prepareRebootStatus === "confirmed";
  const phase2PendingReboot = !optimizeLocked && prepareRebootStatus === "pending";
  const phase2StatusLabel = optimizeLocked
    ? "Bloqueado"
    : phase2Ideal
      ? "Ideal"
      : phase2PendingReboot
        ? "Reinicie antes"
        : "Liberado";
  const phase2StatusClass = optimizeLocked
    ? "bg-warning/10 text-warning"
    : phase2Ideal
      ? "bg-success/10 text-success"
      : phase2PendingReboot
        ? "bg-warning/10 text-warning"
        : "bg-primary/10 text-primary";

  return (
    <section className="mt-5">
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.22em] text-primary">FASES DE OTIMIZACAO</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Faca na ordem. Conclua a preparacao, reinicie quando o Hermes pedir e depois rode a fase
            avan?ada.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-3 rounded-full border border-border/70 bg-card/85 px-4 py-2">
          <PhaseStepperItem index="1" label="Preparacao" active />
          <span className="h-px w-8 bg-border" />
          <PhaseStepperItem index="2" label="Avan?ada" active={!optimizeLocked} />
        </div>
      </div>

      {restartRecommendation && (
        <RestartRecommendationNotice
          recommendation={restartRecommendation}
          prepareRebootStatus={prepareRebootStatus}
        />
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-success/35 bg-card/90 p-3.5 shadow-[0_18px_38px_-32px_rgba(34,197,94,0.6)]">
          <div className="mb-3 flex items-start justify-between gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-success text-sm font-black text-success-foreground shadow-[0_14px_30px_-20px_rgba(34,197,94,0.8)]">
              1
            </span>
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                quickPrepareGate ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
              }`}
            >
              {quickPrepareGate ? "Concluida" : "Aguardando"}
            </span>
          </div>
          <h2 className="text-base font-black text-foreground">Preparacao da Maquina</h2>
          <div className="mt-3 space-y-2">
            <PhaseActionRow index="1" label="Preparar maquina" ready />
            <PhaseActionRow
              index="2"
              label={`Aplicar DNS ${selectedDnsProvider.label}`}
              ready
              accent={selectedDnsProvider.label}
            />
            <PhaseActionRow index="3" label="Game Mode, GameDVR OFF e visual gamer" ready />
            <PhaseActionRow index="4" label="Hibernacao, privacidade e servicos seguros" ready />
          </div>
          <button
            type="button"
            onClick={onPrepare}
            disabled={isQuickPrepareOpen}
            className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-center text-sm font-black text-primary-foreground shadow-[0_14px_34px_-24px_rgba(37,99,235,0.95)] transition hover:bg-primary/95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isQuickPrepareOpen ? "Preparando..." : "Iniciar Preparacao"}
          </button>
          <p className="mt-2 text-center text-[12px] font-bold text-muted-foreground">
            Leva de 2 a 5 minutos. Depois reinicie para a Fase 2 render melhor.
          </p>
        </article>

        <article
          className={`rounded-2xl border p-3.5 shadow-[0_18px_38px_-32px_rgba(37,99,235,0.6)] ${
            optimizeLocked ? "border-success/25 bg-card/70" : "border-primary/35 bg-card/90"
          }`}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <span
              className={`grid h-9 w-9 place-items-center rounded-xl text-sm font-black ${
                optimizeLocked
                  ? "bg-success/80 text-success-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              2
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold ${phase2StatusClass}`}
            >
              {optimizeLocked && <Lock className="h-3 w-3" />}
              {phase2StatusLabel}
            </span>
          </div>
          <h2 className="text-base font-black text-foreground">Otimiza??o Avan?ada</h2>
          <div className="mt-3 space-y-2">
            <PhaseActionRow
              index="1"
              label="Aplicar cache e limpeza avan?ada"
              ready={!optimizeLocked}
            />
            <PhaseActionRow
              index="2"
              label="Otimizar sistema e perfil recomendado"
              ready={!optimizeLocked}
            />
            <PhaseActionRow
              index="3"
              label="Otimizar rede, Gamer e Fate Trigger"
              ready={!optimizeLocked}
            />
          </div>
          {optimizeLocked ? (
            <div className="mt-4 rounded-xl border border-border/60 bg-muted/70 px-4 py-3 text-center">
              <p className="text-sm font-black text-foreground">Conclua a Fase 1 primeiro</p>
              <p className="mt-1 text-[12px] font-semibold text-muted-foreground">
                Faca a Preparacao da Maquina antes. O Hermes libera este botao depois.
              </p>
            </div>
          ) : (
            <>
              <Phase2RebootReadiness completedLabel={completedLabel} status={prepareRebootStatus} />
              <button
                type="button"
                onClick={onOptimize}
                disabled={isSmartOptimizeOpen}
                className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-center text-sm font-black text-primary-foreground shadow-[0_14px_34px_-24px_rgba(37,99,235,0.95)] transition hover:bg-primary/95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSmartOptimizeOpen
                  ? "Otimizando..."
                  : prepareRebootStatus === "confirmed"
                    ? "Iniciar Otimiza??o Avan?ada"
                    : "Iniciar mesmo assim"}
              </button>
              <p className="mt-2 text-center text-[12px] font-bold text-muted-foreground">
                {prepareRebootStatus === "confirmed"
                  ? `Reinicio detectado apos o preparo: ${completedLabel}.`
                  : `Reinicio recomendado antes desta fase. Ultimo preparo: ${completedLabel}.`}
              </p>
            </>
          )}
        </article>
      </div>
    </section>
  );
}

function Phase2RebootReadiness({
  status,
  completedLabel,
}: {
  status: PrepareRebootStatus;
  completedLabel: string | null;
}) {
  const isConfirmed = status === "confirmed";
  const isPending = status === "pending";
  const Icon = isConfirmed ? CheckCircle2 : isPending ? AlertTriangle : Power;
  const title = isConfirmed
    ? "Reinicio detectado"
    : isPending
      ? "Aguardando reinicio"
      : "Reinicio n?o verificado";
  const text = isConfirmed
    ? "O Windows iniciou de novo depois da Fase 1. A Fase 2 esta no ponto ideal."
    : isPending
      ? "A Fase 1 foi concluida nesta mesma sessao do Windows. Reiniciar antes da Fase 2 tende a render melhor."
      : "No app instalado o Hermes detecta o boot real do Windows. Se estiver no navegador, essa leitura pode ficar indispon?vel.";
  const colorClass = isConfirmed
    ? "border-success/25 bg-success/10 text-success"
    : isPending
      ? "border-warning/25 bg-warning/10 text-warning"
      : "border-primary/25 bg-primary/10 text-primary";

  return (
    <div className={`mt-4 rounded-xl border px-3 py-3 ${colorClass}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-black">{title}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{text}</p>
          {completedLabel && (
            <p className="mt-1 text-[11px] font-bold text-muted-foreground">
              Ultimo preparo: {completedLabel}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PhaseStepperItem({
  index,
  label,
  active,
}: {
  index: string;
  label: string;
  active: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 ${active ? "text-primary" : "text-muted-foreground"}`}
    >
      <span
        className={`grid h-7 w-7 place-items-center rounded-full text-sm font-black ${
          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {index}
      </span>
      <span className="text-[12px] font-bold">{label}</span>
    </span>
  );
}

function RestartRecommendationNotice({
  recommendation,
  prepareRebootStatus,
}: {
  recommendation: RestartRecommendation;
  prepareRebootStatus: PrepareRebootStatus;
}) {
  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(recommendation.createdAt));
  const phaseLabel = recommendation.phase === "prepare" ? "Fase 1 concluida" : "Fase 2 concluida";
  const rebootConfirmed = recommendation.phase === "prepare" && prepareRebootStatus === "confirmed";
  const Icon = rebootConfirmed ? CheckCircle2 : Power;
  const title = rebootConfirmed ? "Reinicio detectado" : "Reinicio recomendado";
  const message = rebootConfirmed
    ? "O Windows reiniciou depois da Fase 1. A Otimiza??o Avan?ada esta no estado ideal."
    : recommendation.message;
  const panelClass = rebootConfirmed
    ? "border-success/25 bg-success/10"
    : "border-primary/25 bg-primary/10";
  const iconClass = rebootConfirmed
    ? "bg-success text-success-foreground"
    : "bg-primary text-primary-foreground";
  const pillClass = rebootConfirmed ? "text-success" : "text-primary";

  return (
    <div className={`mb-4 rounded-2xl border px-4 py-3 ${panelClass}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${iconClass}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-black text-foreground">{title}</p>
              <span
                className={`rounded-full bg-background/70 px-2 py-1 text-[10px] font-bold ${pillClass}`}
              >
                {phaseLabel}
              </span>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{message}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-bold text-muted-foreground">
          {dateLabel}
        </span>
      </div>
    </div>
  );
}

function PhaseActionRow({
  index,
  label,
  ready,
  accent,
}: {
  index: string;
  label: string;
  ready: boolean;
  accent?: string;
}) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/70 px-3 py-1.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-soft text-[11px] font-black text-primary">
          {index}
        </span>
        <p className="truncate text-[13px] font-bold text-foreground">
          {label}
          {accent && <span className="text-success"> {accent}</span>}
        </p>
      </div>
      <span
        className={`h-3 w-3 shrink-0 rounded-full border ${
          ready ? "border-primary bg-primary/10" : "border-muted-foreground/40"
        }`}
      />
    </div>
  );
}

function DnsProviderPicker({
  selectedProviderId,
  onSelect,
}: {
  selectedProviderId: DnsProviderId;
  onSelect: (providerId: DnsProviderId) => void;
}) {
  return (
    <section className="mt-4 rounded-2xl border border-primary/20 bg-card/85 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-24px_rgba(15,23,42,0.22)]">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-primary">DNS DO JOGADOR</p>
          <h2 className="text-lg font-black text-foreground">Escolha seu provedor DNS</h2>
        </div>
        <p className="text-[12px] text-muted-foreground">
          O Preparar PC usa essa escolha na fase de rede.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {DNS_PROVIDERS.map((provider) => (
          <DnsProviderButton
            key={provider.id}
            provider={provider}
            active={selectedProviderId === provider.id}
            onClick={() => onSelect(provider.id)}
          />
        ))}
      </div>
    </section>
  );
}

function DnsProviderButton({
  provider,
  active,
  onClick,
}: {
  provider: DnsProvider;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-14 rounded-xl border px-3 py-2 text-left transition ${
        active
          ? "border-success bg-success/10 text-success shadow-[0_0_0_1px_rgba(34,197,94,0.18)]"
          : "border-border/70 bg-background/70 text-foreground hover:border-primary/35 hover:bg-primary/5"
      }`}
    >
      <span className="block text-sm font-black">{provider.label}</span>
      <span
        className={`mt-0.5 block text-[11px] ${active ? "text-success" : "text-muted-foreground"}`}
      >
        {provider.primary}
      </span>
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/75 px-3 py-2">
      <p className="text-[9px] font-bold tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-black text-foreground">{value}</p>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-2xl border border-border/60 bg-card/85 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-24px_rgba(15,23,42,0.22)]">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="mt-0.5 truncate text-sm font-black text-foreground">{value}</p>
        </div>
      </div>
    </article>
  );
}

function TrustCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-border/60 bg-card/85 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-24px_rgba(15,23,42,0.22)]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{text}</p>
        </div>
      </div>
    </article>
  );
}

function compactValue(value: string) {
  if (!value || /indispon/i.test(value)) {
    return "Indispon?vel";
  }

  return value.length > 34 ? `${value.slice(0, 34).trim()}...` : value;
}
