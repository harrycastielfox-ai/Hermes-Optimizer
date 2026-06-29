import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function pathExists(relativePath) {
  return existsSync(join(root, relativePath));
}

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function routeTreeContains(routePath) {
  const routeTree = read("src/routeTree.gen.ts");
  return routeTree.includes(`'${routePath}'`) || routeTree.includes(`path: '${routePath}'`);
}

const checks = [];

function addCheck(name, ok) {
  checks.push({ name, ok: Boolean(ok) });
}

const visibleRoutes = [
  ["/", "src/routes/index.tsx"],
  ["/otimizar", "src/routes/otimizar.tsx"],
  ["/anti-cheat", "src/routes/anti-cheat.tsx"],
  ["/defender", "src/routes/defender.tsx"],
  ["/manutencao-programada", "src/routes/manutencao-programada.tsx"],
  ["/configuracoes", "src/routes/configuracoes.tsx"],
];

const preservedRoutes = [
  ["/diagnostico", "src/routes/diagnostico.tsx"],
  ["/central", "src/routes/central.tsx"],
  ["/limpeza", "src/routes/limpeza.tsx"],
  ["/inicializacao", "src/routes/inicializacao.tsx"],
  ["/reparar-windows", "src/routes/reparar-windows.tsx"],
  ["/seguranca", "src/routes/seguranca.tsx"],
  ["/personalizado", "src/routes/personalizado.tsx"],
  ["/perfis", "src/routes/perfis.tsx"],
  ["/otimizacoes", "src/routes/otimizacoes.tsx"],
  ["/preparar-ambiente", "src/routes/preparar-ambiente.tsx"],
];

const coreFrontendModules = [
  "src/lib/advanced.ts",
  "src/lib/advisor.ts",
  "src/lib/advisor-ai.ts",
  "src/lib/anti-cheat.ts",
  "src/lib/benchmark.ts",
  "src/lib/clean.ts",
  "src/lib/diagnostic.ts",
  "src/lib/execution-report.ts",
  "src/lib/execution-verification.ts",
  "src/lib/gamer.ts",
  "src/lib/gamer-dependencies.ts",
  "src/lib/optimize-all.ts",
  "src/lib/optimize-audit-catalog.ts",
  "src/lib/optimizer.ts",
  "src/lib/performance.ts",
  "src/lib/profiles.ts",
  "src/lib/quick-prepare.ts",
  "src/lib/restore.ts",
  "src/lib/safe-mode.ts",
  "src/lib/startup.ts",
  "src/lib/system.ts",
];

const coreBackendModules = [
  "src-tauri/src/advanced.rs",
  "src-tauri/src/advisor.rs",
  "src-tauri/src/advisor_ai_engine.rs",
  "src-tauri/src/anti_cheat.rs",
  "src-tauri/src/benchmark.rs",
  "src-tauri/src/clean.rs",
  "src-tauri/src/diagnostic.rs",
  "src-tauri/src/gamer.rs",
  "src-tauri/src/gamer_dependencies.rs",
  "src-tauri/src/optimizer.rs",
  "src-tauri/src/performance.rs",
  "src-tauri/src/profiles.rs",
  "src-tauri/src/restore.rs",
  "src-tauri/src/safe_mode.rs",
  "src-tauri/src/startup.rs",
  "src-tauri/src/system.rs",
];

const criticalComponents = [
  "src/components/ai/HermesAiCenter.tsx",
  "src/components/analysis/GlobalAnalysisModal.tsx",
  "src/components/common/HermesWindowChrome.tsx",
  "src/components/common/SafeTestModeNotice.tsx",
  "src/components/dashboard/Sidebar.tsx",
  "src/components/optimization/QuickPrepareModal.tsx",
  "src/components/optimization/RestartPrompt.tsx",
  "src/components/optimization/SmartOptimizeModal.tsx",
  "src/components/settings/HermesAdminSettings.tsx",
  "src/components/settings/HermesRepairCenter.tsx",
  "src/components/settings/HermesSchedulerCenter.tsx",
];

const decisionDocs = [
  "docs/roadmap-funcional.md",
  "docs/roadmap-mestre-hermes-30-dias.md",
  "docs/BOTAO1_PREPARAR_PC_REAL.md",
  "docs/BOTAO2_OTIMIZAR_TUDO_REAL.md",
  "docs/relatorio-interno-release-0.1.0.md",
  "docs/release-qa-checklist.md",
  "docs/licenciamento-release-0.1.0.md",
  "docs/futuro-hermes-auth.md",
  "docs/analise-p3ninha-observacoes.md",
  "docs/analise-igust-windows-boost.md",
];

for (const [routePath, file] of visibleRoutes) {
  addCheck(`Rota principal preservada: ${routePath}`, pathExists(file));
  addCheck(`RouteTree registra rota principal: ${routePath}`, routeTreeContains(routePath));
}

for (const [routePath, file] of preservedRoutes) {
  addCheck(`Rota preservada fora da sidebar: ${routePath}`, pathExists(file));
  addCheck(`RouteTree registra rota preservada: ${routePath}`, routeTreeContains(routePath));
}

for (const file of coreFrontendModules) {
  addCheck(`Modulo frontend preservado: ${file}`, pathExists(file));
}

for (const file of coreBackendModules) {
  addCheck(`Modulo backend preservado: ${file}`, pathExists(file));
}

for (const file of criticalComponents) {
  addCheck(`Componente critico preservado: ${file}`, pathExists(file));
}

for (const file of decisionDocs) {
  addCheck(`Documento de decisao preservado: ${file}`, pathExists(file));
}

const sidebar = read("src/components/dashboard/Sidebar.tsx");
addCheck(
  "Sidebar continua simples, sem reexpor ferramentas antigas",
  visibleRoutes.every(([routePath]) => sidebar.includes(`to: "${routePath}"`)) &&
    preservedRoutes.every(([routePath]) => !sidebar.includes(`to: "${routePath}"`)),
);

const optimizeAll = read("src/lib/optimize-all.ts");
addCheck(
  "Botao 2 preserva alvo Fate Trigger/UE5",
  optimizeAll.includes("Fate Trigger") && optimizeAll.includes("FateTrigger-Win64-Shipping.exe"),
);
addCheck(
  "Botao 2 preserva motores Clean e Advanced via Optimize Now",
  optimizeAll.includes("applyOptimizeNowCleanEngine") &&
    optimizeAll.includes("applyOptimizeNowAdvancedActions"),
);

const auditCatalog = read("src/lib/optimize-audit-catalog.ts");
const executionReport = read("src/lib/execution-report.ts");
addCheck(
  "Catalogo preserva alvo derivado do tamanho real",
  auditCatalog.includes("OPTIMIZE_AUDIT_ACTION_TARGET = OPTIMIZE_AUDIT_ACTIONS.length"),
);
addCheck(
  "Relatorio de execucao preserva meta de 160 acoes",
  executionReport.includes("HERMES_ACTION_TARGET = 160"),
);

const failed = checks.filter((check) => !check.ok);

for (const check of checks) {
  console.log(`${check.ok ? "OK" : "FAIL"} ${check.name}`);
}

if (failed.length > 0) {
  console.error("");
  console.error(
    `Preservacao de funcionalidades invalida: ${failed.length} verificacao(oes) falharam.`,
  );
  process.exit(1);
}

console.log("");
console.log(
  "Preservacao validada: rotas, motores, componentes e documentos importantes continuam protegidos.",
);
