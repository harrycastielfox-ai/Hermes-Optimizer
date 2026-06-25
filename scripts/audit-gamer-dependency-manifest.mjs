import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const manifestPath = "src/lib/gamer-dependencies.ts";
const outputDir = path.resolve(".release", "gamer-dependency-audit");
const refresh = process.argv.includes("--refresh");
const onlyArg = process.argv.find((arg) => arg.startsWith("--only="));
const onlyIds = new Set(
  onlyArg
    ? onlyArg
        .slice("--only=".length)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [],
);

const packages = loadPackages();
fs.mkdirSync(outputDir, { recursive: true });

const results = [];
for (const item of packages) {
  if (onlyIds.size > 0 && !onlyIds.has(item.id)) {
    continue;
  }

  results.push(auditPackage(item));
}

const report = {
  generatedAt: new Date().toISOString(),
  outputDir,
  totalPackages: results.length,
  audited: results.filter((item) => item.status === "audited").length,
  cached: results.filter((item) => item.status === "cached").length,
  skipped: results.filter((item) => item.status === "skipped").length,
  failed: results.filter((item) => item.status === "failed").length,
  results,
};

fs.writeFileSync(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);

console.log("Hermes gamer dependency audit:");
console.log(`- Pasta: ${outputDir}`);
console.log(`- Auditados: ${report.audited}`);
console.log(`- Cache: ${report.cached}`);
console.log(`- Pulados: ${report.skipped}`);
console.log(`- Falhas: ${report.failed}`);
for (const item of results) {
  console.log(`- ${item.id}: ${item.status} - ${item.message}`);
  if (item.manifestLine) {
    console.log(`  ${item.manifestLine}`);
  }
}

if (report.failed > 0) {
  process.exitCode = 1;
}

function auditPackage(item) {
  if (!item.officialUrl) {
    return {
      id: item.id,
      title: item.title,
      status: "skipped",
      message: "Sem URL direta oficial no manifesto.",
    };
  }

  if (
    !/^https:\/\/(aka\.ms\/|www\.microsoft\.com\/|download\.microsoft\.com\/)/i.test(
      item.officialUrl,
    )
  ) {
    return {
      id: item.id,
      title: item.title,
      status: "failed",
      message: "URL fora da allowlist Microsoft/aka.ms.",
      officialUrl: item.officialUrl,
    };
  }

  if (!/^[^/\\]+\.exe$/i.test(item.installerFileName)) {
    return {
      id: item.id,
      title: item.title,
      status: "failed",
      message: "Nome do instalador precisa ser .exe simples, sem caminho.",
    };
  }

  const targetPath = path.join(outputDir, item.installerFileName);
  const wasCached = fs.existsSync(targetPath) && !refresh;

  try {
    if (!wasCached) {
      downloadFile(item.officialUrl, targetPath);
    }

    const probe = probeFile(targetPath);
    const signatureValid = probe.signatureStatus?.toLowerCase() === "valid";
    const publisherMatches = (probe.signatureSubject ?? "")
      .toLowerCase()
      .includes(item.requiredPublisher.toLowerCase());

    if (!signatureValid || !publisherMatches) {
      return {
        id: item.id,
        title: item.title,
        status: "failed",
        message: "Assinatura ou publisher nao passou na validacao.",
        officialUrl: item.officialUrl,
        targetPath,
        ...probe,
        publisherMatches,
      };
    }

    return {
      id: item.id,
      title: item.title,
      status: wasCached ? "cached" : "audited",
      message: "Instalador oficial validado; SHA256 pronto para o manifesto.",
      officialUrl: item.officialUrl,
      targetPath,
      ...probe,
      publisherMatches,
      manifestLine: `expectedSha256: "${probe.sha256}",`,
    };
  } catch (error) {
    return {
      id: item.id,
      title: item.title,
      status: "failed",
      message: error instanceof Error ? error.message : String(error),
      officialUrl: item.officialUrl,
      targetPath,
    };
  }
}

function downloadFile(url, targetPath) {
  const script = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri $env:HERMES_AUDIT_URL -OutFile $env:HERMES_AUDIT_PATH -UseBasicParsing
`;
  runPowerShell(script, {
    HERMES_AUDIT_URL: url,
    HERMES_AUDIT_PATH: targetPath,
  });
}

function probeFile(targetPath) {
  const script = `
$ErrorActionPreference = 'Stop'
$hash = Get-FileHash -Algorithm SHA256 -Path $env:HERMES_AUDIT_PATH
$signature = Get-AuthenticodeSignature -FilePath $env:HERMES_AUDIT_PATH
$subject = $null
if ($signature.SignerCertificate) { $subject = $signature.SignerCertificate.Subject }
[pscustomobject]@{
  sha256 = $hash.Hash
  signatureStatus = [string]$signature.Status
  signatureSubject = $subject
} | ConvertTo-Json -Compress
`;
  return JSON.parse(
    runPowerShell(script, {
      HERMES_AUDIT_PATH: targetPath,
    }),
  );
}

function runPowerShell(script, extraEnv) {
  return execFileSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
    {
      encoding: "utf8",
      env: { ...process.env, ...extraEnv },
      stdio: ["ignore", "pipe", "pipe"],
    },
  ).trim();
}

function loadPackages() {
  const source = fs.readFileSync(manifestPath, "utf8");
  let executableSource = source.replace(/^import[\s\S]*?;\r?\n/gm, "");
  executableSource = executableSource.replace(/export type /g, "type ");
  executableSource = executableSource.replace(/export const /g, "const ");
  executableSource = executableSource.replace(/export function /g, "function ");
  executableSource = executableSource.replace(/export async function /g, "async function ");
  executableSource += "\nmodule.exports = { GAMER_DEPENDENCY_PACKAGES };";

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

  return sandbox.module.exports.GAMER_DEPENDENCY_PACKAGES;
}
