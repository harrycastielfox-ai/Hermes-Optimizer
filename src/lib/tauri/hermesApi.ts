import { cleanerCategories, diagnostics, logs, profiles, snapshots, startupApps, systemOverview, tweaks } from "../mock-data/hermesData";
import type {
  CleanerCategory,
  DiagnosticResult,
  HermesTweak,
  OptimizationLog,
  PerformanceProfile,
  RestoreSnapshot,
  StartupApp,
  SystemOverview,
} from "../types";
import { invokeSafe, type HermesApiResult } from "./invokeSafe";

type SnakeSystemOverview = {
  status: SystemOverview["status"];
  cpu_usage: number;
  ram_usage: number;
  disk_usage: number;
  free_space_gb: number;
  temp_files_estimate_mb: number;
  performance_mode: string;
  last_diagnostic: string;
};

type SnakeCleanerCategory = Omit<CleanerCategory, "estimatedSizeMb" | "safeToClean" | "requiresConfirmation" | "selected"> & {
  selected?: boolean;
  estimated_size_mb: number;
  safe_to_clean: boolean;
  requires_confirmation: boolean;
};

type SnakeStartupApp = Omit<StartupApp, "suggestedAction"> & { suggested_action: string };

type SnakeTweak = Omit<HermesTweak, "requiresAdmin"> & { requires_admin: boolean };

type SnakeLog = OptimizationLog;

type SnakeProfile = Omit<PerformanceProfile, "tweakCount" | "includedTweaks"> & {
  tweak_count: number;
  included_tweaks: string[];
};

type SnakeSnapshot = Omit<RestoreSnapshot, "profileApplied" | "tweaksApplied"> & {
  profile_applied: string;
  tweaks_applied: string[];
};

export type SimulationResult = {
  success: boolean;
  message: string;
  logId: string;
};

type SnakeSimulationResult = Omit<SimulationResult, "logId"> & { log_id: string };

function withMappedData<TInput, TOutput>(result: HermesApiResult<TInput>, mapper: (input: TInput) => TOutput): HermesApiResult<TOutput> {
  return { ...result, data: mapper(result.data) };
}

function mapOverview(input: SystemOverview | SnakeSystemOverview): SystemOverview {
  if ("cpuUsage" in input) return input;
  return {
    status: input.status,
    cpuUsage: input.cpu_usage,
    ramUsage: input.ram_usage,
    diskUsage: input.disk_usage,
    freeSpaceGb: input.free_space_gb,
    tempFilesEstimateMb: input.temp_files_estimate_mb,
    performanceMode: input.performance_mode,
    lastDiagnostic: input.last_diagnostic,
  };
}

function mapCleaner(input: CleanerCategory | SnakeCleanerCategory): CleanerCategory {
  if ("estimatedSizeMb" in input) return input;
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    estimatedSizeMb: input.estimated_size_mb,
    selected: input.selected ?? true,
    safeToClean: input.safe_to_clean,
    requiresConfirmation: input.requires_confirmation,
    reversible: input.reversible,
  };
}

function mapStartup(input: StartupApp | SnakeStartupApp): StartupApp {
  if ("suggestedAction" in input) return input;
  return { ...input, suggestedAction: input.suggested_action };
}

function mapTweak(input: HermesTweak | SnakeTweak): HermesTweak {
  if ("requiresAdmin" in input) return input;
  return { ...input, requiresAdmin: input.requires_admin };
}

function mapProfile(input: PerformanceProfile | SnakeProfile): PerformanceProfile {
  if ("tweakCount" in input) return input;
  return { ...input, tweakCount: input.tweak_count, includedTweaks: input.included_tweaks };
}

function mapSnapshot(input: RestoreSnapshot | SnakeSnapshot): RestoreSnapshot {
  if ("profileApplied" in input) return input;
  return { ...input, profileApplied: input.profile_applied, tweaksApplied: input.tweaks_applied };
}

function mapSimulation(input: SimulationResult | SnakeSimulationResult): SimulationResult {
  if ("logId" in input) return input;
  return { success: input.success, message: input.message, logId: input.log_id };
}

export async function getSystemOverview() {
  const result = await invokeSafe<SystemOverview | SnakeSystemOverview>("get_system_overview", undefined, systemOverview);
  return withMappedData(result, mapOverview);
}

export async function runDiagnostics() {
  const result = await invokeSafe<DiagnosticResult[]>("run_diagnostics", undefined, diagnostics);
  return result;
}

export async function scanTempFiles() {
  const result = await invokeSafe<Array<CleanerCategory | SnakeCleanerCategory>>("scan_temp_files", undefined, cleanerCategories);
  return withMappedData(result, (items) => items.map(mapCleaner));
}

export async function listStartupApps() {
  const result = await invokeSafe<Array<StartupApp | SnakeStartupApp>>("list_startup_apps", undefined, startupApps);
  return withMappedData(result, (items) => items.map(mapStartup));
}

export async function listAvailableTweaks() {
  const result = await invokeSafe<Array<HermesTweak | SnakeTweak>>("list_available_tweaks", undefined, tweaks);
  return withMappedData(result, (items) => items.map(mapTweak));
}

export async function simulateApplyTweak(tweakId: string) {
  const result = await invokeSafe<SimulationResult | SnakeSimulationResult>("simulate_apply_tweak", { request: { id: tweakId } });
  return withMappedData(result, mapSimulation);
}

export async function listPerformanceProfiles() {
  const result = await invokeSafe<Array<PerformanceProfile | SnakeProfile>>("list_performance_profiles", undefined, profiles);
  return withMappedData(result, (items) => items.map(mapProfile));
}

export async function simulateApplyProfile(profileId: PerformanceProfile["id"]) {
  const result = await invokeSafe<SimulationResult | SnakeSimulationResult>("simulate_apply_profile", { request: { id: profileId } });
  return withMappedData(result, mapSimulation);
}

export async function listLogs() {
  const result = await invokeSafe<OptimizationLog[] | SnakeLog[]>("list_logs", undefined, logs);
  return result as HermesApiResult<OptimizationLog[]>;
}

export async function createRestoreSnapshot(reason: string) {
  const result = await invokeSafe<RestoreSnapshot | SnakeSnapshot>("create_restore_snapshot", { request: { reason } }, snapshots[0]);
  return withMappedData(result, mapSnapshot);
}

export async function simulateRestoreSnapshot(snapshotId: string) {
  const result = await invokeSafe<RestoreSnapshot | SnakeSnapshot>("simulate_restore_snapshot", { request: { snapshot_id: snapshotId } }, snapshots[0]);
  return withMappedData(result, mapSnapshot);
}
