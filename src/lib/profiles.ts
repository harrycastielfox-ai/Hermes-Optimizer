import type { PerformanceApplyActionStatus } from "@/lib/performance";

export type ProfileRisk = "low" | "medium" | "high";
export type ProfileStatus = "ready" | "previewOnly";

export type HermesProfile = {
  id: string;
  name: string;
  summary: string;
  risk: ProfileRisk;
  status: ProfileStatus;
  reversible: boolean;
  requiresConfirmation: boolean;
  requiresExtraConfirmation: boolean;
  performanceActionIds: string[];
  expectedImpact: string[];
  safeguards: string[];
};

export type ProfilesCatalog = {
  generatedAt: string;
  engineVersion: string;
  readOnly: boolean;
  telemetry: boolean;
  residentProcess: boolean;
  profiles: HermesProfile[];
};

export type ProfileApplyRequest = {
  profileId: string;
  confirmed: boolean;
  dryRun?: boolean;
  extremeConfirmed?: boolean;
};

export type ProfileApplyResult = {
  generatedAt: string;
  engineVersion: string;
  profileId: string;
  profileName: string;
  dryRun: boolean;
  snapshotId: string;
  rollbackAvailable: boolean;
  appliedActions: Array<{
    id: string;
    title: string;
    status: PerformanceApplyActionStatus;
    message: string;
  }>;
  message: string;
};

export const fallbackProfilesCatalog: ProfilesCatalog = {
  generatedAt: "0",
  engineVersion: "profiles-engine-fallback-v1",
  readOnly: true,
  telemetry: false,
  residentProcess: false,
  profiles: [
    profile("seguro", "Seguro", "Maxima estabilidade com plano equilibrado.", "low", ["set-balanced-power-plan"]),
    profile("trabalho", "Trabalho", "Equilibrio para produtividade diaria.", "low", [
      "disable-transparency",
      "set-balanced-power-plan",
    ]),
    profile("gamer", "Gamer", "Prioriza resposta e desempenho sob demanda.", "medium", [
      "disable-transparency",
      "disable-window-animations",
      "disable-visual-shadows",
      "set-high-performance-power-plan",
    ]),
    profile("economia", "Economia", "Reduz consumo e animacoes nao essenciais.", "low", [
      "disable-transparency",
      "disable-window-animations",
      "set-power-saver-power-plan",
    ]),
    profile("extremo", "Extremo", "Desempenho maximo com confirmacao extra.", "high", [
      "disable-transparency",
      "disable-window-animations",
      "disable-visual-shadows",
      "set-high-performance-power-plan",
    ], true),
  ],
};

export async function loadProfilesCatalog(): Promise<ProfilesCatalog> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return fallbackProfilesCatalog;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<ProfilesCatalog>("profiles_list");
  } catch (error) {
    console.warn("Profiles Engine indisponivel, usando fallback local.", error);
    return fallbackProfilesCatalog;
  }
}

export async function applyHermesProfile(request: ProfileApplyRequest): Promise<ProfileApplyResult> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    throw new Error("Profiles Engine exige o backend Tauri.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<ProfileApplyResult>("profiles_apply", { request });
}

function profile(
  id: string,
  name: string,
  summary: string,
  risk: ProfileRisk,
  performanceActionIds: string[],
  requiresExtraConfirmation = false,
): HermesProfile {
  return {
    id,
    name,
    summary,
    risk,
    status: "ready",
    reversible: true,
    requiresConfirmation: true,
    requiresExtraConfirmation,
    performanceActionIds,
    expectedImpact: ["Snapshot obrigatorio", "Rollback disponivel"],
    safeguards: ["Sem telemetria", "Sem servico residente", "Log local"],
  };
}
