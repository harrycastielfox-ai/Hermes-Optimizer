import { HERMES_SAFE_TEST_MODE } from "@/lib/safe-mode";

export type RestoreRiskLevel = "low" | "medium" | "high";
export type RestoreSnapshotStatus = "created" | "dryRun" | "validated" | "applied" | "failed";
export type RestoreRollbackActionType =
  | "noop"
  | "restoreRegistryValue"
  | "restorePowerPlan"
  | "restoreStartupEntry"
  | "restoreVisualEffects"
  | "restoreGameMode"
  | "restoreFileBackup"
  | "custom";

export type RestoreLogLevel = "info" | "warning" | "error";
export type RestoreActionResultStatus = "dryRun" | "applied" | "skipped" | "unsupported" | "failed";

export type RestorePlannedAction = {
  id: string;
  engine: string;
  title: string;
  description: string;
  risk: RestoreRiskLevel;
  willModifySystem: boolean;
  requiresAdmin: boolean;
};

export type RestoreRollbackAction = {
  id: string;
  actionType: RestoreRollbackActionType;
  target: string;
  description: string;
  previousValue?: string;
  backupPath?: string;
  commandPreview?: string;
  status: "pending" | "applied" | "skipped" | "failed";
};

export type RestorePreviousState = {
  key: string;
  category:
    | "registry"
    | "powerPlan"
    | "startup"
    | "visualEffects"
    | "gameMode"
    | "file"
    | "metadata";
  value: string;
  source: string;
  captured: boolean;
};

export type RestoreLogEntry = {
  timestamp: string;
  level: RestoreLogLevel;
  message: string;
};

export type RestoreEvent = {
  id: string;
  timestamp: string;
  snapshotId?: string;
  level: RestoreLogLevel;
  message: string;
};

export type RestoreSnapshot = {
  id: string;
  timestamp: string;
  name: string;
  description: string;
  plannedActions: RestorePlannedAction[];
  reversalPlan: {
    summary: string;
    dryRunSupported: boolean;
    destructiveOperations: boolean;
    actionCount: number;
  };
  rollbackManifest: RestoreRollbackAction[];
  previousState: RestorePreviousState[];
  logsBefore: RestoreLogEntry[];
  logsAfter: RestoreLogEntry[];
  status: RestoreSnapshotStatus;
};

export type RestoreSnapshotList = {
  generatedAt: string;
  engineVersion: string;
  maxSnapshots: number;
  totalSnapshots: number;
  snapshots: RestoreSnapshot[];
};

export type RestoreEventList = {
  generatedAt: string;
  engineVersion: string;
  maxEvents: number;
  totalEvents: number;
  events: RestoreEvent[];
};

export type RestoreEngineStatus = {
  generatedAt: string;
  engineVersion: string;
  maxSnapshots: number;
  maxEvents: number;
  totalSnapshots: number;
  totalEvents: number;
  latestSnapshotId?: string;
  snapshotsWithRollback: number;
  snapshotsWithoutRollback: number;
  unsupportedRollbackActions: number;
  failedSnapshots: number;
  retentionPolicy: string;
  storage: string;
  readyForRealActions: boolean;
  warnings: string[];
};

export type RestoreCreateSnapshotRequest = {
  name?: string;
  description?: string;
  plannedActionsó: RestorePlannedAction[];
  rollbackManifest?: RestoreRollbackAction[];
  previousState?: RestorePreviousState[];
};

export type RestoreApplyResult = {
  snapshotId: string;
  timestamp: string;
  dryRun: boolean;
  applied: boolean;
  status: RestoreSnapshotStatus;
  message: string;
  actionResults: Array<{
    actionId: string;
    status: RestoreActionResultStatus;
    message: string;
  }>;
};

export type RestoreValidationResult = {
  snapshotId: string;
  timestamp: string;
  valid: boolean;
  fullyReversible: boolean;
  dryRunSupported: boolean;
  rollbackActionCount: number;
  supportedActionCount: number;
  unsupportedActionCount: number;
  failedActionCount: number;
  message: string;
  warnings: string[];
  actionResults: RestoreApplyResult["actionResults"];
};

export async function createRestoreSnapshot(
  request?: RestoreCreateSnapshotRequest,
): Promise<RestoreSnapshot> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<RestoreSnapshot>("restore_create_snapshot", {
    request: request ?? null,
  });
}

export async function listRestoreSnapshots(): Promise<RestoreSnapshotList> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<RestoreSnapshotList>("restore_list_snapshots");
}

export async function getRestoreEngineStatus(): Promise<RestoreEngineStatus> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<RestoreEngineStatus>("restore_engine_status");
}

export async function listRestoreEvents(): Promise<RestoreEventList> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<RestoreEventList>("restore_list_events");
}

export async function validateRestoreSnapshot(
  snapshotId: string,
): Promise<RestoreValidationResult> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<RestoreValidationResult>("restore_validate_snapshot", {
    snapshotId,
  });
}

export async function applyRestoreSnapshot(
  snapshotId: string,
  dryRun = true,
): Promise<RestoreApplyResult> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<RestoreApplyResult>("restore_apply_snapshot", {
    snapshotId,
    dryRun: HERMES_SAFE_TEST_MODE || dryRun,
  });
}
