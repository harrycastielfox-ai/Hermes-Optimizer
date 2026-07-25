export type NexOptimizationStatus =
  | "idle"
  | "running"
  | "paused"
  | "completed"
  | "error"
  | "cancelled";

export type NexOptimizationPhase = "prepare" | "optimize" | null;

export type NexOptimizationStepStatus = "pending" | "running" | "completed" | "error";

export type NexOptimizationStep = {
  id: string;
  title: string;
  detail?: string;
  status: NexOptimizationStepStatus;
};

export type NexOptimizationState = {
  runId: string | null;
  phase: NexOptimizationPhase;
  isRunning: boolean;
  progress: number;
  currentStep: string;
  currentDetail?: string;
  startedAt: number | null;
  updatedAt: number;
  completedSteps: string[];
  pendingSteps: string[];
  steps: NexOptimizationStep[];
  status: NexOptimizationStatus;
  errorMessage?: string;
};

export type NexCompanionSize = "small" | "medium" | "large";

export type NexCompanionPosition = {
  x: number;
  y: number;
  monitorId?: string;
};

export type NexCompanionSettings = {
  enabled: boolean;
  showWhenMinimized: boolean;
  alwaysOnTop: boolean;
  hideInFullscreen: boolean;
  compactMode: boolean;
  clickThrough: boolean;
  size: NexCompanionSize;
  position?: NexCompanionPosition;
};

export type NexCompanionCommand =
  | "OPEN_MAIN_WINDOW"
  | "SHOW_COMPANION"
  | "HIDE_COMPANION"
  | "EXPAND_COMPANION"
  | "COLLAPSE_COMPANION";

export const DEFAULT_NEX_OPTIMIZATION_STATE: NexOptimizationState = {
  runId: null,
  phase: null,
  isRunning: false,
  progress: 0,
  currentStep: "Aguardando otimização",
  startedAt: null,
  updatedAt: 0,
  completedSteps: [],
  pendingSteps: [],
  steps: [],
  status: "idle",
};
