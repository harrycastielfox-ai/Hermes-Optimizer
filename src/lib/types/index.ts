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
};

export type DiagnosticResult = {
  id: string;
  title: string;
  status: "ok" | "warning" | "attention";
  value: string;
  description: string;
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
