import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

const files = {
  rootRoute: read("src/routes/__root.tsx"),
  errorPage: read("src/lib/error-page.ts"),
  errorReporting: read("src/lib/lovable-error-reporting.ts"),
};

const forbiddenRootCopy = [
  "@Lovable",
  ".lovable.app",
  "Page not found",
  "This page didn't load",
  "Something went wrong",
  "Try again",
  "Go home",
];

const mojibakePatterns = ["Ã£", "Ã¡", "Ã©", "Ã­", "Ã³", "Ãº", "Ã§", "NÃ", "nÃ", "Â"];

const checks = [
  {
    name: "Root usa metadata Hermes sem starter remoto",
    ok:
      files.rootRoute.includes('@HermesOptimizer"') &&
      files.rootRoute.includes('content: "/hermes-logo.png"') &&
      forbiddenRootCopy.every((fragment) => !files.rootRoute.includes(fragment)),
  },
  {
    name: "Tela 404 e erro root estao em portugues",
    ok:
      files.rootRoute.includes("Página não encontrada") &&
      files.rootRoute.includes("Esta tela não carregou") &&
      files.rootRoute.includes("Voltar ao Dashboard") &&
      files.rootRoute.includes("Tentar novamente"),
  },
  {
    name: "Pagina HTML de erro esta em pt-BR",
    ok:
      files.errorPage.includes('<html lang="pt-BR">') &&
      files.errorPage.includes("Esta tela não carregou") &&
      files.errorPage.includes("Voltar ao Dashboard") &&
      forbiddenRootCopy.every((fragment) => !files.errorPage.includes(fragment)),
  },
  {
    name: "Wrapper de erro usa nome generico Hermes",
    ok:
      files.errorReporting.includes("reportClientError") &&
      !files.errorReporting.includes("reportLovableError") &&
      !files.errorReporting.includes("type Lovable"),
  },
  {
    name: "Arquivos de copy principal nao possuem mojibake",
    ok: Object.values(files).every((content) =>
      mojibakePatterns.every((fragment) => !content.includes(fragment)),
    ),
  },
];

const failed = checks.filter((check) => !check.ok);

for (const check of checks) {
  console.log(`${check.ok ? "OK" : "FAIL"} ${check.name}`);
}

if (failed.length > 0) {
  console.error("");
  console.error(`Branding/copy invalido: ${failed.length} verificacao(oes) falharam.`);
  process.exit(1);
}

console.log("");
console.log("Branding e textos principais validados.");
