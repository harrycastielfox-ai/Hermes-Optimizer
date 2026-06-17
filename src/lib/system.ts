export type SystemSecurityContext = {
  isWindows: boolean;
  isElevated: boolean;
  username?: string;
  warnings: string[];
};

export type SystemAdminRelaunchResult = {
  attempted: boolean;
  alreadyElevated: boolean;
  executablePath?: string;
  message: string;
};

export const fallbackSystemSecurityContext: SystemSecurityContext = {
  isWindows: typeof navigator !== "undefined" ? /win/i.test(navigator.platform) : false,
  isElevated: false,
  warnings: ["Contexto administrativo indisponivel fora do backend Tauri."],
};

export async function readSystemSecurityContext(): Promise<SystemSecurityContext> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return fallbackSystemSecurityContext;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<SystemSecurityContext>("system_security_context_read");
  } catch (error) {
    console.warn("Contexto administrativo indisponivel.", error);
    return {
      ...fallbackSystemSecurityContext,
      warnings: [error instanceof Error ? error.message : String(error)],
    };
  }
}

export async function relaunchHermesAsAdmin(): Promise<SystemAdminRelaunchResult> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return {
      attempted: false,
      alreadyElevated: false,
      message: "Relancamento como administrador exige o aplicativo Tauri.",
    };
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<SystemAdminRelaunchResult>("system_relaunch_as_admin");
}
