import { invoke } from "@tauri-apps/api/core";
import { benchmarkResult, cleanerCategories, diagnostics, logs, profiles, snapshots, startupApps, systemOverview, tweaks } from "../mock-data/hermesData";
import type { BenchmarkResult, CleanerCategory, DiagnosticReport, DiagnosticResult, HardwareInfo, HermesTweak, OptimizationLog, PerformanceProfile, RestoreSnapshot, StartupApp, SystemOverview } from "../types";

type MockRegistry = {
  run_light_benchmark: BenchmarkResult;
  get_last_benchmark_result: BenchmarkResult | null;
  get_system_overview: SystemOverview;
  run_diagnostics: DiagnosticResult[];
  get_hardware_info: HardwareInfo;
  get_diagnostic_report: DiagnosticReport;
  scan_temp_files: CleanerCategory[];
  list_startup_apps: StartupApp[];
  list_available_tweaks: HermesTweak[];
  list_performance_profiles: PerformanceProfile[];
  list_logs: OptimizationLog[];
  create_restore_snapshot: RestoreSnapshot;
  simulate_restore_snapshot: RestoreSnapshot;
  simulate_apply_tweak: { success: boolean; message: string; logId: string };
  simulate_apply_profile: { success: boolean; message: string; logId: string };
};

export type HermesCommand = keyof MockRegistry;

export type HermesApiResult<T> = {
  data: T;
  error?: string;
  fallback: boolean;
};

const mockRegistry: MockRegistry = {
  run_light_benchmark: benchmarkResult,
  get_last_benchmark_result: null,
  get_system_overview: systemOverview,
  run_diagnostics: diagnostics,
  get_hardware_info: {
    os: { computerName: systemOverview.computerName, name: systemOverview.operatingSystem, version: systemOverview.windowsVersion, build: "Mock", architecture: systemOverview.architecture, uptimeSeconds: systemOverview.uptimeSeconds },
    cpu: { name: systemOverview.cpuName, manufacturer: "Mock", frequencyMhz: 0, baseFrequencyMhz: 0, maxFrequencyMhz: 0, cores: systemOverview.cpuCores, physicalCores: systemOverview.cpuCores, threads: systemOverview.cpuCores, logicalProcessors: systemOverview.cpuCores, architecture: systemOverview.architecture, usagePercent: systemOverview.cpuUsage },
    memory: { totalBytes: systemOverview.ramTotalGb * 1024 ** 3, usedBytes: systemOverview.ramUsedGb * 1024 ** 3, freeBytes: systemOverview.ramFreeGb * 1024 ** 3, availableBytes: systemOverview.ramFreeGb * 1024 ** 3, usagePercent: systemOverview.ramUsage, moduleCount: 2, slotCount: 4, speedMhz: 3200 },
    disks: [{ name: systemOverview.diskName, driveLetter: systemOverview.diskName, model: "Mock fallback", mediaType: "SSD", totalBytes: systemOverview.diskTotalGb * 1024 ** 3, usedBytes: systemOverview.diskUsedGb * 1024 ** 3, freeBytes: systemOverview.diskFreeGb * 1024 ** 3, usagePercent: systemOverview.diskUsage, isPrimary: true }],
    gpu: { name: systemOverview.gpuName, manufacturer: "Mock", dedicatedMemoryBytes: systemOverview.gpuMemoryGb * 1024 ** 3, driverVersion: "Mock", status: "OK", detected: systemOverview.gpuDetected },
    gpuReady: systemOverview.gpuDetected,
    dataSource: "Fallback mock do frontend",
    safetyNote: "Fallback local; nenhuma alteração no Windows.",
  },
  get_diagnostic_report: {
    summary: "Foram encontrados pontos simulados que podem ser melhorados.",
    health: { score: systemOverview.healthScore, label: systemOverview.healthLabel, reasons: ["Fallback mock do frontend"], performanceScore: systemOverview.performanceScore, stabilityScore: systemOverview.stabilityScore, storageScore: systemOverview.storageScore, gamingReadinessScore: systemOverview.gamingReadinessScore },
    problems: diagnostics.filter((item) => item.status !== "ok"),
    recommendations: diagnostics.filter((item) => item.status !== "ok").map((item) => item.recommendation),
  },
  scan_temp_files: cleanerCategories,
  list_startup_apps: startupApps,
  list_available_tweaks: tweaks,
  list_performance_profiles: profiles,
  list_logs: logs,
  create_restore_snapshot: snapshots[0],
  simulate_restore_snapshot: { ...snapshots[0], status: "restored" },
  simulate_apply_tweak: { success: true, message: "Tweak simulado via fallback web. Nenhuma alteração real foi aplicada.", logId: "fallback-tweak" },
  simulate_apply_profile: { success: true, message: "Perfil simulado via fallback web com snapshot lógico.", logId: "fallback-profile" },
};

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function friendlyError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Não foi possível comunicar com o engine Hermes agora. Usando dados seguros simulados.";
}

/**
 * Safe invoke gateway for Hermes Optimizer.
 *
 * This file is the only intended bridge between the React UI and the Hermes
 * Tauri/Rust engine. Future real actions must be validated by the backend and
 * must include explicit confirmation, transparent logs and rollback planning.
 * The frontend must never execute OS commands directly.
 */
export async function invokeSafe<T>(command: HermesCommand, args?: Record<string, unknown>, fallback?: T): Promise<HermesApiResult<T>> {
  const fallbackData = (fallback ?? mockRegistry[command]) as T;

  if (!isTauriRuntime()) {
    return { data: fallbackData, fallback: true };
  }

  try {
    const data = await invoke<T>(command, args);
    return { data, fallback: false };
  } catch (error) {
    return {
      data: fallbackData,
      error: friendlyError(error),
      fallback: true,
    };
  }
}
