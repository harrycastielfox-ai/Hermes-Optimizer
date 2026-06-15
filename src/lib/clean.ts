import { forceSafeDryRun } from "@/lib/safe-mode";
import { readLocalReportCache, writeLocalReportCache } from "@/lib/local-read-cache";

export type CleanScanItem = {
  id: string;
  label: string;
  description: string;
  estimatedBytes: number;
  estimatedGb: number;
  paths: string[];
  selectedByDefault: boolean;
  safeToCleanLater: boolean;
};

export type CleanScanReport = {
  generatedAt: string;
  engineVersion: string;
  readOnly: boolean;
  willDeleteFiles: boolean;
  totalBytes: number;
  totalGb: number;
  items: CleanScanItem[];
  protectedLocations: string[];
  warnings: string[];
};

export type CleanApplyActionStatus = "dryRun" | "quarantined" | "skipped" | "failed";
export type CleanQuarantinePurgeStatus = "dryRun" | "purged" | "skipped" | "failed";

export type CleanApplyRequest = {
  confirmed: boolean;
  dryRun?: boolean;
  itemIds?: string[];
};

export type CleanQuarantinePurgeRequest = {
  confirmed: boolean;
  dryRun?: boolean;
};

export type CleanApplyResult = {
  generatedAt: string;
  engineVersion: string;
  dryRun: boolean;
  snapshotId: string;
  rollbackAvailable: boolean;
  selectedItems: number;
  plannedEntries: number;
  quarantinedEntries: number;
  skippedEntries: number;
  failedEntries: number;
  quarantinedBytes: number;
  quarantinedGb: number;
  purgedQuarantineEntries: number;
  purgedQuarantineBytes: number;
  quarantineRetentionDays: number;
  message: string;
  actions: Array<{
    itemId: string;
    originalPath: string;
    backupPath?: string;
    bytes: number;
    status: CleanApplyActionStatus;
    message: string;
  }>;
  warnings: string[];
};

export type CleanQuarantinePurgeResult = {
  generatedAt: string;
  engineVersion: string;
  dryRun: boolean;
  confirmed: boolean;
  retentionDays: number;
  scannedEntries: number;
  purgedEntries: number;
  skippedEntries: number;
  failedEntries: number;
  purgedBytes: number;
  purgedGb: number;
  message: string;
  actions: Array<{
    path: string;
    bytes: number;
    status: CleanQuarantinePurgeStatus;
    message: string;
  }>;
  warnings: string[];
};

export const fallbackCleanScanReport: CleanScanReport = {
  generatedAt: "0",
  engineVersion: "clean-engine-fallback-v1",
  readOnly: true,
  willDeleteFiles: false,
  totalBytes: 4939212390,
  totalGb: 4.6,
  items: [
    fallbackItem("temp", "TEMP", "Arquivos temporarios do usuario e Windows", 1.4),
    fallbackItem("cache", "Cache", "Caches seguros de apps e navegadores", 0.9),
    fallbackItem("logs", "Logs", "Logs antigos do sistema", 0.4),
    fallbackItem("thumbnails", "Miniaturas", "Cache de miniaturas do Explorer", 0.2),
    fallbackItem(
      "windows-update-cache",
      "Windows Update Cache",
      "Pacotes baixados pelo Windows Update",
      1.7,
    ),
  ],
  protectedLocations: ["Downloads", "Documentos", "Desktop", "Imagens", "Videos"],
  warnings: [],
};

export async function loadCleanScanReport(): Promise<CleanScanReport> {
  const cached = readLocalReportCache<CleanScanReport>("clean-scan");
  if (cached) {
    return cached;
  }

  return refreshCleanScanReport();
}

export async function refreshCleanScanReport(): Promise<CleanScanReport> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return fallbackCleanScanReport;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const report = await invoke<CleanScanReport>("clean_engine_scan");
    return writeLocalReportCache("clean-scan", report);
  } catch (error) {
    console.warn("Clean Engine Scan indisponivel, usando fallback local.", error);
    return fallbackCleanScanReport;
  }
}

export async function applyCleanEngine(request: CleanApplyRequest): Promise<CleanApplyResult> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    throw new Error("Clean Engine real exige o backend Tauri.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<CleanApplyResult>("clean_engine_apply", {
    request: forceSafeDryRun(request),
  });
}

export async function applyOptimizeNowCleanEngine(
  request: CleanApplyRequest,
): Promise<CleanApplyResult> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    throw new Error("Clean Engine real exige o backend Tauri.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<CleanApplyResult>("clean_engine_apply_optimize_now", { request });
}

export async function purgeExpiredCleanQuarantine(
  request: CleanQuarantinePurgeRequest = { confirmed: false, dryRun: true },
): Promise<CleanQuarantinePurgeResult> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    throw new Error("Limpeza da quarentena exige o backend Tauri.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<CleanQuarantinePurgeResult>("clean_quarantine_purge_expired", {
    request: forceSafeDryRun(request),
  });
}

function fallbackItem(id: string, label: string, description: string, gb: number): CleanScanItem {
  const estimatedBytes = Math.round(gb * 1024 * 1024 * 1024);
  return {
    id,
    label,
    description,
    estimatedBytes,
    estimatedGb: gb,
    paths: [],
    selectedByDefault: true,
    safeToCleanLater: true,
  };
}
