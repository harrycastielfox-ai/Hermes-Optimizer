import { forceSafeDryRun } from "@/lib/safe-mode";
import { readLocalReportCache, writeLocalReportCache } from "@/lib/local-read-cache";

export type AdvancedMethod = "registry" | "cmd" | "powerShell";
export type AdvancedRisk = "low" | "medium" | "high";
export type AdvancedActionStatus = "dryRun" | "applied" | "skipped" | "failed";

export type AdvancedAction = {
  id: string;
  title: string;
  description: string;
  method: AdvancedMethod;
  risk: AdvancedRisk;
  requiresAdmin: boolean;
  requiresExtreme: boolean;
  reversible: boolean;
  persistent: boolean;
  requiresRestart: boolean;
  currentValue: string;
  plannedChange: string;
  commandPreview: string;
};

export type AdvancedBlockedAction = {
  id: string;
  title: string;
  reason: string;
  method: AdvancedMethod;
  risk: AdvancedRisk;
  requiresAdmin: boolean;
  requiresExtreme: boolean;
};

export type AdvancedCatalog = {
  generatedAt: string;
  engineVersion: string;
  readOnly: boolean;
  willModifySystem: boolean;
  telemetry: boolean;
  residentProcess: boolean;
  actions: AdvancedAction[];
  blockedActions: AdvancedBlockedAction[];
  warnings: string[];
};

export type AdvancedApplyRequest = {
  confirmed: boolean;
  dryRun?: boolean;
  actionIds: string[];
  extremeMode?: boolean;
};

export type AdvancedApplyResult = {
  generatedAt: string;
  engineVersion: string;
  dryRun: boolean;
  snapshotId: string;
  rollbackAvailable: boolean;
  appliedActions: Array<{
    id: string;
    title: string;
    status: AdvancedActionStatus;
    message: string;
  }>;
  message: string;
};

export type AdvancedActionSummary = Record<AdvancedActionStatus, number> & {
  total: number;
};

export function summarizeAdvancedActionResults(
  result?: AdvancedApplyResult | null,
): AdvancedActionSummary {
  const summary: AdvancedActionSummary = {
    total: 0,
    dryRun: 0,
    applied: 0,
    skipped: 0,
    failed: 0,
  };

  for (const action of result?.appliedActions ?? []) {
    summary.total += 1;
    summary[action.status] += 1;
  }

  return summary;
}

export function formatAdvancedActionSummary(result?: AdvancedApplyResult | null): string {
  if (!result) {
    return "Advanced Engine indisponível";
  }

  const summary = summarizeAdvancedActionResults(result);
  if (summary.total === 0) {
    return result.dryRun ? "Nenhum comando validado" : "Nenhum comando aplicado";
  }

  const parts: string[] = [];
  if (summary.dryRun > 0) {
    parts.push(countLabel(summary.dryRun, "validado", "validados"));
  }
  if (summary.applied > 0) {
    parts.push(countLabel(summary.applied, "aplicado", "aplicados"));
  }
  if (summary.skipped > 0) {
    parts.push(countLabel(summary.skipped, "indisponível", "indisponíveis"));
  }
  if (summary.failed > 0) {
    parts.push(countLabel(summary.failed, "falha", "falhas"));
  }

  return parts.join(", ");
}

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export const fallbackAdvancedCatalog: AdvancedCatalog = {
  generatedAt: "0",
  engineVersion: "advanced-engine-fallback-v1",
  readOnly: true,
  willModifySystem: false,
  telemetry: false,
  residentProcess: false,
  actions: [],
  blockedActions: [],
  warnings: ["Advanced Engine real indisponível. Nenhum catálogo demonstrativo foi exibido."],
};

export async function loadAdvancedCatalog(): Promise<AdvancedCatalog> {
  const cached = readLocalReportCache<AdvancedCatalog>("advanced-catalog");
  if (cached) {
    return cached;
  }

  return refreshAdvancedCatalog();
}

export async function refreshAdvancedCatalog(): Promise<AdvancedCatalog> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return fallbackAdvancedCatalog;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const catalog = await invoke<AdvancedCatalog>("advanced_engine_catalog");
    return writeLocalReportCache("advanced-catalog", catalog);
  } catch (error) {
    console.warn("Advanced Engine indisponível, usando fallback local.", error);
    return fallbackAdvancedCatalog;
  }
}

export async function applyAdvancedActions(
  request: AdvancedApplyRequest,
): Promise<AdvancedApplyResult> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    throw new Error("Advanced Engine exige o backend Tauri.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<AdvancedApplyResult>("advanced_engine_apply", {
    request: forceSafeDryRun(request),
  });
}

export async function applyOptimizeNowAdvancedActions(
  request: AdvancedApplyRequest,
): Promise<AdvancedApplyResult> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    throw new Error("Advanced Engine exige o backend Tauri.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<AdvancedApplyResult>("advanced_engine_apply_optimize_now", {
    request: forceSafeDryRun(request),
  });
}

export async function applyOptimizeNowGraphicsPreference(
  executablePath: string,
  dryRun = false,
): Promise<AdvancedApplyResult> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    throw new Error("Advanced Engine exige o backend Tauri.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<AdvancedApplyResult>("advanced_set_graphics_high_performance_optimize_now", {
    executablePath,
    dryRun,
  });
}
