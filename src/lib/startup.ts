import { readLocalReportCache, writeLocalReportCache } from "@/lib/local-read-cache";
import { forceSafeDryRun } from "@/lib/safe-mode";

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
  totalItems: 0,
  disabledItems: 0,
  highImpactCount: 0,
  mediumImpactCount: 0,
  lowImpactCount: 0,
  items: [],
  warnings: ["Leitura real de inicializacao indisponivel. Nenhum app demonstrativo foi exibido."],
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
    console.warn("Startup Engine indisponivel, usando fallback indisponivel.", error);
    return fallbackStartupReport;
  }
}

export async function applyStartupEngine(
  request: StartupApplyRequest,
): Promise<StartupApplyResult> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    throw new Error("Startup Engine exige o backend Tauri.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<StartupApplyResult>("startup_engine_apply", {
    request: forceSafeDryRun(request),
  });
}
