const SAFE_TEST_MODE_ENV = import.meta.env.VITE_HERMES_SAFE_TEST_MODE;

export const HERMES_SAFE_TEST_MODE = parseSafeModeFlag(SAFE_TEST_MODE_ENV) ?? true;

export const HERMES_SAFE_TEST_MODE_MESSAGE =
  "Modo Seguro de Teste ativo - nenhuma alteração real será aplicada.";

export function forceSafeDryRun<T extends { confirmed: boolean; dryRun?: boolean }>(request: T): T {
  if (!HERMES_SAFE_TEST_MODE) {
    return request;
  }

  return {
    ...request,
    confirmed: false,
    dryRun: true,
  };
}

export function modeLabel(dryRun?: boolean) {
  if (HERMES_SAFE_TEST_MODE) {
    return "DRY-RUN | BLOQUEADO";
  }

  return dryRun ? "DRY-RUN" : "REAL";
}

function parseSafeModeFlag(value: unknown): boolean | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (["0", "false", "off", "real", "release"].includes(normalized)) {
    return false;
  }
  if (["1", "true", "on", "test", "safe", "dry-run"].includes(normalized)) {
    return true;
  }

  return null;
}
