import { cleanerCategories, diagnostics, logs, profiles, snapshots, startupApps, systemOverview, tweaks } from "../mock-data/hermesData";
import type { CleanerCategory, DiagnosticResult, HermesTweak, OptimizationLog, PerformanceProfile, RestoreSnapshot, StartupApp, SystemOverview } from "../types";

type MockRegistry = {
  get_system_overview: SystemOverview;
  run_diagnostics: DiagnosticResult[];
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
  get_system_overview: systemOverview,
  run_diagnostics: diagnostics,
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
    const { invoke } = await import("@tauri-apps/api/core");
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
