export const HERMES_ACTION_TARGET = 150;

export type ExecutionReportPhase = "prepare" | "optimize";

export type ExecutionReportStatus =
  | "planned"
  | "scanned"
  | "simulated"
  | "applied"
  | "unavailable"
  | "failed"
  | "cancelled";

export type ExecutionReportRisk = "info" | "low" | "medium" | "high";

export type ExecutionReportAction = {
  id: string;
  title: string;
  detail: string;
  phase: string;
  status: ExecutionReportStatus;
  outputs: string[];
  plannedCount: number;
  technicalName?: string;
  commandPreview?: string;
  method?: string;
  risk?: ExecutionReportRisk;
  implemented?: boolean;
};

export type ExecutionReportSummary = {
  plannedActions: number;
  completedActions: number;
  simulatedActions: number;
  appliedActions: number;
  scannedActions: number;
  plannedOnlyActions: number;
  unavailableActions: number;
  failedActions: number;
  cancelledActions: number;
  missingToTarget: number;
};

export type ExecutionReport = {
  id: string;
  phase: ExecutionReportPhase;
  title: string;
  createdAt: string;
  safeMode: boolean;
  targetActions: number;
  summary: ExecutionReportSummary;
  actions: ExecutionReportAction[];
  notes: string[];
};

export type ExecutionCycleReport = {
  id: string;
  createdAt: string;
  updatedAt: string;
  safeMode: boolean;
  targetActions: number;
  summary: ExecutionReportSummary;
  reports: Partial<Record<ExecutionReportPhase, ExecutionReport>>;
  actions: ExecutionReportAction[];
  notes: string[];
};

export function buildExecutionReport({
  phase,
  title,
  safeMode,
  actions,
  notes = [],
}: {
  phase: ExecutionReportPhase;
  title: string;
  safeMode: boolean;
  actions: ExecutionReportAction[];
  notes: string[];
}): ExecutionReport {
  const normalizedActions = actions.map((action) => ({
    ...action,
    outputs: action.outputs.slice(0, 4),
    plannedCount: Math.max(1, action.plannedCount),
  }));

  return {
    id: `${phase}-${Date.now()}`,
    phase,
    title,
    createdAt: new Date().toISOString(),
    safeMode,
    targetActions: HERMES_ACTION_TARGET,
    summary: summarizeExecutionActions(normalizedActions),
    actions: normalizedActions,
    notes,
  };
}

export function buildExecutionCycleReport(
  reports: Partial<Record<ExecutionReportPhase, ExecutionReport>>,
): ExecutionCycleReport {
  const phaseReports = (["prepare", "optimize"] as const)
    .map((phase) => reports[phase])
    .filter((report): report is ExecutionReport => Boolean(report));
  const createdAt = phaseReports[0]?.createdAt ?? new Date().toISOString();
  const updatedAt = phaseReports.at(-1)?.createdAt ?? createdAt;
  const safeMode = phaseReports.every((report) => report.safeMode);
  const actions = phaseReports.flatMap((report) =>
    report.actions.map((action) => ({
      ...action,
      id: `${report.phase}.${action.id}`,
      phase: `${report.title} / ${action.phase}`,
    })),
  );
  const notes = phaseReports.flatMap((report) => [
    `${report.title}: ${report.summary.completedActions}/${report.summary.plannedActions} contabilizadas.`,
    ...report.notes,
  ]);

  return {
    id: `cycle-${createdAt}`,
    createdAt,
    updatedAt,
    safeMode,
    targetActions: HERMES_ACTION_TARGET,
    summary: summarizeExecutionActions(actions),
    reports,
    actions,
    notes: [...new Set(notes)].slice(0, 10),
  };
}

export function summarizeExecutionActions(
  actions: ExecutionReportAction[],
): ExecutionReportSummary {
  const summary: ExecutionReportSummary = {
    plannedActions: 0,
    completedActions: 0,
    simulatedActions: 0,
    appliedActions: 0,
    scannedActions: 0,
    plannedOnlyActions: 0,
    unavailableActions: 0,
    failedActions: 0,
    cancelledActions: 0,
    missingToTarget: HERMES_ACTION_TARGET,
  };

  for (const action of actions) {
    const count = Math.max(1, action.plannedCount);
    summary.plannedActions += count;

    if (action.status === "planned") {
      summary.plannedOnlyActions += count;
    } else if (action.status === "simulated") {
      summary.simulatedActions += count;
      summary.completedActions += count;
    } else if (action.status === "applied") {
      summary.appliedActions += count;
      summary.completedActions += count;
    } else if (action.status === "scanned") {
      summary.scannedActions += count;
      summary.completedActions += count;
    } else if (action.status === "unavailable") {
      summary.unavailableActions += count;
    } else if (action.status === "failed") {
      summary.failedActions += count;
    } else if (action.status === "cancelled") {
      summary.cancelledActions += count;
    }
  }

  summary.missingToTarget = Math.max(0, HERMES_ACTION_TARGET - summary.plannedActions);
  return summary;
}
