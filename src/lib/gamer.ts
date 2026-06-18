import type { PerformanceApplyResult } from "@/lib/performance";
import type { RestoreApplyResult } from "@/lib/restore";
import { forceSafeDryRun } from "@/lib/safe-mode";

export type GamerProcessCategory =
  | "game"
  | "launcher"
  | "overlay"
  | "communication"
  | "browser"
  | "cloudSync"
  | "creative"
  | "background"
  | "system"
  | "unknown";

export type GamerRecommendation = "keep" | "optionalClose" | "suggestedClose" | "neverClose";
export type GamerCloseStatus = "dryRun" | "closed" | "skipped" | "failed";
export type GamerDetectionConfidence = "high" | "medium" | "low" | "unavailable";

export type GamerGameProfile = {
  id: string;
  gameName: string;
  executable: string;
  recommendedPlan: string;
  allowedProcessesToClose: string[];
  protectedProcesses: string[];
  appliedActions: string[];
  timestamp: string;
};

export type GamerActiveGame = {
  detected: boolean;
  confidence: GamerDetectionConfidence;
  pid?: number;
  processName?: string;
  displayName?: string;
  executablePath?: string;
  windowTitle?: string;
  matchedProfile?: GamerGameProfile;
  recommendedPlan?: string;
  requiresManualSelection: boolean;
  message: string;
};

export type GamerProcess = {
  pid: number;
  name: string;
  displayName: string;
  executablePath?: string;
  commandLine?: string;
  memoryMb: number;
  category: GamerProcessCategory;
  recommendation: GamerRecommendation;
  reason: string;
  canClose: boolean;
  rollbackAvailable: boolean;
};

export type GamerReport = {
  generatedAt: string;
  engineVersion: string;
  readOnly: boolean;
  willModifySystem: boolean;
  telemetry: boolean;
  residentProcess: boolean;
  activeGame: GamerActiveGame;
  gameProfiles: GamerGameProfile[];
  detectedGames: GamerProcess[];
  suggestedProcesses: GamerProcess[];
  protectedProcesses: GamerProcess[];
  summary: {
    detectedGames: number;
    suggestedToClose: number;
    optionalToClose: number;
    protectedCount: number;
    estimatedRamToFreeMb: number;
  };
  safeguards: string[];
  warnings: string[];
};

export type GamerApplyRequest = {
  confirmed: boolean;
  dryRun?: boolean;
  processIds: number[];
  includePerformanceProfile?: boolean;
  gameProfileId?: string;
};

export type GamerApplyResult = {
  generatedAt: string;
  engineVersion: string;
  dryRun: boolean;
  snapshotId: string;
  rollbackAvailable: boolean;
  postGameRestoreAvailable: boolean;
  activeGame: GamerActiveGame;
  closedProcesses: Array<{
    pid: number;
    name: string;
    status: GamerCloseStatus;
    message: string;
  }>;
  performanceResult?: PerformanceApplyResult;
  message: string;
};

export type GamerProfileList = {
  generatedAt: string;
  engineVersion: string;
  totalProfiles: number;
  maxProfiles: number;
  profiles: GamerGameProfile[];
};

export type GamerGameProfileSaveRequest = {
  id?: string;
  gameName: string;
  executable: string;
  recommendedPlan?: string;
  allowedProcessesToClose?: string[];
  protectedProcessesó: string[];
  appliedActionsó: string[];
};

export type GamerRestoreSessionRequest = {
  snapshotId: string;
  confirmed?: boolean;
  dryRun?: boolean;
};

export type GamerRestoreSessionResult = {
  generatedAt: string;
  engineVersion: string;
  dryRun: boolean;
  snapshotId: string;
  restored: boolean;
  restoreResult: RestoreApplyResult;
  message: string;
};

export const fallbackGamerReport: GamerReport = {
  generatedAt: "0",
  engineVersion: "gamer-engine-fallback-v1",
  readOnly: true,
  willModifySystem: false,
  telemetry: false,
  residentProcess: false,
  activeGame: {
    detected: false,
    confidence: "unavailable",
    requiresManualSelection: true,
    message: "Deteccao de jogo ativo indisponível fora do backend Tauri.",
  },
  gameProfiles: [],
  detectedGames: [],
  suggestedProcesses: [],
  protectedProcesses: [],
  summary: {
    detectedGames: 0,
    suggestedToClose: 0,
    optionalToClose: 0,
    protectedCount: 0,
    estimatedRamToFreeMb: 0,
  },
  safeguards: [
    "Nunca fecha processos críticos do Windows.",
    "Fechamento real exige confirmação.",
    "Usa CloseMainWindow; não usa kill forcado.",
    "Snapshot e log local antes de qualquer aplicação.",
    "Restauração pos-jogo usa o Restore Engine.",
  ],
  warnings: ["Gamer Engine real indisponível. Nenhum processo demonstrativo foi exibido."],
};

export async function loadGamerReport(): Promise<GamerReport> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return fallbackGamerReport;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<GamerReport>("gamer_engine_read");
  } catch (error) {
    console.warn("Gamer Engine indisponível, usando fallback local.", error);
    return fallbackGamerReport;
  }
}

export async function applyGamerEngine(request: GamerApplyRequest): Promise<GamerApplyResult> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    throw new Error("Gamer Engine exige o backend Tauri.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<GamerApplyResult>("gamer_engine_apply", {
    request: forceSafeDryRun(request),
  });
}

export async function listGamerProfiles(): Promise<GamerProfileList> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return {
      generatedAt: "0",
      engineVersion: "gamer-profiles-fallback-v1",
      totalProfiles: 0,
      maxProfiles: 50,
      profiles: [],
    };
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<GamerProfileList>("gamer_profiles_list");
}

export async function saveGamerProfile(
  request: GamerGameProfileSaveRequest,
): Promise<GamerGameProfile> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    throw new Error("Perfis gamer exigem o backend Tauri.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<GamerGameProfile>("gamer_profile_save", { request });
}

export async function deleteGamerProfile(profileId: string): Promise<GamerProfileList> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    throw new Error("Perfis gamer exigem o backend Tauri.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<GamerProfileList>("gamer_profile_delete", { profileId });
}

export async function restoreGamerSession(
  request: GamerRestoreSessionRequest,
): Promise<GamerRestoreSessionResult> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    throw new Error("Restauração gamer exige o backend Tauri.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<GamerRestoreSessionResult>("gamer_restore_session", {
    request: forceSafeDryRun({ ...request, confirmed: request.confirmed ?? false }),
  });
}
