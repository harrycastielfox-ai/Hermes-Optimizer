import { refreshAdvisorAiReport, type AdvisorAiReport } from "@/lib/advisor-ai";
import {
  applyCleanEngine,
  refreshCleanScanReport,
  type CleanApplyResult,
  type CleanScanReport,
} from "@/lib/clean";
import { refreshDiagnosticReport, type DiagnosticReport } from "@/lib/diagnostic";
import {
  applyGamerEngine,
  loadGamerReport,
  type GamerApplyResult,
  type GamerGameProfile,
  type GamerProcess,
  type GamerReport,
} from "@/lib/gamer";
import { runOptimizeNowPlan, type OptimizeNowPlan } from "@/lib/optimizer";
import {
  applyPerformanceControlled,
  refreshPerformanceReport,
  type PerformanceApplyResult,
  type PerformanceReport,
} from "@/lib/performance";
import { applyHermesProfile, loadProfilesCatalog, type ProfileApplyResult } from "@/lib/profiles";
import { HERMES_SAFE_TEST_MODE } from "@/lib/safe-mode";
import {
  applyStartupEngine,
  refreshStartupReport,
  type StartupApplyResult,
  type StartupReport,
} from "@/lib/startup";
import {
  applyAdvancedActions,
  refreshAdvancedCatalog,
  type AdvancedApplyResult,
  type AdvancedCatalog,
} from "@/lib/advanced";

export type OptimizeAllPhaseId =
  | "plan"
  | "safety"
  | "components"
  | "cleanup"
  | "startup"
  | "performance"
  | "gamer"
  | "profile"
  | "manual";

export type OptimizeAllReports = {
  diagnostic?: DiagnosticReport;
  clean?: CleanScanReport;
  cleanResult?: CleanApplyResult;
  startup?: StartupReport;
  startupResult?: StartupApplyResult;
  performance?: PerformanceReport;
  performanceResult?: PerformanceApplyResult;
  gamer?: GamerReport;
  gamerResult?: GamerApplyResult;
  advisor?: AdvisorAiReport;
  plan?: OptimizeNowPlan;
  profileResult?: ProfileApplyResult;
  advanced?: AdvancedCatalog;
  advancedResult?: AdvancedApplyResult;
};

export type OptimizeAllGameTarget = {
  id: string;
  label: string;
  detail: string;
  source: "active" | "detected" | "profile" | "preset";
  confidence: "high" | "medium" | "low";
  pid?: number;
  executable?: string;
  profileId?: string;
  engineHint?: string;
};

export type OptimizeAllGameSelection = {
  target?: OptimizeAllGameTarget;
  skip?: boolean;
};

export type OptimizeAllPhaseContext = {
  reports: OptimizeAllReports;
  recommendedProfileId: string;
  gameSelection?: OptimizeAllGameSelection;
};

export type OptimizeAllPhaseResult = {
  outputs: string[];
  reports?: Partial<OptimizeAllReports>;
  recommendedProfileId?: string;
  gameTargets?: OptimizeAllGameTarget[];
  requiresGameSelection?: boolean;
};

export const HERMES_PREPARE_ADVANCED_ACTION_IDS = [
  "enable-game-mode",
  "disable-game-dvr",
  "disable-xbox-game-bar-deep",
  "set-visual-effects-gamer-minimal",
  "disable-hibernation",
  "disable-startup-delay",
  "disable-advertising-id",
  "disable-tailored-experiences",
  "disable-consumer-features",
  "disable-activity-history",
  "disable-location-tracking",
  "disable-recall-user",
  "flush-dns-cache",
  "dism-analyze-component-store",
  "dism-start-component-cleanup",
  "dism-check-netfx3",
  "dism-check-directplay",
  "check-gamer-dependencies",
  "set-diagtrack-service-manual",
  "set-mapsbroker-service-manual",
] as const;

const HERMES_COMPONENT_CMD_ACTION_IDS = [
  "dism-analyze-component-store",
  "dism-start-component-cleanup",
  "dism-check-netfx3",
  "dism-check-directplay",
  "dism-enable-directplay",
] as const;

const HERMES_OPTIMIZE_ADVANCED_ACTION_IDS = [
  ...HERMES_PREPARE_ADVANCED_ACTION_IDS,
  "dism-enable-directplay",
  "winsock-reset",
  "reset-ip-stack",
  "set-high-performance-power-plan",
  "set-mmcss-gamer-pack",
  "set-fate-trigger-cpu-priority-high",
  "disable-storage-sense-auto-cleanup",
] as const;

export async function runOptimizeAllPhase(
  phaseId: OptimizeAllPhaseId,
  context: OptimizeAllPhaseContext,
): Promise<OptimizeAllPhaseResult> {
  if (phaseId === "plan") {
    return runPlanPhase();
  }

  if (phaseId === "safety") {
    return {
      outputs: [
        HERMES_SAFE_TEST_MODE ? "Modo atual: teste bloqueado" : "Modo atual: real liberado",
        "Engines reais conectadas por fase",
        "Sem telemetria, nuvem ou processo residente",
      ],
    };
  }

  if (phaseId === "components") {
    return runComponentsPhase();
  }

  if (phaseId === "cleanup") {
    return runCleanupPhase();
  }

  if (phaseId === "startup") {
    return runStartupPhase();
  }

  if (phaseId === "performance") {
    return runPerformancePhase(context.recommendedProfileId);
  }

  if (phaseId === "gamer") {
    return runGamerPhase(context);
  }

  if (phaseId === "profile") {
    return runProfilePhase(context);
  }

  return runAdvancedPhase();
}

async function runPlanPhase(): Promise<OptimizeAllPhaseResult> {
  const [plan, advisor, diagnostic] = await Promise.all([
    runOptimizeNowPlan(),
    refreshAdvisorAiReport(),
    refreshDiagnosticReport(),
  ]);

  return {
    reports: { plan, advisor, diagnostic },
    outputs: [
      `${plan.summary.totalStages} etapa(s) do orquestrador local`,
      `${advisor.recommendations.length} recomendacao(oes) da Hermes IA`,
      `Saude atual: ${Math.round(diagnostic.healthScore)}/100`,
    ],
  };
}

async function runCleanupPhase(): Promise<OptimizeAllPhaseResult> {
  const clean = await refreshCleanScanReport();
  const selectedIds = clean.items
    .filter((item) => item.selectedByDefault && item.safeToCleanLater)
    .map((item) => item.id);

  const result = await tryRun(() =>
    selectedIds.length
      ? applyCleanEngine({
          confirmed: shouldConfirmReal(),
          dryRun: shouldDryRun(),
          itemIds: selectedIds,
        })
      : Promise.resolve(null),
  );

  return {
    reports: {
      clean,
      cleanResult: result.value ?? undefined,
    },
    outputs: [
      `${formatGb(clean.totalGb)} GB candidatos a revisao`,
      `${clean.items.length} area(s) mapeada(s)`,
      result.value
        ? `${result.value.plannedEntries} item(ns) validados pela Clean Engine`
        : (result.message ?? "Sem item seguro selecionado para validacao"),
    ],
  };
}

async function runStartupPhase(): Promise<OptimizeAllPhaseResult> {
  const startup = await refreshStartupReport();
  const itemIds = startup.items
    .filter(
      (item) =>
        item.status === "active" &&
        item.impact === "high" &&
        item.controllable &&
        item.canDisableLater,
    )
    .map((item) => item.id);

  const result = await tryRun(() =>
    itemIds.length
      ? applyStartupEngine({
          confirmed: shouldConfirmReal(),
          dryRun: shouldDryRun(),
          action: "disable",
          itemIds,
        })
      : Promise.resolve(null),
  );

  return {
    reports: {
      startup,
      startupResult: result.value ?? undefined,
    },
    outputs: [
      `${startup.totalItems} item(ns) de inicializacao`,
      `${startup.highImpactCount} alto impacto`,
      result.value
        ? `${result.value.selectedItems} item(ns) validados pela Startup Engine`
        : (result.message ?? "Sem item de alto impacto controlavel agora"),
    ],
  };
}

async function runComponentsPhase(): Promise<OptimizeAllPhaseResult> {
  const advanced = await refreshAdvancedCatalog();
  const availableIds = new Set(advanced.actions.map((action) => action.id));
  const actionIds = HERMES_COMPONENT_CMD_ACTION_IDS.filter((id) => availableIds.has(id));
  const result = await tryRun(() =>
    actionIds.length
      ? applyAdvancedActions({
          confirmed: shouldConfirmReal(),
          dryRun: shouldDryRun(),
          actionIds,
          extremeMode: false,
        })
      : Promise.resolve(null),
  );

  return {
    reports: {
      advanced,
      advancedResult: result.value ?? undefined,
    },
    outputs: [
      `${actionIds.length} comando(s) CMD/DISM mapeados`,
      "Windows Update Component Cleanup, NetFx3 e DirectPlay entram no plano",
      result.value
        ? `${result.value.appliedActions.length} comando(s) ${result.value.dryRun ? "validados" : "aplicados"}`
        : (result.message ?? "Componentes ainda nao disponiveis neste PC"),
    ],
  };
}

async function runPerformancePhase(profileId: string): Promise<OptimizeAllPhaseResult> {
  const performance = await refreshPerformanceReport();
  const actionIds = pickPerformanceActionIds(performance, profileId);
  const result = await tryRun(() =>
    actionIds.length
      ? applyPerformanceControlled({
          confirmed: shouldConfirmReal(),
          dryRun: shouldDryRun(),
          actionIds,
          reason: "Otimizar Tudo",
        })
      : Promise.resolve(null),
  );

  return {
    reports: {
      performance,
      performanceResult: result.value ?? undefined,
    },
    outputs: [
      `Plano atual: ${performance.powerPlan.activeSchemeName}`,
      `Modo Jogo: ${performance.gameMode.status}`,
      result.value
        ? `${result.value.appliedActions.length} ajuste(s) validados pela Performance Engine`
        : (result.message ?? "Sem ajuste controlado disponivel agora"),
    ],
  };
}

async function runGamerPhase(context: OptimizeAllPhaseContext): Promise<OptimizeAllPhaseResult> {
  const gamer = await loadGamerReport();
  const gameTargets = buildGameTargets(gamer);

  if (!context.gameSelection && gameTargets.length > 0) {
    return {
      reports: { gamer },
      gameTargets,
      requiresGameSelection: true,
      outputs: [
        `${gameTargets.length} alvo(s) de jogo encontrados`,
        "Escolha o jogo para o Hermes montar o plano focado",
        "Fate Trigger via Steam/UE5 fica como prioridade Hermes",
      ],
    };
  }

  if (context.gameSelection?.skip) {
    return {
      reports: { gamer },
      gameTargets,
      outputs: [
        `${gamer.summary.detectedGames} jogo(s) detectado(s)`,
        "Selecao de jogo ignorada pelo usuario",
        "Plano Gamer nao foi aplicado nesta execucao",
      ],
    };
  }

  const target = context.gameSelection?.target ?? gameTargets[0];
  const processIds = gamer.suggestedProcesses
    .filter((process) => process.canClose && process.recommendation === "suggestedClose")
    .map((process) => process.pid);
  const shouldValidate = processIds.length > 0 || gamer.activeGame.detected || Boolean(target);
  const result = await tryRun(() =>
    shouldValidate
      ? applyGamerEngine({
          confirmed: shouldConfirmReal(),
          dryRun: shouldDryRun(),
          processIds,
          includePerformanceProfile: true,
          gameProfileId: target?.profileId,
        })
      : Promise.resolve(null),
  );

  return {
    reports: {
      gamer,
      gamerResult: result.value ?? undefined,
    },
    gameTargets,
    outputs: [
      target ? `Jogo alvo: ${target.label}` : "Jogo alvo nao selecionado",
      `${gamer.summary.detectedGames} jogo(s) detectado(s)`,
      `${gamer.summary.protectedCount} processo(s) protegido(s), incluindo Steam/Discord quando detectados`,
      result.value
        ? `${result.value.closedProcesses.length} processo(s) validados pela Gamer Engine`
        : (result.message ?? "Selecao manual de jogo sera necessaria"),
    ],
  };
}

async function runProfilePhase(context: OptimizeAllPhaseContext): Promise<OptimizeAllPhaseResult> {
  const catalog = await loadProfilesCatalog();
  const profileId = pickProfile(
    context.reports,
    catalog.profiles.map((item) => item.id),
  );
  const result = await tryRun(() =>
    applyHermesProfile({
      profileId,
      confirmed: shouldConfirmReal(),
      dryRun: shouldDryRun(),
      extremeConfirmed: !HERMES_SAFE_TEST_MODE && profileId === "extremo",
    }),
  );

  return {
    recommendedProfileId: profileId,
    reports: {
      profileResult: result.value ?? undefined,
    },
    outputs: [
      `Perfil sugerido: ${profileLabel(profileId)}`,
      result.value
        ? `${result.value.engineResults.length} engine(s) validadas pelo perfil`
        : (result.message ?? "Perfil disponivel para revisao manual"),
      HERMES_SAFE_TEST_MODE ? "Nenhuma alteracao real aplicada" : "Perfil aplicado no modo real",
    ],
  };
}

async function runAdvancedPhase(): Promise<OptimizeAllPhaseResult> {
  const advanced = await refreshAdvancedCatalog();
  const availableIds = new Set(
    advanced.actions
      .filter((action) => !action.requiresExtreme && action.risk !== "high")
      .map((action) => action.id),
  );
  const actionIds = HERMES_OPTIMIZE_ADVANCED_ACTION_IDS.filter((id) => availableIds.has(id));
  const result = await tryRun(() =>
    actionIds.length
      ? applyAdvancedActions({
          confirmed: shouldConfirmReal(),
          dryRun: shouldDryRun(),
          actionIds,
          extremeMode: false,
        })
      : Promise.resolve(null),
  );

  return {
    reports: {
      advanced,
      advancedResult: result.value ?? undefined,
    },
    outputs: [
      `${advanced.actions.length} acao(oes) avancadas mapeadas`,
      `${advanced.blockedActions.length} acao(oes) bloqueadas por criterio`,
      result.value
        ? `${result.value.appliedActions.length} comando(s) validados pela Advanced Engine`
        : (result.message ?? "Sem comando avancado liberado para validacao"),
    ],
  };
}

function shouldDryRun() {
  return HERMES_SAFE_TEST_MODE;
}

function shouldConfirmReal() {
  return !HERMES_SAFE_TEST_MODE;
}

function pickProfile(reports: OptimizeAllReports, availableProfiles: string[]) {
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

function pickPerformanceActionIds(report: PerformanceReport, profileId: string): string[] {
  const ids = report.settings
    .filter((item) => item.canOptimizeLater)
    .map((item) => performanceSettingToActionId(item.id, profileId))
    .filter((item): item is string => Boolean(item));

  if (ids.length > 0) {
    return [...new Set(ids)].slice(0, 5);
  }

  if (profileId === "economia") {
    return ["set-power-saver-power-plan"];
  }

  if (profileId === "seguro" || profileId === "trabalho") {
    return ["set-balanced-power-plan"];
  }

  return ["set-high-performance-power-plan"];
}

function performanceSettingToActionId(settingId: string, profileId: string): string | undefined {
  if (settingId === "power-plan") {
    if (profileId === "economia") return "set-power-saver-power-plan";
    if (profileId === "seguro" || profileId === "trabalho") return "set-balanced-power-plan";
    return "set-high-performance-power-plan";
  }
  if (settingId === "transparency") return "disable-transparency";
  if (settingId === "animations") return "disable-window-animations";
  if (settingId === "shadows") return "disable-visual-shadows";
  return undefined;
}

function buildGameTargets(report: GamerReport): OptimizeAllGameTarget[] {
  const targets: OptimizeAllGameTarget[] = [];

  if (report.activeGame.detected) {
    targets.push({
      id: `active-${report.activeGame.pid ?? report.activeGame.processName ?? "game"}`,
      label: report.activeGame.displayName ?? report.activeGame.processName ?? "Jogo ativo",
      detail: report.activeGame.windowTitle ?? report.activeGame.message,
      source: "active",
      confidence: report.activeGame.confidence === "high" ? "high" : "medium",
      pid: report.activeGame.pid,
      executable: report.activeGame.executablePath,
      profileId: report.activeGame.matchedProfile?.id,
      engineHint: engineHintFromText(
        `${report.activeGame.processName ?? ""} ${report.activeGame.executablePath ?? ""}`,
      ),
    });
  }

  for (const process of report.detectedGames) {
    targets.push(gameTargetFromProcess(process));
  }

  for (const profile of report.gameProfiles) {
    targets.push(gameTargetFromProfile(profile));
  }

  targets.push({
    id: "preset-fate-trigger-ue5",
    label: "Fate Trigger",
    detail: "Prioridade Hermes: Fate Trigger via Steam em Unreal Engine 5.",
    source: "preset",
    confidence: "high",
    executable: "FateTrigger-Win64-Shipping.exe",
    engineHint: "Unreal Engine 5",
  });

  return dedupeGameTargets(targets).sort((a, b) => gameTargetRank(a) - gameTargetRank(b));
}

function gameTargetFromProcess(process: GamerProcess): OptimizeAllGameTarget {
  return {
    id: `process-${process.pid}`,
    label: process.displayName,
    detail: `${process.memoryMb} MB em uso${process.executablePath ? ` - ${process.executablePath}` : ""}`,
    source: "detected",
    confidence: "high",
    pid: process.pid,
    executable: process.executablePath,
    engineHint: engineHintFromText(`${process.name} ${process.executablePath ?? ""}`),
  };
}

function gameTargetFromProfile(profile: GamerGameProfile): OptimizeAllGameTarget {
  return {
    id: `profile-${profile.id}`,
    label: profile.gameName,
    detail: profile.executable,
    source: "profile",
    confidence: "high",
    executable: profile.executable,
    profileId: profile.id,
    engineHint: engineHintFromText(`${profile.gameName} ${profile.executable}`),
  };
}

function dedupeGameTargets(targets: OptimizeAllGameTarget[]) {
  const seen = new Set<string>();
  const result: OptimizeAllGameTarget[] = [];

  for (const target of targets) {
    const key = normalizeGameKey(`${target.label} ${target.executable ?? ""}`);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(target);
  }

  return result;
}

function gameTargetRank(target: OptimizeAllGameTarget) {
  const text = normalizeGameKey(
    `${target.label} ${target.detail ?? ""} ${target.executable ?? ""}`,
  );
  if (
    text.includes("fatetrigger") ||
    text.includes("fatetriggerwin64shipping") ||
    (text.includes("fate") && text.includes("trigger"))
  ) {
    return 0;
  }
  if (target.source === "active") return 1;
  if (target.source === "detected") return 2;
  if (target.source === "profile") return 3;
  return 4;
}

function engineHintFromText(value: string) {
  const normalized = value.toLowerCase();
  if (
    normalized.includes("ue5") ||
    normalized.includes("unreal") ||
    normalized.includes("win64-shipping")
  ) {
    return "Unreal Engine 5";
  }
  return undefined;
}

function normalizeGameKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

async function tryRun<T>(task: () => Promise<T | null>): Promise<{ value?: T; message?: string }> {
  try {
    const value = await task();
    return value ? { value } : {};
  } catch (error) {
    return { message: errorMessage(error) };
  }
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
