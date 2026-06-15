export const HERMES_SAFE_TEST_MODE = true;

export const HERMES_SAFE_TEST_MODE_MESSAGE =
  "Modo Seguro de Teste ativo - nenhuma alteracao real sera aplicada.";

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
