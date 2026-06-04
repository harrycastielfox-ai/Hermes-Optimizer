export type RiskLevel = "low" | "medium" | "high";
export type TweakMode = "safe" | "gamer" | "extreme";

export type SystemOverview = {
  status: "good" | "attention" | "critical";
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
  freeSpaceGb: number;
  tempFilesEstimateMb: number;
  performanceMode: string;
  lastDiagnostic: string;
  computerName: string;
  operatingSystem: string;
  windowsVersion: string;
  architecture: string;
  uptimeSeconds: number;
  cpuName: string;
  cpuCores: number;
  ramTotalGb: number;
  ramUsedGb: number;
  ramFreeGb: number;
  diskName: string;
  diskTotalGb: number;
  diskUsedGb: number;
  diskFreeGb: number;
  gpuDetected: boolean;
  gpuName: string;
  gpuMemoryGb: number;
  healthScore: number;
  healthLabel: string;
  performanceScore: number;
  stabilityScore: number;
  storageScore: number;
  gamingReadinessScore: number;
};

export type DiagnosticResult = {
  id: string;
  title: string;
  status: "ok" | "warning" | "attention" | "critical";
  value: string;
  description: string;
  recommendation: string;
  penalty: number;
};

export type CleanerCategory = {
  id: string;
  name: string;
  description: string;
  estimatedSizeMb: number;
  selected: boolean;
  safeToClean: boolean;
  requiresConfirmation: boolean;
  reversible: boolean;
};

export type StartupApp = {
  id: string;
  name: string;
  publisher: string;
  path: string;
  impact: "low" | "medium" | "high";
  enabled: boolean;
  status: string;
  origin: string;
  risk: RiskLevel;
  suggestedAction: string;
};

export type HermesTweak = {
  id: string;
  name: string;
  description: string;
  category: string;
  risk: RiskLevel;
  mode: TweakMode;
  requiresAdmin: boolean;
  reversible: boolean;
  enabled: boolean;
  recommended: boolean;
  benefit: string;
  reversalPlan: string;
  warning?: string;
};

export type PerformanceProfile = {
  id: string;
  name: string;
  objective: string;
  tweakCount: number;
  risk: RiskLevel;
  mode: TweakMode;
  description: string;
  includedTweaks: string[];
};

export type OptimizationLog = {
  id: string;
  date: string;
  action: string;
  module: string;
  result: "success" | "pending" | "warning" | "simulated";
  risk: RiskLevel;
  details: string;
};

export type RestoreSnapshot = {
  id: string;
  date: string;
  profileApplied: string;
  tweaksApplied: string[];
  status: "available" | "restored" | "simulated";
  reversible: boolean;
};

export type GamerAppProfile = {
  id: string;
  name: string;
  executablePath: string;
  graphicsProfile: "balanced" | "high-performance";
  powerPlan: "balanced" | "high-performance" | "ultimate";
  processesToClose: string[];
  restoreOnExit: boolean;
};


export type OsInfo = {
  computerName: string;
  name: string;
  version: string;
  build: string;
  architecture: string;
  uptimeSeconds: number;
};

export type CpuInfo = {
  name: string;
  manufacturer: string;
  frequencyMhz: number;
  baseFrequencyMhz: number;
  maxFrequencyMhz: number;
  cores: number;
  physicalCores: number;
  threads: number;
  logicalProcessors: number;
  architecture: string;
  usagePercent: number;
};

export type MemoryInfo = {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  availableBytes: number;
  usagePercent: number;
  moduleCount: number;
  slotCount: number;
  speedMhz: number;
};

export type DiskInfo = {
  name: string;
  driveLetter: string;
  model: string;
  mediaType: "SSD" | "HDD" | "NVMe" | "Desconhecido" | string;
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usagePercent: number;
  isPrimary: boolean;
};

export type GpuInfo = {
  name: string;
  manufacturer: string;
  dedicatedMemoryBytes: number;
  driverVersion: string;
  status: string;
  detected: boolean;
};

export type HardwareInfo = {
  os: OsInfo;
  cpu: CpuInfo;
  memory: MemoryInfo;
  disks: DiskInfo[];
  gpu?: GpuInfo | null;
  gpuReady: boolean;
  dataSource: string;
  safetyNote: string;
};

export type HealthScore = {
  score: number;
  label: string;
  reasons: string[];
  performanceScore: number;
  stabilityScore: number;
  storageScore: number;
  gamingReadinessScore: number;
};

export type DiagnosticReport = {
  summary: string;
  health: HealthScore;
  problems: DiagnosticResult[];
  recommendations: string[];
};
