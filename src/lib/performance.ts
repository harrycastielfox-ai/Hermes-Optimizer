import { forceSafeDryRun } from "@/lib/safe-mode";
import { readLocalReportCache, writeLocalReportCache } from "@/lib/local-read-cache";

export type PerformanceSettingStatus = "enabled" | "disabled" | "optimized" | "balanced" | "unknown";
export type PerformanceApplyActionStatus = "dryRun" | "applied" | "skipped" | "failed";

export type PerformanceReport = {
  generatedAt: string;
  engineVersion: string;
  readOnly: boolean;
  willModifySystem: boolean;
  powerPlan: {
    activeSchemeName: string;
    activeSchemeGuid: string;
    status: string;
  };
  gameMode: {
    available: boolean;
    enabled?: boolean;
    status: string;
    gameBarAllowed?: boolean;
    gameDvrEnabled?: boolean;
  };
  visualEffects: {
    profile: string;
    transparencyEnabled?: boolean;
    animationsEnabled?: boolean;
    shadowsEnabled?: boolean;
    fullWindowDragEnabled?: boolean;
    rawVisualFxSetting?: number;
    status: string;
  };
  backgroundApps: {
    enabled?: boolean;
    status: string;
    powerThrottlingDisabled?: boolean;
  };
  settings: PerformanceSetting[];
  warnings: string[];
};

export type PerformanceSetting = {
  id: string;
  label: string;
  value: string;
  status: PerformanceSettingStatus;
  source: string;
  canOptimizeLater: boolean;
};

export type PerformanceApplyRequest = {
  confirmed: boolean;
  dryRun?: boolean;
  actionIds?: string[];
  reason?: string;
};

export type PerformanceApplyResult = {
  generatedAt: string;
  engineVersion: string;
  readOnly: boolean;
  dryRun: boolean;
  snapshotId: string;
  rollbackAvailable: boolean;
  appliedActions: Array<{
    id: string;
    title: string;
    status: PerformanceApplyActionStatus;
    message: string;
  }>;
  message: string;
};

export const fallbackPerformanceReport: PerformanceReport = {
  generatedAt: "0",
  engineVersion: "performance-engine-fallback-v1",
  readOnly: true,
  willModifySystem: false,
  powerPlan: {
    activeSchemeName: "Equilibrado",
    activeSchemeGuid: "381b4222-f694-41f0-9685-ff5bb260df2e",
    status: "Equilibrado",
  },
  gameMode: {
    available: true,
    enabled: true,
    status: "Ativo",
    gameBarAllowed: true,
    gameDvrEnabled: false,
  },
  visualEffects: {
    profile: "Windows decide",
    transparencyEnabled: true,
    animationsEnabled: true,
    shadowsEnabled: true,
    fullWindowDragEnabled: true,
    rawVisualFxSetting: 0,
    status: "Visual ativo",
  },
  backgroundApps: {
    enabled: true,
    status: "Ativo",
    powerThrottlingDisabled: false,
  },
  settings: [
    setting("power-plan", "Plano de energia", "Equilibrado", "balanced", "powercfg /GETACTIVESCHEME"),
    setting("game-mode", "Game Mode", "Ativo", "enabled", "HKCU GameBar/GameConfigStore"),
    setting("transparency", "Transparencias", "Ativo", "enabled", "HKCU Themes\\Personalize"),
    setting("animations", "Animacoes", "Ativo", "enabled", "HKCU Desktop/Explorer"),
    setting("shadows", "Sombras", "Ativo", "enabled", "HKCU Explorer\\Advanced"),
    setting("background-apps", "Apps em segundo plano", "Ativo", "enabled", "HKCU BackgroundAccessApplications"),
  ],
  warnings: [],
};

export async function loadPerformanceReport(): Promise<PerformanceReport> {
  const cached = readLocalReportCache<PerformanceReport>("performance-report");
  if (cached) {
    return cached;
  }

  return refreshPerformanceReport();
}

export async function refreshPerformanceReport(): Promise<PerformanceReport> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return fallbackPerformanceReport;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const report = await invoke<PerformanceReport>("performance_engine_read");
    return writeLocalReportCache("performance-report", report);
  } catch (error) {
    console.warn("Performance Engine indisponivel, usando fallback local.", error);
    return fallbackPerformanceReport;
  }
}

export async function applyPerformanceControlled(
  request: PerformanceApplyRequest = { confirmed: false, dryRun: true },
): Promise<PerformanceApplyResult> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    throw new Error("Performance Engine controlada exige o backend Tauri.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<PerformanceApplyResult>("performance_apply_controlled", { request: forceSafeDryRun(request) });
}

function setting(
  id: string,
  label: string,
  value: string,
  status: PerformanceSettingStatus,
  source: string,
): PerformanceSetting {
  return {
    id,
    label,
    value,
    status,
    source,
    canOptimizeLater: true,
  };
}
