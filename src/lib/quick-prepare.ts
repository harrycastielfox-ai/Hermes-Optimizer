import {
  applyAdvancedActions,
  refreshAdvancedCatalog,
  type AdvancedApplyResult,
  type AdvancedCatalog,
} from "@/lib/advanced";
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
  type GamerReport,
} from "@/lib/gamer";
import { HERMES_SAFE_TEST_MODE } from "@/lib/safe-mode";
import {
  applyStartupEngine,
  refreshStartupReport,
  type StartupApplyResult,
  type StartupReport,
} from "@/lib/startup";
import {
  applyPerformanceControlled,
  refreshPerformanceReport,
  type PerformanceApplyResult,
  type PerformanceReport,
} from "@/lib/performance";
import { readSystemSecurityContext, type SystemSecurityContext } from "@/lib/system";
import { HERMES_PREPARE_ADVANCED_ACTION_IDS } from "@/lib/optimize-all";

export type QuickPreparePhaseId = "scan" | "cleanup" | "startup" | "windows" | "processes";
export type DnsProviderId = "cloudflare" | "google" | "opendns" | "quad9" | "adguard";

export type DnsProvider = {
  id: DnsProviderId;
  label: string;
  primary: string;
  secondary: string;
  actionId: string;
};

export const DNS_PROVIDERS: DnsProvider[] = [
  {
    id: "cloudflare",
    label: "Cloudflare",
    primary: "1.1.1.1",
    secondary: "1.0.0.1",
    actionId: "set-dns-cloudflare",
  },
  {
    id: "google",
    label: "Google",
    primary: "8.8.8.8",
    secondary: "8.8.4.4",
    actionId: "set-dns-google",
  },
  {
    id: "opendns",
    label: "OpenDNS",
    primary: "208.67.222.222",
    secondary: "208.67.220.220",
    actionId: "set-dns-opendns",
  },
  {
    id: "quad9",
    label: "Quad9",
    primary: "9.9.9.9",
    secondary: "149.112.112.112",
    actionId: "set-dns-quad9",
  },
  {
    id: "adguard",
    label: "AdGuard",
    primary: "94.140.14.14",
    secondary: "94.140.15.15",
    actionId: "set-dns-adguard",
  },
];

export type QuickPrepareReports = {
  diagnostic?: DiagnosticReport;
  clean?: CleanScanReport;
  cleanResult?: CleanApplyResult;
  startup?: StartupReport;
  startupResult?: StartupApplyResult;
  performance?: PerformanceReport;
  performanceResult?: PerformanceApplyResult;
  advanced?: AdvancedCatalog;
  advancedResult?: AdvancedApplyResult;
  gamer?: GamerReport;
  gamerResult?: GamerApplyResult;
  system?: SystemSecurityContext;
};

export type QuickPreparePhaseResult = {
  outputs: string[];
  reports?: Partial<QuickPrepareReports>;
};

export type QuickPrepareContext = {
  dnsProviderId: DnsProviderId;
  executionMode?: QuickPrepareExecutionMode;
};

export type QuickPrepareTaskStatus = "pending" | "running" | "completed" | "unavailable";
export type QuickPrepareExecutionMode = "dryRun" | "real";
export type QuickPrepareRealPolicy = "scanOnly" | "userSafe" | "adminOnly";

export type QuickPrepareTask = {
  id: string;
  phaseId: QuickPreparePhaseId;
  title: string;
  detail: string;
  realPolicy: QuickPrepareRealPolicy;
};

export type QuickPrepareTaskUpdate = {
  task: QuickPrepareTask;
  taskIndex: number;
  totalTasks: number;
  status: QuickPrepareTaskStatus;
  outputs: string[];
  reports?: Partial<QuickPrepareReports>;
};

export type QuickPrepareExecutorCallbacks = {
  shouldCancel?: () => boolean;
  onTaskStart?: (update: QuickPrepareTaskUpdate) => void;
  onTaskComplete?: (update: QuickPrepareTaskUpdate) => void;
};

type QuickPrepareRuntimeState = {
  reports: QuickPrepareReports;
  selectedCleanItemIds: string[];
  selectedStartupItemIds: string[];
  selectedProcessIds: number[];
  system?: SystemSecurityContext;
  advancedCatalog?: AdvancedCatalog;
};

const QUICK_PREPARE_PERFORMANCE_ACTION_IDS = [
  "set-high-performance-power-plan",
  "disable-transparency",
  "disable-window-animations",
  "disable-visual-shadows",
];

const QUICK_PREPARE_PERFORMANCE_LABELS: Record<string, string> = {
  "set-high-performance-power-plan": "Plano Alto desempenho",
  "disable-transparency": "Transparencias OFF",
  "disable-window-animations": "Animacoes OFF",
  "disable-visual-shadows": "Sombras visuais OFF",
};

const QUICK_PREPARE_ADVANCED_LABELS: Record<string, string> = {
  "enable-game-mode": "Game Mode ON",
  "disable-game-dvr": "GameDVR OFF",
  "disable-xbox-game-bar-deep": "Xbox Game Bar e captura OFF",
  "set-visual-effects-gamer-minimal": "Visual gamer minimo",
  "disable-hibernation": "Hibernacao OFF",
  "disable-startup-delay": "Inicializacao sem atraso",
  "disable-advertising-id": "ID de publicidade OFF",
  "disable-tailored-experiences": "Experiencias personalizadas OFF",
  "disable-consumer-features": "Apps e sugestoes promovidas OFF",
  "disable-activity-history": "Historico de atividades OFF",
  "disable-location-tracking": "Localizacao de apps bloqueada",
  "disable-recall-user": "Recall bloqueado no usuario",
  "flush-dns-cache": "Cache DNS limpo",
  "dism-analyze-component-store": "CMD DISM: analisar componentes",
  "dism-start-component-cleanup": "CMD DISM: limpar componentes",
  "dism-check-netfx3": "CMD DISM: verificar NetFx3",
  "dism-check-directplay": "CMD DISM: verificar DirectPlay",
  "check-gamer-dependencies": "Dependencias gamer verificadas",
  "set-diagtrack-service-manual": "Servico de telemetria em manual",
  "set-mapsbroker-service-manual": "Servico de mapas em manual",
};

const QUICK_PREPARE_ADMIN_ACTION_IDS = new Set([
  "disable-hibernation",
  "set-dns-cloudflare",
  "set-dns-google",
  "set-dns-opendns",
  "set-dns-quad9",
  "set-dns-adguard",
  "dism-analyze-component-store",
  "dism-start-component-cleanup",
  "dism-check-netfx3",
  "dism-check-directplay",
  "set-diagtrack-service-manual",
  "set-mapsbroker-service-manual",
]);

export function buildQuickPrepareTaskPlan(context: QuickPrepareContext): QuickPrepareTask[] {
  const dnsProvider = getDnsProvider(context.dnsProviderId);
  const advancedActionIds = [...HERMES_PREPARE_ADVANCED_ACTION_IDS, dnsProvider.actionId];

  return [
    task(
      "check-admin",
      "scan",
      "Verificar administrador",
      "Confere se o Hermes esta elevado.",
      "scanOnly",
    ),
    task(
      "scan-diagnostic",
      "scan",
      "Diagnostico local",
      "Leitura de saude e hardware.",
      "scanOnly",
    ),
    task(
      "scan-performance",
      "scan",
      "Ler performance",
      "Energia, Game Mode e visual atual.",
      "scanOnly",
    ),
    task(
      "scan-advanced",
      "scan",
      "Mapear comandos",
      "Registro, CMD/DISM e DNS allowlistados.",
      "scanOnly",
    ),
    task(
      "scan-clean",
      "cleanup",
      "Mapear temporarios",
      "Cache, logs e limpeza segura.",
      "scanOnly",
    ),
    task(
      "apply-clean",
      "cleanup",
      "Validar limpeza",
      "Fila de limpeza segura do Windows.",
      "userSafe",
    ),
    task(
      "scan-startup",
      "startup",
      "Mapear inicializacao",
      "Apps ativos e impacto no boot.",
      "scanOnly",
    ),
    task(
      "apply-startup",
      "startup",
      "Validar inicializacao",
      "Desativa alto impacto controlavel.",
      "userSafe",
    ),
    ...QUICK_PREPARE_PERFORMANCE_ACTION_IDS.map((id) =>
      task(
        `performance-${id}`,
        "windows",
        QUICK_PREPARE_PERFORMANCE_LABELS[id] ?? id,
        "Performance Engine",
        "userSafe",
      ),
    ),
    ...advancedActionIds.map((id) =>
      task(
        `advanced-${id}`,
        "windows",
        id === dnsProvider.actionId
          ? `Aplicar DNS ${dnsProvider.label}`
          : (QUICK_PREPARE_ADVANCED_LABELS[id] ?? id),
        "Advanced Engine",
        QUICK_PREPARE_ADMIN_ACTION_IDS.has(id) ? "adminOnly" : "userSafe",
      ),
    ),
    task(
      "scan-processes",
      "processes",
      "Mapear processos",
      "Jogo, Steam, Discord e segundo plano.",
      "scanOnly",
    ),
    task(
      "apply-processes",
      "processes",
      "Validar processos",
      "Fecha somente processos seguros.",
      "userSafe",
    ),
  ];
}

export async function runQuickPrepareExecutor(
  context: QuickPrepareContext,
  callbacks: QuickPrepareExecutorCallbacks = {},
): Promise<QuickPrepareReports> {
  const steps = buildQuickPrepareTaskPlan(context);
  const state: QuickPrepareRuntimeState = {
    reports: {},
    selectedCleanItemIds: [],
    selectedStartupItemIds: [],
    selectedProcessIds: [],
  };

  for (const [index, step] of steps.entries()) {
    if (callbacks.shouldCancel?.()) {
      throw new Error("Preparar PC cancelado pelo usuario.");
    }

    callbacks.onTaskStart?.({
      task: step,
      taskIndex: index,
      totalTasks: steps.length,
      status: "running",
      outputs: ["Executando via fila Hermes."],
    });

    const result = await runQuickPrepareTask(step, context, state);
    state.reports = { ...state.reports, ...result.reports };

    callbacks.onTaskComplete?.({
      task: step,
      taskIndex: index,
      totalTasks: steps.length,
      status: result.status,
      outputs: result.outputs,
      reports: result.reports,
    });
  }

  return state.reports;
}

async function runQuickPrepareTask(
  step: QuickPrepareTask,
  context: QuickPrepareContext,
  state: QuickPrepareRuntimeState,
): Promise<{
  status: QuickPrepareTaskStatus;
  outputs: string[];
  reports?: Partial<QuickPrepareReports>;
}> {
  try {
    if (step.id === "check-admin") {
      const system = await readSystemSecurityContext();
      state.system = system;
      return {
        status: "completed",
        reports: { system },
        outputs: [
          system.isElevated
            ? "Administrador confirmado."
            : "Sem administrador: modo teste continua validando a fila.",
          system.username ? `Usuario: ${system.username}` : "Usuario nao informado pelo Windows.",
        ],
      };
    }

    if (step.id === "scan-diagnostic") {
      const diagnostic = await refreshDiagnosticReport();
      return {
        status: "completed",
        reports: { diagnostic },
        outputs: [
          `Saude atual: ${Math.round(diagnostic.healthScore)}/100`,
          "Diagnostico local salvo para o Dashboard.",
        ],
      };
    }

    if (step.id === "scan-performance") {
      const performance = await refreshPerformanceReport();
      return {
        status: "completed",
        reports: { performance },
        outputs: [
          `Plano atual: ${performance.powerPlan.activeSchemeName}`,
          `Modo Jogo: ${performance.gameMode.status}`,
          `Visual: ${performance.visualEffects.status}`,
        ],
      };
    }

    if (step.id === "scan-advanced") {
      const advanced = await refreshAdvancedCatalog();
      state.advancedCatalog = advanced;
      return {
        status: "completed",
        reports: { advanced },
        outputs: [
          `${advanced.actions.length} comando(s) allowlistados`,
          `${advanced.blockedActions.length} bloqueado(s) por criterio`,
        ],
      };
    }

    if (step.id === "scan-clean") {
      const clean = await refreshCleanScanReport();
      state.selectedCleanItemIds = clean.items
        .filter((item) => item.selectedByDefault && item.safeToCleanLater)
        .map((item) => item.id);
      return {
        status: "completed",
        reports: { clean },
        outputs: [
          `${formatGb(clean.totalGb)} GB temporarios mapeados`,
          `${state.selectedCleanItemIds.length} area(s) seguras selecionadas`,
        ],
      };
    }

    if (step.id === "apply-clean") {
      if (state.selectedCleanItemIds.length === 0) {
        return {
          status: "completed",
          outputs: ["Sem lixo seguro para aplicar agora."],
        };
      }

      const cleanResult = await applyCleanEngine({
        confirmed: shouldConfirmReal(context, state, step),
        dryRun: shouldDryRunTask(context, state, step),
        itemIds: state.selectedCleanItemIds,
      });
      return {
        status: "completed",
        reports: { cleanResult },
        outputs: [
          `${cleanResult.plannedEntries} item(ns) validados`,
          cleanResult.dryRun ? "Modo teste: limpeza nao removeu arquivos." : cleanResult.message,
        ],
      };
    }

    if (step.id === "scan-startup") {
      const startup = await refreshStartupReport();
      state.selectedStartupItemIds = startup.items
        .filter(
          (item) =>
            item.status === "active" &&
            item.impact === "high" &&
            item.controllable &&
            item.canDisableLater,
        )
        .map((item) => item.id);
      return {
        status: "completed",
        reports: { startup },
        outputs: [
          `${startup.totalItems} item(ns) de inicializacao`,
          `${state.selectedStartupItemIds.length} alto impacto controlavel`,
        ],
      };
    }

    if (step.id === "apply-startup") {
      if (state.selectedStartupItemIds.length === 0) {
        return {
          status: "completed",
          outputs: ["Sem inicializacao de alto impacto controlavel."],
        };
      }

      const startupResult = await applyStartupEngine({
        confirmed: shouldConfirmReal(context, state, step),
        dryRun: shouldDryRunTask(context, state, step),
        action: "disable",
        itemIds: state.selectedStartupItemIds,
      });
      return {
        status: "completed",
        reports: { startupResult },
        outputs: [
          `${startupResult.selectedItems} item(ns) validados`,
          startupResult.dryRun
            ? "Modo teste: inicializacao nao foi alterada."
            : startupResult.message,
        ],
      };
    }

    if (step.id.startsWith("performance-")) {
      const actionId = step.id.replace("performance-", "");
      const performanceResult = await applyPerformanceControlled({
        confirmed: shouldConfirmReal(context, state, step),
        dryRun: shouldDryRunTask(context, state, step),
        actionIds: [actionId],
        reason: "Preparar PC",
      });
      return {
        status: "completed",
        reports: { performanceResult },
        outputs: formatApplyOutputs(
          performanceResult.appliedActions,
          performanceResult.dryRun,
          performanceResult.message,
        ),
      };
    }

    if (step.id.startsWith("advanced-")) {
      const actionId = step.id.replace("advanced-", "");
      const available = state.advancedCatalog?.actions.some((action) => action.id === actionId);
      if (available === false) {
        return {
          status: "unavailable",
          outputs: [`${actionId} indisponivel neste catalogo.`],
        };
      }

      const advancedResult = await applyAdvancedActions({
        confirmed: shouldConfirmReal(context, state, step),
        dryRun: shouldDryRunTask(context, state, step),
        actionIds: [actionId],
        extremeMode: false,
      });
      return {
        status: "completed",
        reports: { advancedResult },
        outputs: formatApplyOutputs(
          advancedResult.appliedActions,
          advancedResult.dryRun,
          advancedResult.message,
        ),
      };
    }

    if (step.id === "scan-processes") {
      const gamer = await loadGamerReport();
      state.selectedProcessIds = gamer.suggestedProcesses
        .filter((process) => process.canClose && process.recommendation === "suggestedClose")
        .map((process) => process.pid);
      return {
        status: "completed",
        reports: { gamer },
        outputs: [
          `${state.selectedProcessIds.length} processo(s) seguros selecionados`,
          `${gamer.summary.protectedCount} protegido(s), incluindo Steam/Discord quando detectados`,
        ],
      };
    }

    if (step.id === "apply-processes") {
      if (state.selectedProcessIds.length === 0) {
        return {
          status: "completed",
          outputs: ["Sem processo seguro para fechar agora."],
        };
      }

      const gamerResult = await applyGamerEngine({
        confirmed: shouldConfirmReal(context, state, step),
        dryRun: shouldDryRunTask(context, state, step),
        processIds: state.selectedProcessIds,
        includePerformanceProfile: true,
      });
      return {
        status: "completed",
        reports: { gamerResult },
        outputs: [
          `${gamerResult.closedProcesses.length} processo(s) validados`,
          gamerResult.dryRun ? "Modo teste: nenhum processo foi fechado." : gamerResult.message,
        ],
      };
    }

    return {
      status: "unavailable",
      outputs: [`Passo ${step.id} ainda nao implementado.`],
    };
  } catch (error) {
    return {
      status: "unavailable",
      outputs: [error instanceof Error ? error.message : String(error)],
    };
  }
}

function task(
  id: string,
  phaseId: QuickPreparePhaseId,
  title: string,
  detail: string,
  realPolicy: QuickPrepareRealPolicy,
): QuickPrepareTask {
  return {
    id,
    phaseId,
    title,
    detail,
    realPolicy,
  };
}

function shouldConfirmReal(
  context: QuickPrepareContext,
  state: QuickPrepareRuntimeState,
  step: QuickPrepareTask,
) {
  return !shouldDryRunTask(context, state, step);
}

function shouldDryRunTask(
  context: QuickPrepareContext,
  state: QuickPrepareRuntimeState,
  step: QuickPrepareTask,
) {
  if (context.executionMode !== "real") {
    return true;
  }
  if (HERMES_SAFE_TEST_MODE) {
    return true;
  }
  if (step.realPolicy === "scanOnly") {
    return true;
  }
  if (step.realPolicy === "adminOnly" && !state.system?.isElevated) {
    return true;
  }
  return false;
}

function formatApplyOutputs(
  actions: Array<{ title: string; status: string; message: string }>,
  dryRun: boolean,
  fallback: string,
) {
  if (actions.length === 0) {
    return [fallback];
  }

  const first = actions[0];
  return [
    `${first.title}: ${first.status}`,
    dryRun ? "Modo teste: comando validado sem alterar o Windows." : first.message,
  ];
}

export async function runQuickPreparePhase(
  phaseId: QuickPreparePhaseId,
  context: QuickPrepareContext,
): Promise<QuickPreparePhaseResult> {
  if (phaseId === "scan") {
    return runScanPhase();
  }

  if (phaseId === "cleanup") {
    return runCleanupPhase();
  }

  if (phaseId === "startup") {
    return runStartupPhase();
  }

  if (phaseId === "windows") {
    return runWindowsPhase(context);
  }

  return runProcessesPhase();
}

async function runScanPhase(): Promise<QuickPreparePhaseResult> {
  const [diagnostic, performance, advanced] = await Promise.all([
    refreshDiagnosticReport(),
    refreshPerformanceReport(),
    refreshAdvancedCatalog(),
  ]);

  return {
    reports: { diagnostic, performance, advanced },
    outputs: [
      `Saude atual: ${Math.round(diagnostic.healthScore)}/100`,
      `Modo Jogo: ${performance.gameMode.status}`,
      `${advanced.actions.length} ajuste(s) Windows mapeados`,
    ],
  };
}

async function runCleanupPhase(): Promise<QuickPreparePhaseResult> {
  const clean = await refreshCleanScanReport();
  const itemIds = clean.items
    .filter((item) => item.selectedByDefault && item.safeToCleanLater)
    .map((item) => item.id);
  const result = await tryRun(() =>
    itemIds.length
      ? applyCleanEngine({ confirmed: false, dryRun: true, itemIds })
      : Promise.resolve(null),
  );

  return {
    reports: { clean, cleanResult: result.value ?? undefined },
    outputs: [
      `${formatGb(clean.totalGb)} GB temporarios mapeados`,
      `${itemIds.length} area(s) seguras selecionadas`,
      result.value
        ? `${result.value.plannedEntries} item(ns) validados para limpeza`
        : (result.message ?? "Sem lixo seguro para aplicar agora"),
    ],
  };
}

async function runStartupPhase(): Promise<QuickPreparePhaseResult> {
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
      ? applyStartupEngine({ confirmed: false, dryRun: true, action: "disable", itemIds })
      : Promise.resolve(null),
  );

  return {
    reports: { startup, startupResult: result.value ?? undefined },
    outputs: [
      `${startup.totalItems} item(ns) de inicializacao analisados`,
      `${itemIds.length} alto impacto selecionado(s)`,
      result.value
        ? `${result.value.selectedItems} item(ns) validados para desativar`
        : (result.message ?? "Sem inicializacao de alto impacto controlavel"),
    ],
  };
}

async function runWindowsPhase(context: QuickPrepareContext): Promise<QuickPreparePhaseResult> {
  const [performance, advanced] = await Promise.all([
    refreshPerformanceReport(),
    refreshAdvancedCatalog(),
  ]);
  const dnsProvider = getDnsProvider(context.dnsProviderId);
  const availableAdvancedIds = new Set(advanced.actions.map((action) => action.id));
  const advancedActionIds = [...HERMES_PREPARE_ADVANCED_ACTION_IDS, dnsProvider.actionId].filter(
    (id) => availableAdvancedIds.has(id),
  );

  const [performanceResult, advancedResult] = await Promise.all([
    tryRun(() =>
      applyPerformanceControlled({
        confirmed: false,
        dryRun: true,
        actionIds: QUICK_PREPARE_PERFORMANCE_ACTION_IDS,
        reason: "Preparar PC",
      }),
    ),
    tryRun(() =>
      advancedActionIds.length
        ? applyAdvancedActions({
            confirmed: false,
            dryRun: true,
            actionIds: advancedActionIds,
            extremeMode: false,
          })
        : Promise.resolve(null),
    ),
  ]);

  const appliedPerformance = performanceResult.value?.appliedActions.length ?? 0;
  const appliedAdvanced = advancedResult.value?.appliedActions.length ?? 0;

  return {
    reports: {
      performance,
      performanceResult: performanceResult.value ?? undefined,
      advanced,
      advancedResult: advancedResult.value ?? undefined,
    },
    outputs: [
      `Game Mode ON, Game DVR OFF, DNS ${dnsProvider.label}, visual gamer, privacidade e CMD/DISM`,
      `${appliedPerformance + appliedAdvanced} ajuste(s) Windows validados`,
      HERMES_SAFE_TEST_MODE
        ? "Modo teste: nada foi aplicado de verdade"
        : "Ajustes reais executados",
    ],
  };
}

export function getDnsProvider(providerId: DnsProviderId) {
  return DNS_PROVIDERS.find((provider) => provider.id === providerId) ?? DNS_PROVIDERS[0];
}

async function runProcessesPhase(): Promise<QuickPreparePhaseResult> {
  const gamer = await loadGamerReport();
  const processIds = gamer.suggestedProcesses
    .filter((process) => process.canClose && process.recommendation === "suggestedClose")
    .map((process) => process.pid);
  const result = await tryRun(() =>
    processIds.length
      ? applyGamerEngine({
          confirmed: false,
          dryRun: true,
          processIds,
          includePerformanceProfile: true,
        })
      : Promise.resolve(null),
  );

  return {
    reports: { gamer, gamerResult: result.value ?? undefined },
    outputs: [
      `${processIds.length} processo(s) em segundo plano selecionado(s)`,
      `${gamer.summary.protectedCount} processo(s) protegido(s), incluindo jogo/Steam/Discord quando detectados`,
      result.value
        ? `${result.value.closedProcesses.length} processo(s) validados pela Gamer Engine`
        : (result.message ?? "Sem processo seguro para fechar agora"),
    ],
  };
}

async function tryRun<T>(task: () => Promise<T | null>): Promise<{ value?: T; message?: string }> {
  try {
    const value = await task();
    return value ? { value } : {};
  } catch (error) {
    return { message: error instanceof Error ? error.message : String(error) };
  }
}

function formatGb(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value);
}
