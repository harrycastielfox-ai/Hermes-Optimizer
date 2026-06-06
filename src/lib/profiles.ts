import type { PerformanceApplyActionStatus } from "@/lib/performance";
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
  message: string;
};

export const fallbackProfilesCatalog: ProfilesCatalog = {
  generatedAt: "0",
  engineVersion: "profiles-engine-fallback-v1",
  readOnly: true,
  telemetry: false,
  residentProcess: false,
  profiles: [
    profile("seguro", "Seguro", "Maxima estabilidade com plano equilibrado.", "low", ["set-balanced-power-plan"], [], undefined, [], false, ["list-power-plans"]),
    profile("trabalho", "Trabalho", "Equilibrio para produtividade diaria.", "low", [
      "disable-transparency",
      "set-balanced-power-plan",
    ], ["temp", "cache"], undefined, [], false, ["flush-dns-cache"]),
    profile("gamer", "Gamer", "Prioriza resposta e desempenho sob demanda.", "medium", [
      "disable-transparency",
      "disable-window-animations",
      "disable-visual-shadows",
      "set-high-performance-power-plan",
    ], ["temp", "cache", "thumbnails"], "disable", ["high"], true, [
      "enable-game-mode",
      "disable-game-dvr",
      "flush-dns-cache",
      "set-visual-effects-custom",
    ]),
    profile("economia", "Economia", "Reduz consumo e animacoes nao essenciais.", "low", [
      "disable-transparency",
      "disable-window-animations",
      "set-power-saver-power-plan",
    ], ["temp"], "disable", ["high"], false, ["disable-game-dvr", "flush-dns-cache"]),
    profile("extremo", "Extremo", "Desempenho maximo com confirmacao extra.", "high", [
      "disable-transparency",
      "disable-window-animations",
      "disable-visual-shadows",
      "set-high-performance-power-plan",
    ], ["temp", "cache", "logs", "thumbnails", "windows-update-cache"], "disable", ["high", "medium"], true, [
      "enable-game-mode",
      "disable-game-dvr",
      "disable-startup-delay",
      "flush-dns-cache",
      "list-power-plans",
      "set-visual-effects-custom",
    ], true),
  ],
};

export async function loadProfilesCatalog(): Promise<ProfilesCatalog> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return fallbackProfilesCatalog;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<ProfilesCatalog>("profiles_list");
  } catch (error) {
    console.warn("Profiles Engine indisponivel, usando fallback local.", error);
    return fallbackProfilesCatalog;
  }
}

export async function applyHermesProfile(request: ProfileApplyRequest): Promise<ProfileApplyResult> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    throw new Error("Profiles Engine exige o backend Tauri.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<ProfileApplyResult>("profiles_apply", { request });
}

function profile(
  id: string,
  name: string,
  summary: string,
  risk: ProfileRisk,
  performanceActionIds: string[],
  cleanItemIds: string[] = [],
  startupAction?: StartupApplyAction,
  startupImpacts: StartupImpact[] = [],
  gamerEnabled = false,
  advancedActionIds: string[] = [],
  requiresExtraConfirmation = false,
): HermesProfile {
  return {
    id,
    name,
    summary,
    risk,
    status: "ready",
    reversible: true,
    requiresConfirmation: true,
    requiresExtraConfirmation,
    performanceActionIds,
    cleanItemIds,
    startupAction,
    startupImpacts,
    gamerEnabled,
    advancedActionIds,
    expectedImpact: ["Snapshot obrigatorio", "Rollback disponivel"],
    safeguards: ["Sem telemetria", "Sem servico residente", "Log local"],
  };
}
