export type AdvisorSeverity = "success" | "info" | "warning";

export type AdvisorRecommendation = {
  id: string;
  title: string;
  description: string;
  severity: AdvisorSeverity;
  category: string;
  priority: number;
  source: string;
};

export type AdvisorReport = {
  generatedAt: string;
  engineVersion: string;
  readOnly: boolean;
  recommendations: AdvisorRecommendation[];
};

export type AdvisorInput = {
  diagnostic: {
    healthScore: number;
    cpuUsagePercent: number;
    ramUsedGb: number;
    ramTotalGb: number;
    diskFreeGb: number;
    diskTotalGb: number;
    startupItemsCount: number;
    startupHighImpactCount: number;
    bootTimeSeconds: number;
    securityActive: boolean;
    temporaryFilesGb?: number;
    powerPlanName?: string;
  };
  benchmark: {
    score: number;
    previousScore?: number;
  };
};

export const currentDashboardInput: AdvisorInput = {
  diagnostic: {
    healthScore: 0,
    cpuUsagePercent: 0,
    ramUsedGb: 0,
    ramTotalGb: 0,
    diskFreeGb: 0,
    diskTotalGb: 0,
    startupItemsCount: 0,
    startupHighImpactCount: 0,
    bootTimeSeconds: 0,
    securityActive: false,
    temporaryFilesGb: 0,
    powerPlanName: "Indispon?vel",
  },
  benchmark: {
    score: 0,
  },
};

export const fallbackAdvisorRecommendations: AdvisorRecommendation[] = [
  {
    id: "fallback-advisor-unavailable",
    title: "Recomenda??es indisponiveis",
    description:
      "O Advisor Pro precisa de diagn?stico real do backend Tauri. Nenhuma recomenda??o demonstrativa foi exibida.",
    severity: "warning",
    category: "unavailable",
    priority: 10,
    source: "fallback indispon?vel",
  },
];

export async function loadAdvisorRecommendations(
  input: AdvisorInput = currentDashboardInput,
): Promise<AdvisorRecommendation[]> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return fallbackAdvisorRecommendations;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const report = await invoke<AdvisorReport>("advisor_pro_analyze", {
      input,
    });

    return report.recommendations.length > 0
      ? report.recommendations
      : fallbackAdvisorRecommendations;
  } catch (error) {
    console.warn("Advisor Pro local indispon?vel, usando fallback indispon?vel.", error);
    return fallbackAdvisorRecommendations;
  }
}
