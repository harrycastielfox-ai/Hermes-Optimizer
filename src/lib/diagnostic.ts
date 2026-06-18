import type { AdvisorInput } from "@/lib/advisor";

export type DiagnosticReport = {
  generatedAt: string;
  engineVersion: string;
  readOnly: boolean;
  healthScore: number;
  healthLabel: string;
  system: {
    computerName: string;
    osName: string;
    osVersion: string;
    osBuild: string;
    architecture: string;
    manufacturer: string;
    model: string;
    motherboardManufacturer: string;
    motherboardModel: string;
  };
  cpu: {
    name: string;
    usagePercent: number;
    physicalCores: number;
    logicalProcessors: number;
    currentClockMhz: number;
    maxClockMhz: number;
  };
  ram: {
    totalGb: number;
    usedGb: number;
    freeGb: number;
    usedPercent: number;
  };
  disk: {
    mount: string;
    volumeName: string;
    physicalName: string;
    mediaType: string;
    healthStatus: string;
    totalGb: number;
    freeGb: number;
    usedGb: number;
    usedPercent: number;
  };
  gpu: {
    name: string;
    driverVersion: string;
    adapterRamGb?: number;
  };
  display: {
    resolution: string;
    refreshRateHz?: number;
    status: string;
  };
  network: {
    ssid: string;
    adapterName: string;
    signalPercent?: number;
    gateway: string;
    pingMs: number;
    pingStatus: string;
    status: string;
  };
  temperature: {
    available: boolean;
    celsius: number;
    status: string;
  };
  defender: {
    available: boolean;
    active: boolean;
    antivirusEnabled: boolean;
    antispywareEnabled: boolean;
    realtimeProtectionEnabled: boolean;
    status: string;
  };
  windowsUpdate: {
    serviceStatus: string;
    lastHotfixId: string;
    lastInstalledOn: string;
    status: string;
  };
  startup: {
    totalItems: number;
    highImpactCount: number;
    mediumImpactCount: number;
    lowImpactCount: number;
  };
  powerPlan: {
    activeSchemeName: string;
    activeSchemeGuid: string;
    status: string;
  };
  temporaryFiles: {
    estimatedGb: number;
    estimatedBytes: number;
    scannedLocations: string[];
    available: boolean;
  };
  uptime: {
    seconds: number;
    label: string;
  };
  warnings: string[];
};

export const fallbackDiagnosticReport: DiagnosticReport = {
  generatedAt: "0",
  engineVersion: "diagnostic-engine-fallback-v1",
  readOnly: true,
  healthScore: 0,
  healthLabel: "Indisponível",
  system: {
    computerName: "Indisponível",
    osName: "Indisponível",
    osVersion: "Indisponível",
    osBuild: "Indisponível",
    architecture: "Indisponível",
    manufacturer: "Indisponível",
    model: "Indisponível",
    motherboardManufacturer: "Indisponível",
    motherboardModel: "Indisponível",
  },
  cpu: {
    name: "Indisponível",
    usagePercent: 0,
    physicalCores: 0,
    logicalProcessors: 0,
    currentClockMhz: 0,
    maxClockMhz: 0,
  },
  ram: {
    totalGb: 0,
    usedGb: 0,
    freeGb: 0,
    usedPercent: 0,
  },
  disk: {
    mount: "Indisponível",
    volumeName: "Indisponível",
    physicalName: "Indisponível",
    mediaType: "Indisponível",
    healthStatus: "Indisponível",
    totalGb: 0,
    freeGb: 0,
    usedGb: 0,
    usedPercent: 0,
  },
  gpu: {
    name: "Indisponível",
    driverVersion: "Indisponível",
  },
  display: {
    resolution: "Indisponível",
    status: "Indisponível",
  },
  network: {
    ssid: "Indisponível",
    adapterName: "Indisponível",
    gateway: "Indisponível",
    pingStatus: "Indisponível",
    status: "Indisponível",
  },
  temperature: {
    available: false,
    status: "Indisponível",
  },
  defender: {
    available: false,
    active: false,
    antivirusEnabled: false,
    antispywareEnabled: false,
    realtimeProtectionEnabled: false,
    status: "Indisponível",
  },
  windowsUpdate: {
    serviceStatus: "Indisponível",
    lastHotfixId: "Indisponível",
    lastInstalledOn: "Indisponível",
    status: "Indisponível",
  },
  startup: {
    totalItems: 0,
    highImpactCount: 0,
    mediumImpactCount: 0,
    lowImpactCount: 0,
  },
  powerPlan: {
    activeSchemeName: "Indisponível",
    activeSchemeGuid: "Indisponível",
    status: "Indisponível",
  },
  temporaryFiles: {
    estimatedGb: 0,
    estimatedBytes: 0,
    scannedLocations: [],
    available: false,
  },
  uptime: {
    seconds: 0,
    label: "Indisponível",
  },
  warnings: ["Dados reais indisponiveis. Fallback sem valores demonstrativos."],
};

let diagnosticMemoryCache: DiagnosticReport | null = null;
let diagnosticLoadPromise: Promise<DiagnosticReport> | null = null;
let diagnosticLivePromise: Promise<DiagnosticReport> | null = null;
let diagnosticLiveRefreshedAt = 0;
const LIVE_REFRESH_TTL_MS = 15_000;

export async function loadDiagnosticReport(): Promise<DiagnosticReport> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return fallbackDiagnosticReport;
  }

  if (diagnosticMemoryCache) {
    return diagnosticMemoryCache;
  }

  diagnosticLoadPromise ??= import("@tauri-apps/api/core")
    .then(({ invoke }) => invoke<DiagnosticReport>("diagnostic_engine_read_cached"))
    .then((report) => {
      diagnosticMemoryCache = report;
      return report;
    })
    .catch((error) => {
      console.warn("Diagnóstico salvo indisponível, usando fallback estatico.", error);
      return fallbackDiagnosticReport;
    })
    .finally(() => {
      diagnosticLoadPromise = null;
    });

  return diagnosticLoadPromise;
}

export async function refreshDiagnosticReport(): Promise<DiagnosticReport> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return fallbackDiagnosticReport;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const report = await invoke<DiagnosticReport>("diagnostic_engine_read");
    diagnosticMemoryCache = report;
    diagnosticLiveRefreshedAt = Date.now();
    return report;
  } catch (error) {
    console.warn("Atualização real do diagnóstico indisponível, usando fallback estatico.", error);
    return fallbackDiagnosticReport;
  }
}

export async function refreshLiveDiagnosticReport(force = false): Promise<DiagnosticReport> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return diagnosticMemoryCache ?? fallbackDiagnosticReport;
  }

  const now = Date.now();
  if (!force && diagnosticMemoryCache && now - diagnosticLiveRefreshedAt < LIVE_REFRESH_TTL_MS) {
    return diagnosticMemoryCache;
  }

  if (diagnosticLivePromise) {
    return diagnosticLivePromise;
  }

  diagnosticLivePromise = import("@tauri-apps/api/core")
    .then(({ invoke }) => invoke<DiagnosticReport>("diagnostic_engine_refresh_live"))
    .then((report) => {
      diagnosticMemoryCache = report;
      diagnosticLiveRefreshedAt = Date.now();
      return report;
    })
    .catch((error) => {
      console.warn("Atualização leve do diagnóstico indisponível; mantendo dados salvos.", error);
      return diagnosticMemoryCache ?? fallbackDiagnosticReport;
    })
    .finally(() => {
      diagnosticLivePromise = null;
    });

  return diagnosticLivePromise;
}

export function advisorInputFromDiagnostic(report: DiagnosticReport): AdvisorInput {
  return {
    diagnostic: {
      healthScore: report.healthScore,
      cpuUsagePercent: report.cpu.usagePercent,
      ramUsedGb: report.ram.usedGb,
      ramTotalGb: report.ram.totalGb,
      diskFreeGb: report.disk.freeGb,
      diskTotalGb: report.disk.totalGb,
      startupItemsCount: report.startup.totalItems,
      startupHighImpactCount: report.startup.highImpactCount,
      bootTimeSeconds: report.uptime.seconds,
      securityActive: report.defender.active,
      temporaryFilesGb: report.temporaryFiles.estimatedGb,
      powerPlanName: report.powerPlan.activeSchemeName,
    },
    benchmark: {
      score: Math.max(0, report.healthScore * 10),
    },
  };
}
