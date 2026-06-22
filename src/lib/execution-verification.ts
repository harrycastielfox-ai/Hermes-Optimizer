import { type ExecutionReportAction, type ExecutionVerification } from "@/lib/execution-report";
import { refreshPerformanceReport, type PerformanceReport } from "@/lib/performance";

type VerificationRule = (report: PerformanceReport) => boolean | undefined;

const PERFORMANCE_RULES: Array<{ matches: string[]; verify: VerificationRule; expected: string }> =
  [
    {
      matches: ["PowerPlan.HighPerformance", "performance-set-high-performance-power-plan"],
      verify: (report) => report.powerPlan.status === "Desempenho",
      expected: "Plano de energia em Alto desempenho",
    },
    {
      matches: ["Visual.Transparency", "performance-disable-transparency"],
      verify: (report) => booleanState(report.visualEffects.transparencyEnabled, false),
      expected: "Transparência desativada",
    },
    {
      matches: ["Visual.Animations", "performance-disable-window-animations"],
      verify: (report) => booleanState(report.visualEffects.animationsEnabled, false),
      expected: "Animações desativadas",
    },
    {
      matches: ["Visual.Shadows", "performance-disable-visual-shadows"],
      verify: (report) => booleanState(report.visualEffects.shadowsEnabled, false),
      expected: "Sombras visuais desativadas",
    },
    {
      matches: ["GameBar.AllowAutoGameMode", "advanced-enable-game-mode"],
      verify: (report) => booleanState(report.gameMode.enabled, true),
      expected: "Modo de Jogo ativado",
    },
    {
      matches: ["GameDVR.AppCapture", "advanced-disable-game-dvr"],
      verify: (report) => booleanState(report.gameMode.gameDvrEnabled, false),
      expected: "GameDVR desativado",
    },
  ];

export async function verifyExecutionActions(
  actions: ExecutionReportAction[],
  safeMode: boolean,
): Promise<ExecutionReportAction[]> {
  const checkedAt = new Date().toISOString();

  if (safeMode) {
    return actions.map((action) => ({
      ...action,
      verification: notRequiredVerification(action, checkedAt),
    }));
  }

  let performance: PerformanceReport | null = null;
  try {
    performance = await refreshPerformanceReport();
  } catch {
    performance = null;
  }

  return actions.map((action) => ({
    ...action,
    verification: verifyAction(action, performance, checkedAt),
  }));
}

function verifyAction(
  action: ExecutionReportAction,
  performance: PerformanceReport | null,
  checkedAt: string,
): ExecutionVerification {
  if (action.status !== "applied") {
    return notRequiredVerification(action, checkedAt);
  }

  const identity = `${action.id} ${action.technicalName ?? ""}`;
  const rule = PERFORMANCE_RULES.find((candidate) =>
    candidate.matches.some((match) => identity.includes(match)),
  );

  if (!rule || !performance || performance.engineVersion.includes("fallback")) {
    return {
      status: "unavailable",
      detail: "Ação executada, mas ainda sem leitura pós-execução específica.",
      checkedAt,
    };
  }

  const result = rule.verify(performance);
  if (result === undefined) {
    return {
      status: "unavailable",
      detail: `${rule.expected}: leitura do Windows indisponível.`,
      checkedAt,
    };
  }

  return {
    status: result ? "confirmed" : "notConfirmed",
    detail: result
      ? `${rule.expected}: confirmado pela leitura posterior.`
      : `${rule.expected}: não confirmado pela leitura posterior.`,
    checkedAt,
  };
}

function notRequiredVerification(
  action: ExecutionReportAction,
  checkedAt: string,
): ExecutionVerification {
  return {
    status: "notRequired",
    detail:
      action.status === "simulated"
        ? "Modo teste: nenhuma alteração real para confirmar."
        : "Esta ação não exige confirmação pós-execução.",
    checkedAt,
  };
}

function booleanState(value: boolean | undefined, expected: boolean) {
  return value === undefined ? undefined : value === expected;
}
