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
    healthScore: 97,
    cpuUsagePercent: 23,
    ramUsedGb: 8.3,
    ramTotalGb: 15.7,
    diskFreeGb: 235,
    diskTotalGb: 456,
    startupItemsCount: 17,
    startupHighImpactCount: 2,
    bootTimeSeconds: 154,
    securityActive: true,
    temporaryFilesGb: 4.2,
    powerPlanName: "Equilibrado",
  },
  benchmark: {
    score: 970,
  },
};

export const fallbackAdvisorRecommendations: AdvisorRecommendation[] = [
  {
    id: "fallback-system-healthy",
    title: "Seu sistema está saudável",
    description: "Todos os componentes principais estão dentro dos parâmetros normais.",
    severity: "success",
    category: "systemHealth",
    priority: 10,
    source: "diagnóstico local",
  },
  {
    id: "fallback-startup-items",
    title: "Muitos itens na inicialização",
    description: "17 programas iniciam com o Windows. Impacto estimado: +11s no boot.",
    severity: "info",
    category: "startup",
    priority: 30,
    source: "diagnóstico local",
  },
  {
    id: "fallback-disk-space",
    title: "Espaço em disco",
    description: "Seu disco está com 49% de uso. Mantenha acima de 20% livre para máximo desempenho.",
    severity: "warning",
    category: "disk",
    priority: 60,
    source: "diagnóstico local",
  },
  {
    id: "fallback-integrated-gpu",
    title: "GPU integrada detectada",
    description: "Para melhor desempenho em jogos, considere GPU dedicada no futuro.",
    severity: "info",
    category: "hardware",
    priority: 80,
    source: "diagnóstico local",
  },
];

export async function loadAdvisorRecommendations(input: AdvisorInput = currentDashboardInput): Promise<AdvisorRecommendation[]> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return fallbackAdvisorRecommendations;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const report = await invoke<AdvisorReport>("advisor_pro_analyze", {
      input,
    });

    return report.recommendations.length > 0 ? report.recommendations : fallbackAdvisorRecommendations;
  } catch (error) {
    console.warn("Advisor Pro local indisponível, usando fallback estático.", error);
    return fallbackAdvisorRecommendations;
  }
}
