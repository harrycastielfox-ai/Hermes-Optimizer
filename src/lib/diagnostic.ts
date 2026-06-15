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
    pingMs?: number;
    pingStatus: string;
    status: string;
  };
  temperature: {
    available: boolean;
    celsius?: number;
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
  healthScore: 97,
  healthLabel: "Excelente",
  system: {
    computerName: "DRT",
    osName: "Windows 11 Home Single Language",
    osVersion: "10.0.26200",
    osBuild: "26200",
    architecture: "64 bits",
    manufacturer: "LENOVO",
    model: "LNVNB161216",
    motherboardManufacturer: "LENOVO",
    motherboardModel: "LNVNB161216",
  },
  cpu: {
    name: "Intel Core i5-1235U",
    usagePercent: 23,
    physicalCores: 10,
    logicalProcessors: 12,
    currentClockMhz: 1300,
    maxClockMhz: 1300,
  },
  ram: {
    totalGb: 15.7,
    usedGb: 8.3,
    freeGb: 7.4,
    usedPercent: 53,
  },
  disk: {
    mount: "C:",
    volumeName: "Disco principal",
    physicalName: "NVMe KBG40ZNS512G",
    mediaType: "SSD",
    healthStatus: "Saudavel",
    totalGb: 456,
    freeGb: 235,
    usedGb: 221,
    usedPercent: 49,
  },
  gpu: {
    name: "Intel Iris Xe Graphics",
    driverVersion: "31.0.101.5445",
  },
  display: {
    resolution: "1920 x 1080",
    refreshRateHz: 120,
    status: "Alta taxa",
  },
  network: {
    ssid: "Wi-Fi",
    adapterName: "Wi-Fi",
    signalPercent: 92,
    gateway: "192.168.0.1",
    pingMs: 4,
    pingStatus: "Excelente",
    status: "Conectado, forte",
  },
  temperature: {
    available: false,
    status: "Indisponivel",
  },
  defender: {
    available: true,
    active: true,
    antivirusEnabled: true,
    antispywareEnabled: true,
    realtimeProtectionEnabled: true,
    status: "Ativo",
  },
  windowsUpdate: {
    serviceStatus: "Running",
    lastHotfixId: "Nao identificado",
    lastInstalledOn: "Nao identificado",
    status: "Em dia",
  },
  startup: {
    totalItems: 17,
    highImpactCount: 2,
    mediumImpactCount: 8,
    lowImpactCount: 7,
  },
  powerPlan: {
    activeSchemeName: "Equilibrado",
    activeSchemeGuid: "381b4222-f694-41f0-9685-ff5bb260df2e",
    status: "Equilibrado",
  },
  temporaryFiles: {
    estimatedGb: 4.2,
    estimatedBytes: 4509715660,
    scannedLocations: ["%TEMP%", "C:\\Windows\\Temp"],
    available: true,
  },
  uptime: {
    seconds: 9240,
    label: "2h 34m",
  },
  warnings: [],
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
      console.warn("Diagnostico salvo indisponivel, usando fallback estatico.", error);
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
    console.warn("Atualizacao real do diagnostico indisponivel, usando fallback estatico.", error);
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
      console.warn("Atualizacao leve do diagnostico indisponivel; mantendo dados salvos.", error);
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
