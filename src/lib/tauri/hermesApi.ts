import { cleanerCategories, diagnostics, logs, profiles, snapshots, startupApps, systemOverview, tweaks } from "../mock-data/hermesData";
import type {
  CleanerCategory,
  DiagnosticReport,
  DiagnosticResult,
  HardwareInfo,
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
  computer_name: string;
  operating_system: string;
  windows_version: string;
  architecture: string;
  uptime_seconds: number;
  cpu_name: string;
  cpu_cores: number;
  ram_total_gb: number;
  ram_used_gb: number;
  ram_free_gb: number;
  disk_name: string;
  disk_total_gb: number;
  disk_used_gb: number;
  disk_free_gb: number;
  health_score: number;
  health_label: string;
};

type SnakeCleanerCategory = Omit<CleanerCategory, "estimatedSizeMb" | "safeToClean" | "requiresConfirmation" | "selected"> & {
  selected?: boolean;
  estimated_size_mb: number;
  safe_to_clean: boolean;
  requires_confirmation: boolean;
};

type SnakeStartupApp = Omit<StartupApp, "suggestedAction"> & { suggested_action: string };

type SnakeTweak = Omit<HermesTweak, "requiresAdmin" | "reversalPlan"> & { requires_admin: boolean; reversal_plan?: string };


type SnakeHardwareInfo = {
  os: { computer_name: string; name: string; version: string; build: string; architecture: string; uptime_seconds: number };
  cpu: { name: string; frequency_mhz: number; cores: number; threads: number; usage_percent: number };
  memory: { total_bytes: number; used_bytes: number; free_bytes: number; usage_percent: number };
  disks: Array<{ name: string; model: string; total_bytes: number; used_bytes: number; free_bytes: number; usage_percent: number; is_primary: boolean }>;
  gpu_ready: boolean;
  data_source: string;
};

type SnakeDiagnosticReport = Omit<DiagnosticReport, "health"> & { health: DiagnosticReport["health"] };

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
    computerName: input.computer_name,
    operatingSystem: input.operating_system,
    windowsVersion: input.windows_version,
    architecture: input.architecture,
    uptimeSeconds: input.uptime_seconds,
    cpuName: input.cpu_name,
    cpuCores: input.cpu_cores,
    ramTotalGb: input.ram_total_gb,
    ramUsedGb: input.ram_used_gb,
    ramFreeGb: input.ram_free_gb,
    diskName: input.disk_name,
    diskTotalGb: input.disk_total_gb,
    diskUsedGb: input.disk_used_gb,
    diskFreeGb: input.disk_free_gb,
    healthScore: input.health_score,
    healthLabel: input.health_label,
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
  return { ...input, requiresAdmin: input.requires_admin, reversalPlan: input.reversal_plan ?? "Reversão documentada antes de qualquer aplicação real." };
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

function mapHardware(input: HardwareInfo | SnakeHardwareInfo): HardwareInfo {
  if ("gpuReady" in input) return input;
  return {
    os: { computerName: input.os.computer_name, name: input.os.name, version: input.os.version, build: input.os.build, architecture: input.os.architecture, uptimeSeconds: input.os.uptime_seconds },
    cpu: { name: input.cpu.name, frequencyMhz: input.cpu.frequency_mhz, cores: input.cpu.cores, threads: input.cpu.threads, usagePercent: input.cpu.usage_percent },
    memory: { totalBytes: input.memory.total_bytes, usedBytes: input.memory.used_bytes, freeBytes: input.memory.free_bytes, usagePercent: input.memory.usage_percent },
    disks: input.disks.map((disk) => ({ name: disk.name, model: disk.model, totalBytes: disk.total_bytes, usedBytes: disk.used_bytes, freeBytes: disk.free_bytes, usagePercent: disk.usage_percent, isPrimary: disk.is_primary })),
    gpuReady: input.gpu_ready,
    dataSource: input.data_source,
  };
}

export async function getSystemOverview() {
  const result = await invokeSafe<SystemOverview | SnakeSystemOverview>("get_system_overview", undefined, systemOverview);
  return withMappedData(result, mapOverview);
}

export async function runDiagnostics() {
  const result = await invokeSafe<DiagnosticResult[]>("run_diagnostics", undefined, diagnostics);
  return result;
}

export async function getHardwareInfo() {
  const fallback: HardwareInfo = {
    os: { computerName: systemOverview.computerName, name: systemOverview.operatingSystem, version: systemOverview.windowsVersion, build: "Mock", architecture: systemOverview.architecture, uptimeSeconds: systemOverview.uptimeSeconds },
    cpu: { name: systemOverview.cpuName, frequencyMhz: 0, cores: systemOverview.cpuCores, threads: systemOverview.cpuCores, usagePercent: systemOverview.cpuUsage },
    memory: { totalBytes: systemOverview.ramTotalGb * 1024 ** 3, usedBytes: systemOverview.ramUsedGb * 1024 ** 3, freeBytes: systemOverview.ramFreeGb * 1024 ** 3, usagePercent: systemOverview.ramUsage },
    disks: [{ name: systemOverview.diskName, model: "Mock fallback", totalBytes: systemOverview.diskTotalGb * 1024 ** 3, usedBytes: systemOverview.diskUsedGb * 1024 ** 3, freeBytes: systemOverview.diskFreeGb * 1024 ** 3, usagePercent: systemOverview.diskUsage, isPrimary: true }],
    gpuReady: true,
    dataSource: "Fallback mock do frontend",
  };
  const result = await invokeSafe<HardwareInfo | SnakeHardwareInfo>("get_hardware_info", undefined, fallback);
  return withMappedData(result, mapHardware);
}

export async function getDiagnosticReport() {
  const fallback: DiagnosticReport = {
    summary: "Foram encontrados pontos simulados que podem ser melhorados.",
    health: { score: systemOverview.healthScore, label: systemOverview.healthLabel, reasons: ["Fallback mock do frontend"] },
    problems: diagnostics.filter((item) => item.status !== "ok"),
    recommendations: diagnostics.filter((item) => item.status !== "ok").map((item) => item.recommendation),
  };
  const result = await invokeSafe<DiagnosticReport | SnakeDiagnosticReport>("get_diagnostic_report", undefined, fallback);
  return result as HermesApiResult<DiagnosticReport>;
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
