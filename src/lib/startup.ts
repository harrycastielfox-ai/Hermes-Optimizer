import { forceSafeDryRun } from "@/lib/safe-mode";
import { readLocalReportCache, writeLocalReportCache } from "@/lib/local-read-cache";

export type StartupImpact = "high" | "medium" | "low";
export type StartupStatus = "active" | "disabled" | "unknown";
export type StartupApplyAction = "disable" | "enable";
export type StartupApplyActionStatus = "dryRun" | "disabled" | "enabled" | "skipped" | "failed";

export type StartupItem = {
  id: string;
  name: string;
  command: string;
  location: string;
  user: string;
  impact: StartupImpact;
  status: StartupStatus;
  canDisableLater: boolean;
  canEnableLater: boolean;
  controllable: boolean;
  controlReason: string;
  registryPath?: string;
  registryValueName?: string;
};

export type StartupReport = {
  generatedAt: string;
  engineVersion: string;
  readOnly: boolean;
  totalItems: number;
  disabledItems: number;
  highImpactCount: number;
  mediumImpactCount: number;
  lowImpactCount: number;
  items: StartupItem[];
  warnings: string[];
};

export type StartupApplyRequest = {
  confirmed: boolean;
  dryRun?: boolean;
  action: StartupApplyAction;
  itemIds?: string[];
  impacts?: StartupImpact[];
};

export type StartupApplyResult = {
  generatedAt: string;
  engineVersion: string;
  dryRun: boolean;
  action: StartupApplyAction;
  snapshotId: string;
  rollbackAvailable: boolean;
  selectedItems: number;
  changedItems: number;
  skippedItems: number;
  failedItems: number;
  message: string;
  actions: Array<{
    itemId: string;
    name: string;
    status: StartupApplyActionStatus;
    message: string;
  }>;
  warnings: string[];
};

export const fallbackStartupReport: StartupReport = {
  generatedAt: "0",
  engineVersion: "startup-engine-fallback-v1",
  readOnly: true,
  totalItems: 4,
  disabledItems: 0,
  highImpactCount: 2,
  mediumImpactCount: 2,
  lowImpactCount: 0,
  items: [
    fallbackItem("Discord", "AppData\\Local\\Discord\\Update.exe --processStart Discord.exe", "high"),
    fallbackItem("Steam", "C:\\Program Files (x86)\\Steam\\steam.exe", "high"),
    fallbackItem("Spotify", "AppData\\Roaming\\Spotify\\Spotify.exe", "medium"),
    fallbackItem("OneDrive", "C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe", "medium"),
  ],
  warnings: [],
};

export async function loadStartupReport(): Promise<StartupReport> {
  const cached = readLocalReportCache<StartupReport>("startup-report");
  if (cached) {
    return cached;
  }

  return refreshStartupReport();
}

export async function refreshStartupReport(): Promise<StartupReport> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return fallbackStartupReport;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const report = await invoke<StartupReport>("startup_engine_read");
    return writeLocalReportCache("startup-report", report);
  } catch (error) {
    console.warn("Startup Engine indisponivel, usando fallback local.", error);
    return fallbackStartupReport;
  }
}

export async function applyStartupEngine(request: StartupApplyRequest): Promise<StartupApplyResult> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    throw new Error("Startup Engine exige o backend Tauri.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<StartupApplyResult>("startup_engine_apply", { request: forceSafeDryRun(request) });
}

function fallbackItem(name: string, command: string, impact: StartupImpact): StartupItem {
  return {
    id: `fallback-${name.toLowerCase()}`,
    name,
    command,
    location: "Startup demo somente leitura",
    user: "Usuario atual",
    impact,
    status: "active",
    canDisableLater: true,
    canEnableLater: false,
    controllable: false,
    controlReason: "Fallback somente leitura; nao controlavel.",
  };
}
