import { forceSafeDryRun } from "@/lib/safe-mode";
import { readLocalReportCache, writeLocalReportCache } from "@/lib/local-read-cache";

export type AdvancedMethod = "registry" | "cmd" | "powerShell";
export type AdvancedRisk = "low" | "medium" | "high";
export type AdvancedActionStatus = "dryRun" | "applied" | "skipped" | "failed";

export type AdvancedAction = {
  id: string;
  title: string;
  description: string;
  method: AdvancedMethod;
  risk: AdvancedRisk;
  requiresAdmin: boolean;
  requiresExtreme: boolean;
  reversible: boolean;
  persistent: boolean;
  requiresRestart: boolean;
  currentValue: string;
  plannedChange: string;
  commandPreview: string;
};

export type AdvancedBlockedAction = {
  id: string;
  title: string;
  reason: string;
  method: AdvancedMethod;
  risk: AdvancedRisk;
  requiresAdmin: boolean;
  requiresExtreme: boolean;
};

export type AdvancedCatalog = {
  generatedAt: string;
  engineVersion: string;
  readOnly: boolean;
  willModifySystem: boolean;
  telemetry: boolean;
  residentProcess: boolean;
  actions: AdvancedAction[];
  blockedActions: AdvancedBlockedAction[];
  warnings: string[];
};

export type AdvancedApplyRequest = {
  confirmed: boolean;
  dryRun?: boolean;
  actionIds?: string[];
  extremeMode?: boolean;
};

export type AdvancedApplyResult = {
  generatedAt: string;
  engineVersion: string;
  dryRun: boolean;
  snapshotId: string;
  rollbackAvailable: boolean;
  appliedActions: Array<{
    id: string;
    title: string;
    status: AdvancedActionStatus;
    message: string;
  }>;
  message: string;
};

export const fallbackAdvancedCatalog: AdvancedCatalog = {
  generatedAt: "0",
  engineVersion: "advanced-engine-fallback-v1",
  readOnly: true,
  willModifySystem: false,
  telemetry: false,
  residentProcess: false,
  actions: [
    action(
      "enable-game-mode",
      "Ativar Game Mode",
      "Ativa Game Mode do Windows no usuario atual.",
      "registry",
      "low",
      "Nao definido",
      "Definir como 1",
    ),
    action(
      "disable-game-dvr",
      "Desativar captura Game DVR",
      "Reduz captura em segundo plano durante jogos.",
      "registry",
      "low",
      "Nao definido",
      "Definir como 0",
    ),
    action(
      "disable-startup-delay",
      "Reduzir atraso de inicializacao",
      "Remove atraso artificial de apps no logon.",
      "registry",
      "medium",
      "Nao definido",
      "Definir como 0",
    ),
    action(
      "flush-dns-cache",
      "Limpar cache DNS",
      "Executa ipconfig /flushdns.",
      "cmd",
      "low",
      "Cache DNS atual",
      "Executar comando transiente",
    ),
    action(
      "list-power-plans",
      "Listar planos de energia",
      "Registra planos disponiveis com powercfg /L.",
      "cmd",
      "low",
      "Plano atual indisponivel",
      "Executar leitura",
    ),
    action(
      "set-high-performance-power-plan",
      "Ativar plano Alto desempenho",
      "Troca plano com rollback para o anterior.",
      "cmd",
      "medium",
      "Plano atual indisponivel",
      "powercfg /S com rollback",
    ),
    action(
      "disable-transparency",
      "Desativar transparencias",
      "Reduz custo grafico leve.",
      "registry",
      "low",
      "Nao definido",
      "Definir como 0",
    ),
    action(
      "disable-window-animations",
      "Reduzir animacoes visuais",
      "Desativa animacoes leves do Explorer.",
      "registry",
      "low",
      "Nao definido",
      "Definir como 0",
    ),
    action(
      "disable-visual-shadows",
      "Reduzir sombras do Explorer",
      "Desativa sombras de lista.",
      "registry",
      "low",
      "Nao definido",
      "Definir como 0",
    ),
    action(
      "set-visual-effects-custom",
      "Marcar efeitos visuais como personalizados",
      "Mantem coerencia dos ajustes visuais.",
      "registry",
      "low",
      "Nao definido",
      "Definir como 3",
    ),
  ],
  blockedActions: [
    blocked(
      "chkdsk-repair",
      "chkdsk C: /f /r",
      "Bloqueado: exige reinicio e pode demorar muito.",
      "cmd",
      "high",
      true,
      true,
    ),
    blocked(
      "defrag-optimize",
      "defrag C: /O",
      "Bloqueado: otimizacao de disco exige cuidado com SSD/NVMe.",
      "cmd",
      "high",
      true,
      true,
    ),
    blocked(
      "winsock-reset",
      "Reset de rede",
      "Bloqueado: pode quebrar conectividade e exige reinicio.",
      "cmd",
      "high",
      true,
      true,
    ),
    blocked(
      "disable-windows-update",
      "Desabilitar Windows Update permanentemente",
      "Bloqueado: atualizacoes de seguranca nao sao desativadas permanentemente.",
      "powerShell",
      "high",
      true,
      true,
    ),
    blocked(
      "disable-defender",
      "Desabilitar Defender permanentemente",
      "Bloqueado: protecao permanente nao sera reduzida.",
      "powerShell",
      "high",
      true,
      true,
    ),
    blocked(
      "delete-user-files",
      "Apagar arquivos pessoais",
      "Bloqueado: arquivos pessoais ficam fora do Advanced Engine.",
      "powerShell",
      "high",
      true,
      true,
    ),
    blocked(
      "remove-programs",
      "Remover programas",
      "Bloqueado: o Hermes nao remove softwares.",
      "powerShell",
      "high",
      true,
      true,
    ),
    blocked(
      "free-registry-delete",
      "Deletar chaves de Registro fora da allowlist",
      "Bloqueado: sem comando livre no Registro.",
      "registry",
      "high",
      true,
      true,
    ),
    blocked(
      "hklm-multimedia-tweaks",
      "Tweaks HKLM Multimedia",
      "Bloqueado: exige admin e backup dedicado.",
      "registry",
      "high",
      true,
      true,
    ),
    blocked(
      "sfc-scan-now",
      "SFC /scannow automatico",
      "Fica para Centro de Reparo com confirmacao forte.",
      "cmd",
      "medium",
      true,
      false,
    ),
    blocked(
      "dism-restore-health",
      "DISM RestoreHealth automatico",
      "Fica para Centro de Reparo com confirmacao forte.",
      "cmd",
      "medium",
      true,
      false,
    ),
  ],
  warnings: [],
};

export async function loadAdvancedCatalog(): Promise<AdvancedCatalog> {
  const cached = readLocalReportCache<AdvancedCatalog>("advanced-catalog");
  if (cached) {
    return cached;
  }

  return refreshAdvancedCatalog();
}

export async function refreshAdvancedCatalog(): Promise<AdvancedCatalog> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return fallbackAdvancedCatalog;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const catalog = await invoke<AdvancedCatalog>("advanced_engine_catalog");
    return writeLocalReportCache("advanced-catalog", catalog);
  } catch (error) {
    console.warn("Advanced Engine indisponivel, usando fallback local.", error);
    return fallbackAdvancedCatalog;
  }
}

export async function applyAdvancedActions(
  request: AdvancedApplyRequest,
): Promise<AdvancedApplyResult> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    throw new Error("Advanced Engine exige o backend Tauri.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<AdvancedApplyResult>("advanced_engine_apply", {
    request: forceSafeDryRun(request),
  });
}

export async function applyOptimizeNowAdvancedActions(
  request: AdvancedApplyRequest,
): Promise<AdvancedApplyResult> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    throw new Error("Advanced Engine exige o backend Tauri.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<AdvancedApplyResult>("advanced_engine_apply_optimize_now", { request });
}

export async function applyOptimizeNowGraphicsPreference(
  executablePath: string,
): Promise<AdvancedApplyResult> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    throw new Error("Advanced Engine exige o backend Tauri.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<AdvancedApplyResult>("advanced_set_graphics_high_performance_optimize_now", {
    executablePath,
  });
}

function action(
  id: string,
  title: string,
  description: string,
  method: AdvancedMethod,
  risk: AdvancedRisk,
  currentValue: string,
  plannedChange: string,
): AdvancedAction {
  return {
    id,
    title,
    description,
    method,
    risk,
    requiresAdmin: false,
    requiresExtreme: false,
    reversible: true,
    persistent: method !== "cmd" || id.includes("power-plan"),
    requiresRestart: false,
    currentValue,
    plannedChange,
    commandPreview: method === "cmd" ? "cmd allowlist" : "PowerShell Registro allowlist",
  };
}

function blocked(
  id: string,
  title: string,
  reason: string,
  method: AdvancedMethod,
  risk: AdvancedRisk,
  requiresAdmin: boolean,
  requiresExtreme: boolean,
): AdvancedBlockedAction {
  return { id, title, reason, method, risk, requiresAdmin, requiresExtreme };
}
