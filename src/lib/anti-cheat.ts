export type AntiCheatCheck = {
  label: string;
  status: string;
  detail: string;
  ok: boolean;
  points: number;
  maxPoints: number;
};

export type AntiCheatReport = {
  generatedAt: string;
  engineVersion: string;
  readOnly: boolean;
  score: number;
  status: string;
  summary: string;
  checks: {
    tpm: AntiCheatCheck;
    secureBoot: AntiCheatCheck;
    coreIsolation: AntiCheatCheck;
    driverSignature: AntiCheatCheck;
  };
  services: {
    riotVanguard: AntiCheatCheck;
    easyAntiCheat: AntiCheatCheck;
    battleye: AntiCheatCheck;
    faceit: AntiCheatCheck;
  };
  warnings: string[];
};

export const fallbackAntiCheatReport: AntiCheatReport = {
  generatedAt: "0",
  engineVersion: "anti-cheat-fallback-v1",
  readOnly: true,
  score: 0,
  status: "Indispon?vel",
  summary:
    "Anti-Cheat real indispon?vel fora do backend Tauri. Nenhum resultado demonstrativo foi exibido.",
  checks: {
    tpm: pendingCheck("TPM 2.0", 25),
    secureBoot: pendingCheck("Secure Boot", 25),
    coreIsolation: pendingCheck("Core Isolation", 15),
    driverSignature: pendingCheck("Driver Signature", 20),
  },
  services: {
    riotVanguard: pendingCheck("Vanguard Ready", 15),
    easyAntiCheat: pendingCheck("EAC Ready", 15),
    battleye: pendingCheck("BattlEye Ready", 15),
    faceit: pendingCheck("FACEIT Ready", 15),
  },
  warnings: ["Leitura Anti-Cheat real indispon?vel."],
};

export async function analyzeAntiCheat(): Promise<AntiCheatReport> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return fallbackAntiCheatReport;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const report = await invoke<AntiCheatReport>("anti_cheat_engine_read");
    return writeLocalReportCache("anti-cheat-report", report);
  } catch (error) {
    console.warn("Anti-Cheat read-only indispon?vel, usando fallback seguro.", error);
    return {
      ...fallbackAntiCheatReport,
      status: "Indispon?vel",
      summary:
        "N?o foi poss?vel concluir a leitura Anti-Cheat nesta execu??o. Nenhuma altera??o foi feita.",
      warnings: [error instanceof Error ? error.message : String(error)],
    };
  }
}

export function loadCachedAntiCheatReport(): AntiCheatReport {
  return readLocalReportCache<AntiCheatReport>("anti-cheat-report") ?? fallbackAntiCheatReport;
}

function pendingCheck(label: string, maxPoints: number): AntiCheatCheck {
  return {
    label,
    status: "Indispon?vel",
    detail: "Leitura real indispon?vel.",
    ok: false,
    points: 0,
    maxPoints,
  };
}
import { readLocalReportCache, writeLocalReportCache } from "@/lib/local-read-cache";
