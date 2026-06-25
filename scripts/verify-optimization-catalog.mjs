import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const catalogPath = "src/lib/optimize-audit-catalog.ts";
const source = fs.readFileSync(catalogPath, "utf8");
const executableStart = source.indexOf("export const OPTIMIZE_AUDIT_PHASES");

if (executableStart < 0) {
  fail("OPTIMIZE_AUDIT_PHASES nao encontrado.");
}

let executableSource = source.slice(executableStart);
executableSource = executableSource.replace(/export const /g, "const ");
executableSource = executableSource.replace(/export function /g, "function ");
executableSource +=
  "\nmodule.exports = { OPTIMIZE_AUDIT_ACTIONS, OPTIMIZE_AUDIT_ACTION_TARGET, OPTIMIZE_AUDIT_PHASES };";

const javascript = ts.transpileModule(executableSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const sandbox = {
  module: { exports: {} },
  exports: {},
  isGamerDependencyInstallerAction: (slug) =>
    /^vc-redist-/.test(slug) || slug === "directx-runtime",
};

vm.runInNewContext(javascript, sandbox, { filename: catalogPath });

const { OPTIMIZE_AUDIT_ACTIONS, OPTIMIZE_AUDIT_ACTION_TARGET, OPTIMIZE_AUDIT_PHASES } =
  sandbox.module.exports;

const expectedPhases = [
  "plan",
  "safety",
  "components",
  "cleanup",
  "startup",
  "performance",
  "gamer",
  "profile",
  "manual",
];

assert(Array.isArray(OPTIMIZE_AUDIT_ACTIONS), "Catalogo de acoes invalido.");
assert(Array.isArray(OPTIMIZE_AUDIT_PHASES), "Catalogo de fases invalido.");
assert(
  OPTIMIZE_AUDIT_ACTION_TARGET === OPTIMIZE_AUDIT_ACTIONS.length,
  "OPTIMIZE_AUDIT_ACTION_TARGET precisa bater com o tamanho real do catalogo.",
);
assert(
  OPTIMIZE_AUDIT_ACTIONS.length >= 150,
  "O catalogo de Otimizar Tudo precisa manter pelo menos 150 acoes auditaveis.",
);

const actualPhases = new Set(OPTIMIZE_AUDIT_PHASES.map((phase) => phase.phaseId));
for (const phaseId of expectedPhases) {
  assert(actualPhases.has(phaseId), `Fase obrigatoria ausente: ${phaseId}.`);
}

const implementedActions = OPTIMIZE_AUDIT_ACTIONS.filter((action) => action.implemented).length;
const plannedActions = OPTIMIZE_AUDIT_ACTIONS.length - implementedActions;
assert(
  implementedActions >= 90,
  "O catalogo nao pode regredir abaixo de 90 acoes implementadas/motoradas.",
);

console.log("Hermes optimization catalog: OK");
console.log(`- Acoes auditaveis: ${OPTIMIZE_AUDIT_ACTIONS.length}`);
console.log(`- Acoes implementadas/motoradas: ${implementedActions}`);
console.log(`- Acoes planejadas ou indisponiveis: ${plannedActions}`);
console.log(`- Fases: ${OPTIMIZE_AUDIT_PHASES.length}`);

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function fail(message) {
  console.error(`Hermes optimization catalog: FALHOU - ${message}`);
  process.exit(1);
}
