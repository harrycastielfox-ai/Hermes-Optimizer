export type OptimizeStageStatus = "ready" | "completed" | "waitingForConfirmation";

export type OptimizeNowStage = {
  id: string;
  engine: string;
  title: string;
  description: string;
  status: OptimizeStageStatus;
  readOnly: boolean;
  willModifySystem: boolean;
  requiresConfirmationBeforeChanges: boolean;
  outputs: string[];
};

export type OptimizeNowPlan = {
  generatedAt: string;
  engineVersion: string;
  readOnly: boolean;
  willModifySystem: boolean;
  requiresConfirmationBeforeChanges: boolean;
  telemetry: boolean;
  residentProcess: boolean;
  summary: {
    totalStages: number;
    readOnlyStages: number;
    confirmationGates: number;
    advisorRecommendations: number;
    advisorWarnings: number;
  };
  stages: OptimizeNowStage[];
  safeguards: string[];
};

const fallbackOptimizeNowPlan = (): OptimizeNowPlan => {
  const stages: OptimizeNowStage[] = [
    fallbackStage("analysis-quick", "analysis-security", "Analise rapida", false),
    fallbackStage("advisor-pro", "advisor-pro", "Advisor Pro", false),
    fallbackStage("clean-scan", "clean-engine", "Scan de limpeza segura", true),
    fallbackStage("startup-scan", "startup-engine", "Scan de inicializacao", true),
    fallbackStage("performance-check", "performance-engine", "Validacao de desempenho", true),
    fallbackStage("restore-check", "restore-engine", "Garantia de reversao", true),
  ];

  return {
    generatedAt: String(Math.floor(Date.now() / 1000)),
    engineVersion: "optimize-now-orchestrator-fallback-v1",
    readOnly: true,
    willModifySystem: false,
    requiresConfirmationBeforeChanges: true,
    telemetry: false,
    residentProcess: false,
    summary: {
      totalStages: stages.length,
      readOnlyStages: stages.length,
      confirmationGates: stages.filter((stage) => stage.requiresConfirmationBeforeChanges).length,
      advisorRecommendations: 0,
      advisorWarnings: 0,
    },
    stages,
    safeguards: [
      "Sem telemetria, nuvem ou login.",
      "Sem servico residente ou monitoramento permanente.",
      "Sem alteracao no Windows durante o plano inicial.",
      "Acoes reais so depois de mostrar impacto e pedir confirmacao.",
    ],
  };
};

function fallbackStage(
  id: string,
  engine: string,
  title: string,
  requiresConfirmationBeforeChanges: boolean,
): OptimizeNowStage {
  return {
    id,
    engine,
    title,
    description: "Etapa segura preparada para o fluxo Otimizar Agora.",
    status: id === "analysis-quick" || id === "advisor-pro" ? "completed" : "ready",
    readOnly: true,
    willModifySystem: false,
    requiresConfirmationBeforeChanges,
    outputs: ["Somente leitura.", "Nenhuma alteracao aplicada automaticamente."],
  };
}

export async function runOptimizeNowPlan(): Promise<OptimizeNowPlan> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return fallbackOptimizeNowPlan();
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<OptimizeNowPlan>("optimize_now_plan");
  } catch (error) {
    console.warn("Orquestrador Otimizar Agora indisponivel, usando plano local seguro.", error);
    return fallbackOptimizeNowPlan();
  }
}
