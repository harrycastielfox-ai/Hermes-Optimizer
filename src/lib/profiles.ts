import type { PerformanceApplyActionStatus } from "@/lib/performance";
import { forceSafeDryRun } from "@/lib/safe-mode";
import type { StartupApplyAction, StartupImpact } from "@/lib/startup";

export type ProfileRisk = "low" | "medium" | "high";
export type ProfileStatus = "ready" | "previewOnly";
export type ProfileEngineStatus = "dryRun" | "applied" | "skipped" | "failed";

export type HermesProfile = {
  id: string;
  name: string;
  summary: string;
  risk: ProfileRisk;
  status: ProfileStatus;
  reversible: boolean;
  requiresConfirmation: boolean;
  requiresExtraConfirmation: boolean;
  performanceActionIds: string[];
  cleanItemIds: string[];
  startupAction?: StartupApplyAction;
  startupImpacts: StartupImpact[];
  gamerEnabled: boolean;
  advancedActionIds: string[];
  expectedImpact: string[];
  safeguards: string[];
};

export type ProfilesCatalog = {
  generatedAt: string;
  engineVersion: string;
  readOnly: boolean;
  telemetry: boolean;
  residentProcess: boolean;
  profiles: HermesProfile[];
};

export type ProfileApplyRequest = {
  profileId: string;
  confirmed: boolean;
  dryRun?: boolean;
  extremeConfirmed?: boolean;
};

export type ProfileApplyResult = {
  generatedAt: string;
  engineVersion: string;
  profileId: string;
  profileName: string;
  dryRun: boolean;
  snapshotId: string;
  snapshotIds: string[];
  rollbackAvailable: boolean;
  appliedActions: Array<{
    id: string;
    title: string;
    status: PerformanceApplyActionStatus;
    message: string;
  }>;
  engineResults: Array<{
    engine: string;
    status: ProfileEngineStatus;
    snapshotId?: string;
    rollbackAvailable: boolean;
    message: string;
  }>;
  conflictWarnings: string[];
  recommendedProfilePersisted: boolean;
  profileSummary: string;
  message: string;
};

const fallbackSafeguards = [
  "Snapshot obrigatorio antes de aplicar.",
  "Log local obrigatorio.",
  "Rollback pelo Restore Engine.",
  "Sem telemetria ou processo residente.",
];

const fallbackProfiles: HermesProfile[] = [
  {
    id: "seguro",
    name: "Seguro",
    summary: "Maxima estabilidade com plano equilibrado.",
    risk: "low",
    status: "previewOnly",
    reversible: true,
    requiresConfirmation: true,
    requiresExtraConfirmation: false,
    performanceActionIds: ["set-balanced-power-plan"],
    cleanItemIds: [],
    startupAction: undefined,
    startupImpacts: [],
    gamerEnabled: false,
    advancedActionIds: ["list-power-plans"],
    expectedImpact: [
      "Mantem o Windows em modo equilibrado.",
      "Evita ajustes agressivos.",
      "Apenas registra planos de energia disponíveis.",
    ],
    safeguards: fallbackSafeguards,
  },
  {
    id: "trabalho",
    name: "Trabalho",
    summary: "Equilibrio para produtividade diaria.",
    risk: "low",
    status: "previewOnly",
    reversible: true,
    requiresConfirmation: true,
    requiresExtraConfirmation: false,
    performanceActionIds: ["set-balanced-power-plan"],
    cleanItemIds: ["temp", "cache"],
    startupAction: undefined,
    startupImpacts: [],
    gamerEnabled: false,
    advancedActionIds: ["flush-dns-cache"],
    expectedImpact: [
      "Mantem ajustes visuais separados e opt-in.",
      "Mantem energia equilibrada.",
      "Limpa temporários/cache seguros com quarentena.",
    ],
    safeguards: fallbackSafeguards,
  },
  {
    id: "gamer",
    name: "Gamer",
    summary: "Prioriza resposta e desempenho sob demanda.",
    risk: "medium",
    status: "previewOnly",
    reversible: true,
    requiresConfirmation: true,
    requiresExtraConfirmation: false,
    performanceActionIds: ["set-high-performance-power-plan"],
    cleanItemIds: ["temp", "cache", "thumbnails"],
    startupAction: "disable",
    startupImpacts: ["high"],
    gamerEnabled: true,
    advancedActionIds: ["enable-game-mode", "disable-game-dvr", "flush-dns-cache"],
    expectedImpact: [
      "Não altera tema ou efeitos visuais automaticamente.",
      "Ativa Alto Desempenho quando disponível.",
      "Sugere fechamento seguro de overlays/apps secundários.",
      "Desabilita inicialização de alto impacto quando controlável.",
    ],
    safeguards: fallbackSafeguards,
  },
  {
    id: "economia",
    name: "Economia",
    summary: "Reduz consumo e animações não essenciais.",
    risk: "low",
    status: "previewOnly",
    reversible: true,
    requiresConfirmation: true,
    requiresExtraConfirmation: false,
    performanceActionIds: ["set-power-saver-power-plan"],
    cleanItemIds: ["temp"],
    startupAction: "disable",
    startupImpacts: ["high"],
    gamerEnabled: false,
    advancedActionIds: ["disable-game-dvr", "flush-dns-cache"],
    expectedImpact: [
      "Não altera tema ou efeitos visuais automaticamente.",
      "Ativa Economia de Energia quando disponível.",
      "Reduz inicialização pesada quando seguro.",
    ],
    safeguards: fallbackSafeguards,
  },
  {
    id: "extremo",
    name: "Extremo",
    summary: "Desempenho maximo com confirmação extra.",
    risk: "high",
    status: "previewOnly",
    reversible: true,
    requiresConfirmation: true,
    requiresExtraConfirmation: true,
    performanceActionIds: ["set-high-performance-power-plan"],
    cleanItemIds: ["temp", "cache", "logs", "thumbnails", "windows-update-cache"],
    startupAction: "disable",
    startupImpacts: ["high", "medium"],
    gamerEnabled: true,
    advancedActionIds: [
      "enable-game-mode",
      "disable-game-dvr",
      "disable-startup-delay",
      "flush-dns-cache",
      "list-power-plans",
    ],
    expectedImpact: [
      "Aplica apenas ajustes não visuais desta fase.",
      "Exige confirmação extra antes da aplicação real.",
      "Usa Clean, Startup, Gamer e Advanced em modo allowlist.",
    ],
    safeguards: fallbackSafeguards,
  },
];

export const fallbackProfilesCatalog: ProfilesCatalog = {
  generatedAt: "0",
  engineVersion: "profiles-engine-fallback-v1",
  readOnly: true,
  telemetry: false,
  residentProcess: false,
  profiles: fallbackProfiles,
};

export async function loadProfilesCatalog(): Promise<ProfilesCatalog> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return fallbackProfilesCatalog;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<ProfilesCatalog>("profiles_list");
  } catch (error) {
    console.warn("Profiles Engine indisponível, usando fallback local.", error);
    return fallbackProfilesCatalog;
  }
}

export async function applyHermesProfile(
  request: ProfileApplyRequest,
): Promise<ProfileApplyResult> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    throw new Error("Profiles Engine exige o backend Tauri.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<ProfileApplyResult>("profiles_apply", { request: forceSafeDryRun(request) });
}
