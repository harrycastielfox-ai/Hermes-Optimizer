import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const files = {
  otimizarRoute: readFileSync(join(root, "src", "routes", "otimizar.tsx"), "utf8"),
  smartModal: readFileSync(
    join(root, "src", "components", "optimization", "SmartOptimizeModal.tsx"),
    "utf8",
  ),
  advancedLib: readFileSync(join(root, "src", "lib", "advanced.ts"), "utf8"),
  optimizeAll: readFileSync(join(root, "src", "lib", "optimize-all.ts"), "utf8"),
  quickPrepare: readFileSync(join(root, "src", "lib", "quick-prepare.ts"), "utf8"),
  executionReport: readFileSync(join(root, "src", "lib", "execution-report.ts"), "utf8"),
};

const checks = [
  {
    name: "Botao 1 possui marcador estavel",
    ok: files.otimizarRoute.includes('data-testid="hermes-prepare-start"'),
  },
  {
    name: "Botao 2 possui marcador estavel",
    ok: files.otimizarRoute.includes('data-testid="hermes-optimize-start"'),
  },
  {
    name: "Botao 2 continua bloqueado antes da Fase 1",
    ok:
      files.otimizarRoute.includes("!quickPrepareGate") &&
      files.otimizarRoute.includes('data-testid="hermes-optimize-locked"') &&
      files.otimizarRoute.includes("Conclua a Fase 1 primeiro"),
  },
  {
    name: "Modal do Botao 2 possui marcador de QA",
    ok: files.smartModal.includes('data-testid="hermes-optimize-modal"'),
  },
  {
    name: "Fluxo do Botao 2 pausa para selecao de jogo",
    ok:
      files.smartModal.includes('setRunStatus("awaitingGame")') &&
      files.smartModal.includes("Escolha o jogo alvo para continuar.") &&
      files.smartModal.includes('data-testid="hermes-game-target-picker"'),
  },
  {
    name: "Fate Trigger segue como prioridade Gamer",
    ok:
      files.optimizeAll.includes('id: "preset-fate-trigger-ue5"') &&
      files.optimizeAll.includes('label: "Fate Trigger"') &&
      files.optimizeAll.includes('executable: "FateTrigger-Win64-Shipping.exe"') &&
      files.optimizeAll.includes("return 0;"),
  },
  {
    name: "Selecao Fate Trigger tem alvo testavel",
    ok: files.smartModal.includes("hermes-game-target-${target.id}"),
  },
  {
    name: "Sucesso do Botao 2 fica visivel sem relatorio tecnico longo",
    ok:
      files.smartModal.includes('data-testid="hermes-optimize-success"') &&
      files.smartModal.includes("Otimiza") &&
      files.smartModal.includes("conclu"),
  },
  {
    name: "Botao 2 comunica boot rapido e servicos sob demanda",
    ok:
      files.otimizarRoute.includes("Boot rápido, sistema e perfil recomendado") &&
      files.otimizarRoute.includes("Rede, serviços sob demanda, Gamer e Fate Trigger"),
  },
  {
    name: "Botao 2 usa wrappers Optimize Now para Clean e Advanced",
    ok:
      files.optimizeAll.includes("applyOptimizeNowCleanEngine") &&
      files.optimizeAll.includes("applyOptimizeNowAdvancedActions") &&
      !files.optimizeAll.includes("applyCleanEngine") &&
      !files.optimizeAll.includes("applyAdvancedActions({"),
  },
  {
    name: "Meta visual usa alvo central de 160 acoes",
    ok:
      files.executionReport.includes("HERMES_ACTION_TARGET = 160") &&
      files.otimizarRoute.includes("value: `${HERMES_ACTION_TARGET} ações`") &&
      files.smartModal.includes("${OPTIMIZE_AUDIT_ACTION_TARGET} ações auditáveis"),
  },
  {
    name: "Relatorio interno respeita retorno skipped da Advanced Engine",
    ok:
      files.smartModal.includes("mergeAdvancedExecutionDetails") &&
      files.smartModal.includes('if (status === "skipped") return "unavailable"') &&
      files.smartModal.includes("advancedActionIdFromReportAction"),
  },
  {
    name: "Resumo do motor avancado separa aplicado, validado, indisponivel e falha",
    ok:
      files.advancedLib.includes("formatAdvancedActionSummary") &&
      files.advancedLib.includes("summarizeAdvancedActionResults") &&
      files.optimizeAll.includes("formatAdvancedActionSummary") &&
      files.quickPrepare.includes("formatAdvancedActionSummary") &&
      files.smartModal.includes("formatAdvancedActionSummary") &&
      files.advancedLib.includes("summary[action.status] += 1"),
  },
];

const failed = checks.filter((check) => !check.ok);

for (const check of checks) {
  console.log(`${check.ok ? "OK" : "FAIL"} ${check.name}`);
}

if (failed.length > 0) {
  console.error("");
  console.error(`Fluxo Otimizar invalido: ${failed.length} verificacao(oes) falharam.`);
  process.exit(1);
}

console.log("");
console.log("Fluxo Otimizar validado: Botao 1, bloqueio da Fase 2, Fate Trigger e sucesso.");
