import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const manifestPath = "src/lib/gamer-dependencies.ts";
const source = fs.readFileSync(manifestPath, "utf8");

let executableSource = source.replace(/^import[\s\S]*?;\r?\n/gm, "");
executableSource = executableSource.replace(/export type /g, "type ");
executableSource = executableSource.replace(/export const /g, "const ");
executableSource = executableSource.replace(/export function /g, "function ");
executableSource = executableSource.replace(/export async function /g, "async function ");
executableSource += `
module.exports = {
  GAMER_DEPENDENCY_PACKAGES,
  GAMER_DEPENDENCY_EXCLUDED_TOOLCHAIN,
  buildGamerDependencyDownloadPayload,
  buildGamerDependencyInstallPlan,
  buildGamerDependencyVerifyRequest,
};
`;

const javascript = ts.transpileModule(executableSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const sandbox = {
  module: { exports: {} },
  exports: {},
  console,
  forceSafeDryRun: (request) => ({ ...request, dryRun: true }),
};

vm.runInNewContext(javascript, sandbox, { filename: manifestPath });

const {
  GAMER_DEPENDENCY_PACKAGES,
  GAMER_DEPENDENCY_EXCLUDED_TOOLCHAIN,
  buildGamerDependencyDownloadPayload,
  buildGamerDependencyInstallPlan,
  buildGamerDependencyVerifyRequest,
} = sandbox.module.exports;

assert(Array.isArray(GAMER_DEPENDENCY_PACKAGES), "Lista de dependencias gamer invalida.");
assert(Array.isArray(GAMER_DEPENDENCY_EXCLUDED_TOOLCHAIN), "Lista de toolchain excluida invalida.");
assert(
  GAMER_DEPENDENCY_PACKAGES.length === 13,
  "Manifesto gamer precisa mapear 12 VC++ Redistributable + DirectX End-User Runtime.",
);

const ids = new Set();
const fileNames = new Set();
const missingSha = [];
const installPlan = buildGamerDependencyInstallPlan();
const verifyRequest = buildGamerDependencyVerifyRequest();
const downloadPayload = buildGamerDependencyDownloadPayload();

assert(
  verifyRequest.packages.length === GAMER_DEPENDENCY_PACKAGES.length,
  "Request de verificacao precisa cobrir todos os pacotes do manifesto.",
);
assert(
  downloadPayload.packages.length === GAMER_DEPENDENCY_PACKAGES.length,
  "Payload de download precisa devolver relatorio completo de todos os pacotes.",
);

for (const item of GAMER_DEPENDENCY_PACKAGES) {
  assert(item.id && !ids.has(item.id), `ID duplicado ou vazio: ${item.id}`);
  ids.add(item.id);

  assert(item.title, `Titulo ausente em ${item.id}.`);
  assert(
    item.requiredPublisher === "Microsoft Corporation",
    `${item.id} precisa exigir Microsoft Corporation como publisher.`,
  );
  assert(
    item.expectedSha256Status === "requiredBeforeInstall",
    `${item.id} precisa manter SHA256 obrigatorio antes de instalar.`,
  );
  assert(
    item.signatureStatus === "requiredBeforeInstall",
    `${item.id} precisa manter assinatura obrigatoria antes de instalar.`,
  );
  assert(
    /^[^/\\]+\.exe$/i.test(item.installerFileName),
    `${item.id} precisa usar installerFileName .exe simples, sem caminho.`,
  );
  assert(
    !fileNames.has(item.installerFileName.toLowerCase()),
    `installerFileName duplicado: ${item.installerFileName}`,
  );
  fileNames.add(item.installerFileName.toLowerCase());

  if (item.officialUrl) {
    assert(
      /^https:\/\/(aka\.ms\/|www\.microsoft\.com\/|download\.microsoft\.com\/)/i.test(
        item.officialUrl,
      ),
      `${item.id} usa URL fora da allowlist Microsoft/aka.ms.`,
    );
  }

  if (item.expectedSha256) {
    assert(/^[a-f0-9]{64}$/i.test(item.expectedSha256), `${item.id} tem SHA256 invalido.`);
  } else {
    missingSha.push(item.id);
  }
}

assert(
  GAMER_DEPENDENCY_EXCLUDED_TOOLCHAIN.length >= 5,
  "Toolchains pesadas observadas precisam continuar excluidas do pacote gamer automatico.",
);

const approvedCount = GAMER_DEPENDENCY_PACKAGES.length - missingSha.length;
const readyQueue = installPlan.queue.filter((item) => item.manifestReady);
const blockedQueue = installPlan.queue.filter((item) => item.blocked);
const approvedIds = GAMER_DEPENDENCY_PACKAGES.filter((item) => item.expectedSha256).map(
  (item) => item.id,
);

assert(
  installPlan.approvedPackages === approvedCount,
  "Plano gamer precisa contar apenas pacotes com SHA256 aprovado como liberados.",
);
assert(
  installPlan.blockedPackages === missingSha.length,
  "Plano gamer precisa manter bloqueado tudo que ainda nao tem SHA256 aprovado.",
);
assert(
  installPlan.canExecute === approvedCount > 0,
  "Plano gamer so pode executar quando houver pelo menos um pacote aprovado.",
);
assert(
  readyQueue.length === approvedCount && readyQueue.every((item) => !item.blocked),
  "Fila gamer pronta nao pode marcar pacotes aprovados como bloqueados.",
);
assert(
  blockedQueue.length === missingSha.length,
  "Fila gamer bloqueada precisa bater com os pacotes sem SHA256.",
);
assert(
  Array.isArray(downloadPayload.packageIds) &&
    downloadPayload.packageIds.length === approvedIds.length &&
    downloadPayload.packageIds.every((id) => approvedIds.includes(id)),
  "Payload de download deve pedir somente pacotes com manifesto aprovado.",
);

console.log("Hermes gamer dependency manifest: OK");
console.log(`- Dependencias mapeadas: ${GAMER_DEPENDENCY_PACKAGES.length}`);
console.log(`- Com SHA256 aprovado: ${approvedCount}`);
console.log(`- Bloqueadas aguardando SHA256: ${missingSha.length}`);
console.log(`- Toolchains excluidas: ${GAMER_DEPENDENCY_EXCLUDED_TOOLCHAIN.length}`);

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function fail(message) {
  console.error(`Hermes gamer dependency manifest: FALHOU - ${message}`);
  process.exit(1);
}
