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
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { refreshAdvisorAiReport, type AdvisorAiReport } from "@/lib/advisor-ai";
import { refreshCleanScanReport, type CleanScanReport } from "@/lib/clean";
import { refreshDiagnosticReport, type DiagnosticReport } from "@/lib/diagnostic";
import { loadGamerReport, type GamerReport } from "@/lib/gamer";
import { runOptimizeNowPlan, type OptimizeNowPlan } from "@/lib/optimizer";
import { refreshPerformanceReport, type PerformanceReport } from "@/lib/performance";
import { applyHermesProfile, loadProfilesCatalog, type ProfileApplyResult } from "@/lib/profiles";
import { HERMES_SAFE_TEST_MODE } from "@/lib/safe-mode";
import { refreshStartupReport, type StartupReport } from "@/lib/startup";

type RunStatus = "idle" | "running" | "completed" | "failed" | "cancelled";
type PhaseStatus = "pending" | "running" | "completed" | "unavailable" | "failed" | "cancelled";
type PhaseId =
  | "plan"
  | "safety"
  | "components"
  | "cleanup"
  | "startup"
  | "performance"
  | "gamer"
  | "profile"
  | "manual";

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

type Reports = {
  diagnostic?: DiagnosticReport;
  clean?: CleanScanReport;
  startup?: StartupReport;
  performance?: PerformanceReport;
  gamer?: GamerReport;
  advisor?: AdvisorAiReport;
  plan?: OptimizeNowPlan;
  profileResult?: ProfileApplyResult;
};

const phaseTemplates: OptimizePhase[] = [
  phase("plan", "Plano inteligente", "Orquestrador + Hermes IA", BrainCircuit, 14),
  phase("safety", "Seguranca e rollback", "Snapshot, logs e travas", ShieldCheck, 10),
  phase("components", "Componentes essenciais", "VC++, DirectX e dependencias", Wrench, 18),
  phase("cleanup", "Limpeza segura", "Temporarios, cache e logs", BrushCleaning, 26),
  phase("startup", "Inicializacao", "Apps de alto impacto", Zap, 18),
  phase("performance", "Performance", "Energia, Game Mode e rede", Gauge, 22),
  phase("gamer", "Sessao Gamer", "Jogo alvo, Discord e overlays", Gamepad2, 18),
  phase("profile", "Perfil recomendado", "Seguro, Trabalho, Gamer ou Extremo", Cpu, 16),
  phase("manual", "Ferramentas manuais", "Central, Reparo e Personalizado", SlidersHorizontal, 8),
];

const TOTAL_PLANNED_ACTIONS = phaseTemplates.reduce(
  (total, item) => total + item.plannedActions,
  0,
);

export function SmartOptimizeModal({
  open,
  runKey,
  onClose,
}: {
  open: boolean;
  runKey: number;
  onClose: () => void;
}) {
  const [phases, setPhases] = useState<OptimizePhase[]>(() => resetPhases());
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [reports, setReports] = useState<Reports>({});
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [currentStatus, setCurrentStatus] = useState("Aguardando otimizacao.");
  const [recommendedProfileId, setRecommendedProfileId] = useState("seguro");
  const cancelRequested = useRef(false);
  const activeRun = useRef(0);

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
  const completedActionCount = phases
    .filter((item) => item.status === "completed" || item.status === "unavailable")
    .reduce((total, item) => total + item.plannedActions, 0);
  const activePhase = phases.find((item) => item.status === "running");
  const canCancel = runStatus === "running" && !cancelRequested.current;
  const canClose = runStatus !== "running" || cancelRequested.current;

  async function runSmartOptimization(runId: number) {
    const nextReports: Reports = {};

    try {
      await executePhase(runId, "plan", async () => {
        const [plan, advisor, diagnostic] = await Promise.all([
          runOptimizeNowPlan(),
          refreshAdvisorAiReport(),
          refreshDiagnosticReport(),
        ]);

        nextReports.plan = plan;
        nextReports.advisor = advisor;
        nextReports.diagnostic = diagnostic;
        setReports({ ...nextReports });

        return [
          `${plan.summary.totalStages} etapa(s) do orquestrador local`,
          `${advisor.recommendations.length} recomendacao(oes) da Hermes IA`,
          `Saude atual: ${Math.round(diagnostic.healthScore)}/100`,
        ];
      });

      if (shouldStop(runId)) return;

      await executePhase(runId, "safety", async () => [
        HERMES_SAFE_TEST_MODE
          ? "Modo atual: DRY-RUN bloqueado"
          : "Modo atual: real com confirmacao",
        "Snapshot e rollback obrigatorios antes de alteracoes reais",
        "Sem telemetria, nuvem ou processo residente",
      ]);

      if (shouldStop(runId)) return;

      await executePhase(runId, "components", async () => [
        "VC++ 2005/2010/2015+ entram como verificacao guiada",
        "Dependencias so instalam quando ausentes ou corrompidas",
        "Nada baixa ou instala no modo seguro atual",
      ]);

      if (shouldStop(runId)) return;

      await executePhase(runId, "cleanup", async () => {
        const clean = await refreshCleanScanReport();
        nextReports.clean = clean;
        setReports({ ...nextReports });

        return [
          `${formatGb(clean.totalGb)} GB candidatos a revisao`,
          `${clean.items.length} area(s) mapeada(s)`,
          "Downloads, Desktop e documentos protegidos",
        ];
      });

      if (shouldStop(runId)) return;

      await executePhase(runId, "startup", async () => {
        const startup = await refreshStartupReport();
        nextReports.startup = startup;
        setReports({ ...nextReports });

        return [
          `${startup.totalItems} item(ns) de inicializacao`,
          `${startup.highImpactCount} alto impacto`,
          "Desativacao real exige confirmacao e reversao",
        ];
      });

      if (shouldStop(runId)) return;

      await executePhase(runId, "performance", async () => {
        const performance = await refreshPerformanceReport();
        nextReports.performance = performance;
        setReports({ ...nextReports });

        return [
          `Plano atual: ${performance.powerPlan.activeSchemeName}`,
          `Modo Jogo: ${performance.gameMode.status}`,
          "Rede/Winsock ficam em ferramentas guiadas",
        ];
      });

      if (shouldStop(runId)) return;

      await executePhase(runId, "gamer", async () => {
        const gamer = await loadGamerReport();
        nextReports.gamer = gamer;
        setReports({ ...nextReports });

        return [
          `${gamer.summary.detectedGames} jogo(s) detectado(s)`,
          `${gamer.summary.protectedCount} processo(s) protegido(s)`,
          "Discord, launcher e processos criticos ficam protegidos",
        ];
      });

      if (shouldStop(runId)) return;

      await executePhase(runId, "profile", async () => {
        const catalog = await loadProfilesCatalog();
        const profileId = pickProfile(
          nextReports,
          catalog.profiles.map((item) => item.id),
        );
        setRecommendedProfileId(profileId);

        const profileResult = await tryApplyProfileDryRun(profileId);
        if (profileResult) {
          nextReports.profileResult = profileResult;
          setReports({ ...nextReports });
        }

        return [
          `Perfil sugerido: ${profileLabel(profileId)}`,
          profileResult
            ? `${profileResult.engineResults.length} engine(s) validadas`
            : "Aplicacao simulada indisponivel fora do backend Tauri",
          HERMES_SAFE_TEST_MODE
            ? "Nenhuma alteracao real aplicada"
            : "Pronto para confirmacao real",
        ];
      });

      if (shouldStop(runId)) return;

      await executePhase(runId, "manual", async () => [
        "Central de Otimizacao pronta para ajustes finos",
        "Limpeza, Inicializacao, Gamer e Reparo seguem acessiveis",
        "Usuario avancado ainda controla cada ferramenta manual",
      ]);

      if (activeRun.current !== runId) {
        return;
      }

      setRunStatus("completed");
      setCurrentStatus("Plano unico concluido. Nenhuma alteracao real foi aplicada.");
      appendLog("info", "Resolver Agora finalizado com seguranca.");
    } catch (error) {
      if (activeRun.current !== runId) {
        return;
      }

      setRunStatus("failed");
      setCurrentStatus("Otimizacao interrompida antes de qualquer alteracao real.");
      appendLog("error", errorMessage(error));
    }
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
    updatePhase(phaseId, { status: "running", outputs: ["Executando validacao local."] });
    appendLog("info", `Iniciando: ${template?.title ?? phaseId}.`);

    try {
      const outputs = await task();
      if (activeRun.current !== runId) {
        return;
      }

      updatePhase(phaseId, { status: "completed", outputs });
      appendLog("info", `${template?.title ?? phaseId}: concluido.`);
    } catch (error) {
      const message = errorMessage(error);
      updatePhase(phaseId, {
        status: "unavailable",
        outputs: [message, "Fase isolada sem efeitos."],
      });
      appendLog("warning", `${template?.title ?? phaseId}: ${message}`);
    }
  }

  function requestCancel() {
    cancelRequested.current = true;
    setRunStatus("cancelled");
    setCurrentStatus("Cancelamento solicitado. O Hermes nao iniciara novas fases.");
    setPhases((current) =>
      current.map((item) =>
        item.status === "pending"
          ? { ...item, status: "cancelled", outputs: ["Cancelado pelo usuario."] }
          : item,
      ),
    );
    appendLog("warning", "Usuario cancelou o fluxo Resolver Agora.");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 px-3 py-4 backdrop-blur-sm">
      <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white/94 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.55)] backdrop-blur-xl">
        <header className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_16px_34px_-22px_rgba(37,99,235,0.9)]">
              <Sparkles className="h-8 w-8" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-[0.22em] text-primary">MODO SIMPLES</p>
              <h2 className="mt-1 text-2xl font-black leading-tight text-foreground">
                Resolver Agora
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
            aria-label="Fechar Resolver Agora"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-white/80 text-muted-foreground transition hover:bg-muted disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="overflow-auto px-5 py-5 lg:px-6">
          <section className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-4">
            <SummaryCard
              icon={Zap}
              label="Acoes avaliadas"
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
              label="Perfil"
              value={profileLabel(recommendedProfileId)}
              sub={reports.advisor?.summary.recommendedProfileReason ?? "Auto"}
            />
            <SummaryCard
              icon={ShieldCheck}
              label="Modo"
              value={HERMES_SAFE_TEST_MODE ? "Dry-run" : "Real"}
              sub="Snapshot antes de mudar"
            />
          </section>

          <div className="mb-4 rounded-2xl border border-warning/25 bg-warning/10 px-4 py-3 text-warning">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="text-sm font-bold">
                  O Hermes avalia 150 acoes, mas nao aplica mudancas cegas.
                </p>
                <p className="mt-1 text-[12px] leading-relaxed">
                  No modo atual, tudo roda como validacao segura. Quando o modo real for liberado,
                  este mesmo botao deve pedir confirmacao final e criar rollback antes de qualquer
                  alteracao.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-3">
              <div className="rounded-2xl border border-border/70 bg-white/72 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{currentStatus}</h3>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      Inspirado em setup por fases, com Central e ferramentas manuais por baixo.
                    </p>
                  </div>
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[12px] font-bold text-primary">
                    {progress}%
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
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
              <div className="rounded-2xl border border-border/70 bg-white/72 p-4">
                <h3 className="text-[11px] font-bold tracking-[0.18em] text-primary">
                  CAMINHOS MANUAIS
                </h3>
                <div className="mt-3 space-y-2">
                  <ManualLink icon={Gauge} title="Central completa" to="/central" />
                  <ManualLink
                    icon={Gamepad2}
                    title="Perfil Gamer"
                    to="/perfis"
                    search={{ perfil: "gamer" }}
                  />
                  <ManualLink icon={BrushCleaning} title="Limpeza" to="/limpeza" />
                  <ManualLink icon={Wrench} title="Reparar Windows" to="/reparar-windows" />
                  <ManualLink icon={RotateCcw} title="Rollback" to="/reparar-windows" />
                  <ManualLink icon={SlidersHorizontal} title="Personalizado" to="/personalizado" />
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-white/72 p-4">
                <h3 className="text-[11px] font-bold tracking-[0.18em] text-primary">LOG</h3>
                <div className="mt-3 space-y-2">
                  {logs.length > 0 ? (
                    logs.map((item) => <LogRow key={item.id} item={item} />)
                  ) : (
                    <p className="rounded-xl border border-dashed border-border bg-white/60 px-3 py-4 text-sm text-muted-foreground">
                      Aguardando primeira fase.
                    </p>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>

        <footer className="flex flex-col gap-3 border-t border-border/70 bg-white/78 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success" />
            {HERMES_SAFE_TEST_MODE
              ? "Modo de teste: nenhuma alteracao real sera aplicada."
              : "Modo real: confirmar antes de aplicar e salvar rollback."}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {canCancel && (
              <button
                type="button"
                onClick={requestCancel}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-muted"
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
              {runStatus === "running" ? "Executando" : "Concluir"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

async function tryApplyProfileDryRun(profileId: string) {
  try {
    return await applyHermesProfile({
      profileId,
      confirmed: false,
      dryRun: true,
      extremeConfirmed: false,
    });
  } catch (error) {
    console.warn("Perfil recomendado indisponivel para dry-run.", error);
    return null;
  }
}

function pickProfile(reports: Reports, availableProfiles: string[]) {
  const raw = reports.advisor?.summary.recommendedProfile?.toLowerCase() ?? "";
  const candidates = [
    ["extremo", "extremo"],
    ["gamer", "gamer"],
    ["jogo", "gamer"],
    ["economia", "economia"],
    ["trabalho", "trabalho"],
    ["seguro", "seguro"],
  ] as const;

  for (const [needle, profileId] of candidates) {
    if (raw.includes(needle) && availableProfiles.includes(profileId)) {
      return profileId;
    }
  }

  if ((reports.gamer?.summary.detectedGames ?? 0) > 0 && availableProfiles.includes("gamer")) {
    return "gamer";
  }

  if (
    ((reports.startup?.highImpactCount ?? 0) > 0 || (reports.clean?.totalGb ?? 0) > 1) &&
    availableProfiles.includes("trabalho")
  ) {
    return "trabalho";
  }

  return availableProfiles.includes("seguro") ? "seguro" : (availableProfiles[0] ?? "seguro");
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
    <div className="rounded-2xl border border-border/70 bg-white/72 px-4 py-3">
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

function PhaseCard({ phase }: { phase: OptimizePhase }) {
  const Icon =
    phase.status === "running" ? Loader2 : phase.status === "completed" ? CheckCircle2 : phase.icon;

  return (
    <article className="rounded-2xl border border-border/70 bg-white/72 p-4">
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
              {phase.plannedActions} acoes
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              Reversivel quando aplicavel
            </span>
          </div>
          {phase.outputs.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {phase.outputs.slice(0, 3).map((output) => (
                <p
                  key={output}
                  className="rounded-lg border border-border/60 bg-slate-50/80 px-2.5 py-1.5 text-[11px] font-medium text-foreground"
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

function ManualLink({
  icon: Icon,
  title,
  to,
  search,
}: {
  icon: LucideIcon;
  title: string;
  to: "/central" | "/perfis" | "/limpeza" | "/reparar-windows" | "/personalizado";
  search?: { perfil: string };
}) {
  return (
    <Link
      to={to}
      search={search}
      className="flex min-h-11 items-center gap-3 rounded-xl border border-border/70 bg-white/70 px-3 py-2 text-sm font-bold text-foreground transition hover:border-primary/35 hover:bg-primary/5"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate">{title}</span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
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
    <div className="rounded-xl border border-border/60 bg-white/70 px-3 py-2">
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

function profileLabel(profileId: string) {
  if (profileId === "gamer") return "Gamer";
  if (profileId === "trabalho") return "Trabalho";
  if (profileId === "economia") return "Economia";
  if (profileId === "extremo") return "Extremo";
  return "Seguro";
}

function formatGb(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
