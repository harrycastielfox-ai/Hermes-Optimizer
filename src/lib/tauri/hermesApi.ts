import { benchmarkResult, cleanerCategories, diagnostics, logs, profiles, snapshots, startupApps, systemOverview, tweaks } from "../mock-data/hermesData";
import type {
  BenchmarkResult,
  CleanerCategory,
  DiagnosticReport,
  DiagnosticResult,
  HardwareInfo,
  BenchmarkHistoryEntry,
  DiagnosticHistoryEntry,
  HistoryComparison,
  HistoryLogEntry,
  HistoryOverview,
  SnapshotHistoryEntry,
  HermesTweak,
  OptimizationLog,
  PerformanceProfile,
  RestoreSnapshot,
  StartupApp,
  SystemOverview,
} from "../types";
import { invokeSafe, type HermesApiResult } from "./invokeSafe";


type SnakeBenchmarkHistoryEntry = Omit<BenchmarkHistoryEntry, "overallScore" | "cpuScore" | "ramScore" | "diskScore" | "gpuScore" | "gamingReadiness"> & {
  overall_score: number;
  cpu_score: number;
  ram_score: number;
  disk_score: number;
  gpu_score: number;
  gaming_readiness: number;
};

type SnakeDiagnosticHistoryEntry = Omit<DiagnosticHistoryEntry, "healthScore" | "issuesCount" | "recommendationsCount"> & {
  health_score: number;
  issues_count: number;
  recommendations_count: number;
};

type SnakeSnapshotHistoryEntry = Omit<SnapshotHistoryEntry, "hardwareSummary"> & { hardware_summary: string };

type SnakeHistoryComparison = Omit<HistoryComparison, "currentScore" | "previousScore"> & {
  current_score: number;
  previous_score: number;
};

type SnakeHistoryOverview = Omit<HistoryOverview, "databasePath" | "localOnly" | "benchmarkComparison" | "diagnosticComparison" | "advisorInsights" | "benchmarks" | "diagnostics" | "snapshots"> & {
  database_path: string;
  local_only: boolean;
  benchmarks: SnakeBenchmarkHistoryEntry[];
  diagnostics: SnakeDiagnosticHistoryEntry[];
  snapshots: SnakeSnapshotHistoryEntry[];
  benchmark_comparison?: SnakeHistoryComparison | null;
  diagnostic_comparison?: SnakeHistoryComparison | null;
  advisor_insights: string[];
};

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
  gpu_detected: boolean;
  gpu_name: string;
  gpu_memory_gb: number;
  health_score: number;
  health_label: string;
  performance_score: number;
  stability_score: number;
  storage_score: number;
  gaming_readiness_score: number;
};

type SnakeCleanerCategory = Omit<CleanerCategory, "estimatedSizeMb" | "safeToClean" | "requiresConfirmation" | "selected"> & {
  selected?: boolean;
  estimated_size_mb: number;
  safe_to_clean: boolean;
  requires_confirmation: boolean;
};

type SnakeStartupApp = Omit<StartupApp, "suggestedAction"> & { suggested_action: string };

type SnakeTweak = Omit<HermesTweak, "requiresAdmin" | "reversalPlan"> & { requires_admin: boolean; reversal_plan?: string };


type SnakeHealthScore = Omit<DiagnosticReport["health"], "performanceScore" | "stabilityScore" | "storageScore" | "gamingReadinessScore"> & {
  performance_score: number;
  stability_score: number;
  storage_score: number;
  gaming_readiness_score: number;
};

type SnakeHardwareInfo = {
  os: { computer_name: string; name: string; version: string; build: string; architecture: string; uptime_seconds: number };
  cpu: { name: string; manufacturer: string; frequency_mhz: number; base_frequency_mhz: number; max_frequency_mhz: number; cores: number; physical_cores: number; threads: number; logical_processors: number; architecture: string; usage_percent: number };
  memory: { total_bytes: number; used_bytes: number; free_bytes: number; available_bytes: number; usage_percent: number; module_count: number; slot_count: number; speed_mhz: number };
  disks: Array<{ name: string; drive_letter: string; model: string; media_type: string; total_bytes: number; used_bytes: number; free_bytes: number; usage_percent: number; is_primary: boolean }>;
  gpu?: { name: string; manufacturer: string; dedicated_memory_bytes: number; driver_version: string; status: string; detected: boolean } | null;
  gpu_ready: boolean;
  data_source: string;
  safety_note: string;
};

type SnakeDiagnosticReport = Omit<DiagnosticReport, "health"> & { health: DiagnosticReport["health"] | SnakeHealthScore };

type SnakeCpuBenchmark = Omit<BenchmarkResult["cpu"], "elapsedMs"> & { elapsed_ms: number };
type SnakeMemoryBenchmark = Omit<BenchmarkResult["memory"], "elapsedMs" | "testedMb" | "throughputMbS"> & { elapsed_ms: number; tested_mb: number; throughput_mb_s: number };
type SnakeDiskBenchmark = Omit<BenchmarkResult["disk"], "elapsedMs" | "testedMb" | "writeMs" | "readMs" | "writeMbS" | "readMbS"> & { elapsed_ms: number; tested_mb: number; write_ms: number; read_ms: number; write_mb_s: number; read_mb_s: number };
type SnakeGpuBenchmark = Omit<BenchmarkResult["gpu"], "dedicatedMemoryMb" | "readinessScore"> & { dedicated_memory_mb: number; readiness_score: number };
type SnakeBenchmarkScore = Omit<BenchmarkResult["score"], "cpuScore" | "memoryScore" | "diskScore" | "gpuReadinessScore" | "overallScore" | "gamingReadinessScore" | "stabilityScore"> & { cpu_score: number; memory_score: number; disk_score: number; gpu_readiness_score: number; overall_score: number; gaming_readiness_score: number; stability_score: number };
type SnakeHardwareSnapshot = Omit<BenchmarkResult["hardwareSnapshot"], "cpuName" | "cpuThreads" | "memoryTotalGb" | "primaryDisk" | "gpuName" | "gpuDetected" | "gpuMemoryMb" | "dataSource"> & { cpu_name: string; cpu_threads: number; memory_total_gb: number; primary_disk: string; gpu_name: string; gpu_detected: boolean; gpu_memory_mb: number; data_source: string };
type SnakeBenchmarkResult = Omit<BenchmarkResult, "hardwareSnapshot" | "safetyNote" | "dataSource" | "cpu" | "memory" | "disk" | "gpu" | "score"> & { cpu: SnakeCpuBenchmark; memory: SnakeMemoryBenchmark; disk: SnakeDiskBenchmark; gpu: SnakeGpuBenchmark; score: SnakeBenchmarkScore; hardware_snapshot: SnakeHardwareSnapshot; safety_note: string; data_source: string };

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


function mapBenchmarkHistory(input: BenchmarkHistoryEntry | SnakeBenchmarkHistoryEntry): BenchmarkHistoryEntry {
  if ("overallScore" in input) return input;
  return { id: input.id, timestamp: input.timestamp, overallScore: input.overall_score, cpuScore: input.cpu_score, ramScore: input.ram_score, diskScore: input.disk_score, gpuScore: input.gpu_score, gamingReadiness: input.gaming_readiness, summary: input.summary };
}

function mapDiagnosticHistory(input: DiagnosticHistoryEntry | SnakeDiagnosticHistoryEntry): DiagnosticHistoryEntry {
  if ("healthScore" in input) return input;
  return { id: input.id, timestamp: input.timestamp, healthScore: input.health_score, issuesCount: input.issues_count, recommendationsCount: input.recommendations_count, summary: input.summary };
}

function mapSnapshotHistory(input: SnapshotHistoryEntry | SnakeSnapshotHistoryEntry): SnapshotHistoryEntry {
  if ("hardwareSummary" in input) return input;
  return { id: input.id, timestamp: input.timestamp, name: input.name, description: input.description, hardwareSummary: input.hardware_summary };
}

function mapHistoryComparison(input: HistoryComparison | SnakeHistoryComparison | null | undefined): HistoryComparison | null {
  if (!input) return null;
  if ("currentScore" in input) return input;
  return { currentScore: input.current_score, previousScore: input.previous_score, delta: input.delta, direction: input.direction, message: input.message };
}

function mapHistoryOverview(input: HistoryOverview | SnakeHistoryOverview): HistoryOverview {
  if ("databasePath" in input) return input;
  return {
    databasePath: input.database_path,
    localOnly: input.local_only,
    benchmarks: input.benchmarks.map(mapBenchmarkHistory),
    diagnostics: input.diagnostics.map(mapDiagnosticHistory),
    logs: input.logs,
    snapshots: input.snapshots.map(mapSnapshotHistory),
    benchmarkComparison: mapHistoryComparison(input.benchmark_comparison),
    diagnosticComparison: mapHistoryComparison(input.diagnostic_comparison),
    advisorInsights: input.advisor_insights,
  };
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
    gpuDetected: input.gpu_detected,
    gpuName: input.gpu_name,
    gpuMemoryGb: input.gpu_memory_gb,
    healthScore: input.health_score,
    healthLabel: input.health_label,
    performanceScore: input.performance_score,
    stabilityScore: input.stability_score,
    storageScore: input.storage_score,
    gamingReadinessScore: input.gaming_readiness_score,
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

function mapHealth(input: DiagnosticReport["health"] | SnakeHealthScore): DiagnosticReport["health"] {
  if ("performanceScore" in input) return input;
  return {
    score: input.score,
    label: input.label,
    reasons: input.reasons,
    performanceScore: input.performance_score,
    stabilityScore: input.stability_score,
    storageScore: input.storage_score,
    gamingReadinessScore: input.gaming_readiness_score,
  };
}

function mapHardware(input: HardwareInfo | SnakeHardwareInfo): HardwareInfo {
  if ("gpuReady" in input) return input;
  return {
    os: { computerName: input.os.computer_name, name: input.os.name, version: input.os.version, build: input.os.build, architecture: input.os.architecture, uptimeSeconds: input.os.uptime_seconds },
    cpu: { name: input.cpu.name, manufacturer: input.cpu.manufacturer, frequencyMhz: input.cpu.frequency_mhz, baseFrequencyMhz: input.cpu.base_frequency_mhz, maxFrequencyMhz: input.cpu.max_frequency_mhz, cores: input.cpu.cores, physicalCores: input.cpu.physical_cores, threads: input.cpu.threads, logicalProcessors: input.cpu.logical_processors, architecture: input.cpu.architecture, usagePercent: input.cpu.usage_percent },
    memory: { totalBytes: input.memory.total_bytes, usedBytes: input.memory.used_bytes, freeBytes: input.memory.free_bytes, availableBytes: input.memory.available_bytes, usagePercent: input.memory.usage_percent, moduleCount: input.memory.module_count, slotCount: input.memory.slot_count, speedMhz: input.memory.speed_mhz },
    disks: input.disks.map((disk) => ({ name: disk.name, driveLetter: disk.drive_letter, model: disk.model, mediaType: disk.media_type, totalBytes: disk.total_bytes, usedBytes: disk.used_bytes, freeBytes: disk.free_bytes, usagePercent: disk.usage_percent, isPrimary: disk.is_primary })),
    gpu: input.gpu ? { name: input.gpu.name, manufacturer: input.gpu.manufacturer, dedicatedMemoryBytes: input.gpu.dedicated_memory_bytes, driverVersion: input.gpu.driver_version, status: input.gpu.status, detected: input.gpu.detected } : null,
    gpuReady: input.gpu_ready,
    dataSource: input.data_source,
    safetyNote: input.safety_note,
  };
}


function mapBenchmark(input: BenchmarkResult | SnakeBenchmarkResult): BenchmarkResult {
  if ("hardwareSnapshot" in input) return input;
  return {
    id: input.id,
    timestamp: input.timestamp,
    cpu: { elapsedMs: input.cpu.elapsed_ms, iterations: input.cpu.iterations, score: input.cpu.score, classification: input.cpu.classification, details: input.cpu.details },
    memory: { elapsedMs: input.memory.elapsed_ms, testedMb: input.memory.tested_mb, throughputMbS: input.memory.throughput_mb_s, score: input.memory.score, classification: input.memory.classification, details: input.memory.details },
    disk: { elapsedMs: input.disk.elapsed_ms, testedMb: input.disk.tested_mb, writeMs: input.disk.write_ms, readMs: input.disk.read_ms, writeMbS: input.disk.write_mb_s, readMbS: input.disk.read_mb_s, score: input.disk.score, classification: input.disk.classification, details: input.disk.details },
    gpu: { detected: input.gpu.detected, name: input.gpu.name, dedicatedMemoryMb: input.gpu.dedicated_memory_mb, readinessScore: input.gpu.readiness_score, classification: input.gpu.classification, details: input.gpu.details },
    score: { cpuScore: input.score.cpu_score, memoryScore: input.score.memory_score, diskScore: input.score.disk_score, gpuReadinessScore: input.score.gpu_readiness_score, overallScore: input.score.overall_score, gamingReadinessScore: input.score.gaming_readiness_score, stabilityScore: input.score.stability_score, classification: input.score.classification, explanation: input.score.explanation },
    recommendations: input.recommendations,
    summary: input.summary,
    hardwareSnapshot: { cpuName: input.hardware_snapshot.cpu_name, cpuThreads: input.hardware_snapshot.cpu_threads, memoryTotalGb: input.hardware_snapshot.memory_total_gb, primaryDisk: input.hardware_snapshot.primary_disk, gpuName: input.hardware_snapshot.gpu_name, gpuDetected: input.hardware_snapshot.gpu_detected, gpuMemoryMb: input.hardware_snapshot.gpu_memory_mb, dataSource: input.hardware_snapshot.data_source },
    safetyNote: input.safety_note,
    dataSource: input.data_source,
  };
}


export async function runLightBenchmark() {
  const result = await invokeSafe<BenchmarkResult | SnakeBenchmarkResult>("run_light_benchmark", undefined, benchmarkResult);
  return withMappedData(result, mapBenchmark);
}

export async function getLastBenchmarkResult() {
  const result = await invokeSafe<BenchmarkResult | SnakeBenchmarkResult | null>("get_last_benchmark_result", undefined, null);
  if (!result.data) return result as HermesApiResult<BenchmarkResult | null>;
  return withMappedData(result as HermesApiResult<BenchmarkResult | SnakeBenchmarkResult>, mapBenchmark);
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
    cpu: { name: systemOverview.cpuName, manufacturer: "Mock", frequencyMhz: 0, baseFrequencyMhz: 0, maxFrequencyMhz: 0, cores: systemOverview.cpuCores, physicalCores: systemOverview.cpuCores, threads: systemOverview.cpuCores, logicalProcessors: systemOverview.cpuCores, architecture: systemOverview.architecture, usagePercent: systemOverview.cpuUsage },
    memory: { totalBytes: systemOverview.ramTotalGb * 1024 ** 3, usedBytes: systemOverview.ramUsedGb * 1024 ** 3, freeBytes: systemOverview.ramFreeGb * 1024 ** 3, availableBytes: systemOverview.ramFreeGb * 1024 ** 3, usagePercent: systemOverview.ramUsage, moduleCount: 2, slotCount: 4, speedMhz: 3200 },
    disks: [{ name: systemOverview.diskName, driveLetter: systemOverview.diskName, model: "Mock fallback", mediaType: "SSD", totalBytes: systemOverview.diskTotalGb * 1024 ** 3, usedBytes: systemOverview.diskUsedGb * 1024 ** 3, freeBytes: systemOverview.diskFreeGb * 1024 ** 3, usagePercent: systemOverview.diskUsage, isPrimary: true }],
    gpu: { name: systemOverview.gpuName, manufacturer: "Mock", dedicatedMemoryBytes: systemOverview.gpuMemoryGb * 1024 ** 3, driverVersion: "Mock", status: "OK", detected: systemOverview.gpuDetected },
    gpuReady: systemOverview.gpuDetected,
    dataSource: "Fallback mock do frontend",
    safetyNote: "Fallback local; nenhuma alteração no Windows.",
  };
  const result = await invokeSafe<HardwareInfo | SnakeHardwareInfo>("get_hardware_info", undefined, fallback);
  return withMappedData(result, mapHardware);
}

export async function getDiagnosticReport() {
  const fallback: DiagnosticReport = {
    summary: "Foram encontrados pontos simulados que podem ser melhorados.",
    health: { score: systemOverview.healthScore, label: systemOverview.healthLabel, reasons: ["Fallback mock do frontend"], performanceScore: systemOverview.performanceScore, stabilityScore: systemOverview.stabilityScore, storageScore: systemOverview.storageScore, gamingReadinessScore: systemOverview.gamingReadinessScore },
    problems: diagnostics.filter((item) => item.status !== "ok"),
    recommendations: diagnostics.filter((item) => item.status !== "ok").map((item) => item.recommendation),
  };
  const result = await invokeSafe<DiagnosticReport | SnakeDiagnosticReport>("get_diagnostic_report", undefined, fallback);
  return withMappedData(result, (report) => ({ ...report, health: mapHealth(report.health) }));
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

export async function getHistoryOverview() {
  const fallback: HistoryOverview = { databasePath: "Local indisponível no fallback", localOnly: true, benchmarks: [], diagnostics: [], logs: [], snapshots: [], benchmarkComparison: null, diagnosticComparison: null, advisorInsights: ["Histórico local será exibido quando o backend Tauri estiver disponível."] };
  const result = await invokeSafe<HistoryOverview | SnakeHistoryOverview>("get_history_overview", undefined, fallback);
  return withMappedData(result, mapHistoryOverview);
}

export async function getHistoryAdvisorInsights() {
  return invokeSafe<string[]>("get_history_advisor_insights", undefined, []);
}
