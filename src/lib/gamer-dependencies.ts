import type { AdvancedCatalog } from "@/lib/advanced";
import { forceSafeDryRun } from "@/lib/safe-mode";

export type GamerDependencyFamily = "vcredist" | "directx";
export type GamerDependencyArchitecture = "x86" | "x64" | "web";

export type GamerDependencyPackage = {
  id: string;
  title: string;
  family: GamerDependencyFamily;
  version: string;
  architecture: GamerDependencyArchitecture;
  installerFileName: string;
  officialSourcePage: string;
  officialUrl?: string;
  expectedSha256?: string;
  requiredPublisher: "Microsoft Corporation";
  signatureSubject?: string;
  installCommand: string;
  officialSourceStatus: "sourcePageVerified" | "downloadUrlVerified" | "pendingOfficialUrl";
  expectedSha256Status: "requiredBeforeInstall";
  signatureStatus: "requiredBeforeInstall";
};

export type GamerDependencyInstallQueueItem = {
  packageId: string;
  title: string;
  installerFileName: string;
  installCommand: string;
  blocked: true;
  blockedReason: string;
  requiredChecks: string[];
};

export type GamerDependencyInstallPlan = {
  totalPackages: number;
  blockedPackages: number;
  canExecute: false;
  queue: GamerDependencyInstallQueueItem[];
};

export type GamerDependencyVerificationStatus = "missing" | "blocked" | "verified" | "failed";

export type GamerDependencyVerificationItem = {
  packageId: string;
  title: string;
  installerFileName: string;
  officialSourcePage: string;
  officialUrl?: string;
  cachedPath: string;
  fileExists: boolean;
  status: GamerDependencyVerificationStatus;
  sha256?: string;
  expectedSha256?: string;
  sha256Matches?: boolean;
  signatureStatus?: string;
  signatureSubject?: string;
  publisherMatches?: boolean;
  blockedReasons: string[];
};

export type GamerDependencyVerificationReport = {
  generatedAt: string;
  engineVersion: string;
  cacheDir: string;
  totalPackages: number;
  readyCount: number;
  blockedCount: number;
  packages: GamerDependencyVerificationItem[];
  warnings: string[];
};

export type GamerDependencyDownloadResult = {
  downloadedCount: number;
  skippedCount: number;
  failedCount: number;
  messages: string[];
  report: GamerDependencyVerificationReport;
};

export type GamerDependencyInstallActionStatus =
  | "dryRun"
  | "installed"
  | "skipped"
  | "failed"
  | "blocked";

export type GamerDependencyInstallActionResult = {
  packageId: string;
  title: string;
  installerFileName: string;
  status: GamerDependencyInstallActionStatus;
  message: string;
  commandPreview: string;
};

export type GamerDependencyInstallResult = {
  generatedAt: string;
  engineVersion: string;
  dryRun: boolean;
  installedCount: number;
  skippedCount: number;
  failedCount: number;
  blockedCount: number;
  actions: GamerDependencyInstallActionResult[];
  message: string;
  report: GamerDependencyVerificationReport;
};

export type GamerDependencyInstallRequest = {
  confirmed: boolean;
  dryRun?: boolean;
  packageIds?: string[];
};

export type GamerDependencyVerifyRequest = {
  packages: Array<{
    id: string;
    title: string;
    installerFileName: string;
    officialSourcePage: string;
    officialUrl?: string;
    expectedSha256?: string;
    requiredPublisher: "Microsoft Corporation";
  }>;
};

export type GamerDependencyReadiness = {
  summary: string;
  totalPackages: number;
  blockedCount: number;
  readyCount: number;
  detectedSummary: string;
  packages: GamerDependencyPackage[];
  installPlan: GamerDependencyInstallPlan;
  verification?: GamerDependencyVerificationReport;
  blockers: string[];
};

const VCRUNTIME_YEARS = ["2005", "2008", "2010", "2012", "2013", "2015-2022"] as const;

export const GAMER_DEPENDENCY_PACKAGES: GamerDependencyPackage[] = [
  ...VCRUNTIME_YEARS.flatMap((year) => [vcRedist(year, "x86"), vcRedist(year, "x64")]),
  {
    id: "directx-end-user-runtime",
    title: "DirectX End-User Runtime",
    family: "directx",
    version: "legacy-runtime",
    architecture: "web",
    installerFileName: "dxwebsetup.exe",
    requiredPublisher: "Microsoft Corporation",
    installCommand: "dxwebsetup.exe /Q",
    officialSourcePage: "https://www.microsoft.com/en-us/download/details.aspx?id=35",
    officialSourceStatus: "sourcePageVerified",
    expectedSha256Status: "requiredBeforeInstall",
    signatureStatus: "requiredBeforeInstall",
  },
];

export function buildGamerDependencyReadiness(
  advancedCatalog?: AdvancedCatalog,
  verification?: GamerDependencyVerificationReport,
): GamerDependencyReadiness {
  const installPlan = buildGamerDependencyInstallPlan();
  const dependencyCheck = advancedCatalog?.actions.find(
    (action) => action.id === "check-gamer-dependencies",
  );
  const detectedSummary =
    dependencyCheck?.currentValue && dependencyCheck.currentValue !== "Indisponível"
      ? dependencyCheck.currentValue
      : "Leitura local ainda não retornou VC++/DirectX.";
  const blockers = [
    "Downloads diretos legados seguem bloqueados até validação final da Microsoft.",
    "SHA256 esperado precisa ser preenchido antes de qualquer download/instalação.",
    "Assinatura Authenticode Microsoft precisa ser validada antes de executar.",
  ];
  const readyCount = verification?.readyCount ?? 0;
  const blockedCount = verification?.blockedCount ?? installPlan.blockedPackages;
  const summary = verification
    ? `${verification.totalPackages} dependência(s) gamer verificadas no cache; ${readyCount} pronta(s), ${blockedCount} bloqueada(s).`
    : `${GAMER_DEPENDENCY_PACKAGES.length} dependência(s) gamer mapeada(s); instalação bloqueada até hash e assinatura.`;

  return {
    summary,
    totalPackages: GAMER_DEPENDENCY_PACKAGES.length,
    blockedCount,
    readyCount,
    detectedSummary,
    packages: GAMER_DEPENDENCY_PACKAGES,
    installPlan,
    verification,
    blockers,
  };
}

export function buildGamerDependencyInstallPlan(): GamerDependencyInstallPlan {
  const queue = GAMER_DEPENDENCY_PACKAGES.map((item) => ({
    packageId: item.id,
    title: item.title,
    installerFileName: item.installerFileName,
    installCommand: item.installCommand,
    blocked: true as const,
    blockedReason:
      "Aguardando SHA256 esperado, assinatura Authenticode e checagem local antes de instalar.",
    requiredChecks: [
      "Fonte oficial Microsoft",
      "Hash SHA256 esperado",
      "Assinatura Authenticode: Microsoft Corporation",
      "Detecção local para evitar reinstalação desnecessária",
    ],
  }));

  return {
    totalPackages: queue.length,
    blockedPackages: queue.length,
    canExecute: false,
    queue,
  };
}

export function buildGamerDependencyVerifyRequest(): GamerDependencyVerifyRequest {
  return {
    packages: GAMER_DEPENDENCY_PACKAGES.map((item) => ({
      id: item.id,
      title: item.title,
      installerFileName: item.installerFileName,
      officialSourcePage: item.officialSourcePage,
      officialUrl: item.officialUrl,
      expectedSha256: item.expectedSha256,
      requiredPublisher: item.requiredPublisher,
    })),
  };
}

export function buildGamerDependencyInstallPayload(request: GamerDependencyInstallRequest) {
  return {
    ...forceSafeDryRun(request),
    packages: buildGamerDependencyVerifyRequest().packages,
  };
}

export async function verifyGamerDependencyInstallers(): Promise<GamerDependencyVerificationReport> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return fallbackGamerDependencyVerificationReport();
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<GamerDependencyVerificationReport>("gamer_dependency_verify_installers", {
      request: buildGamerDependencyVerifyRequest(),
    });
  } catch (error) {
    console.warn("Verificador de dependências gamer indisponível.", error);
    return {
      ...fallbackGamerDependencyVerificationReport(),
      warnings: [error instanceof Error ? error.message : String(error)],
    };
  }
}

export async function openGamerDependencyCacheDir(): Promise<string> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    throw new Error("Cache de instaladores disponivel apenas no aplicativo Hermes.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<string>("gamer_dependency_open_cache_dir");
}

export async function downloadOfficialGamerDependencyInstallers(): Promise<GamerDependencyDownloadResult> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    throw new Error("Download oficial disponivel apenas no aplicativo Hermes.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<GamerDependencyDownloadResult>(
    "gamer_dependency_download_official_installers",
    {
      request: buildGamerDependencyVerifyRequest(),
    },
  );
}

export async function installVerifiedGamerDependencies(
  request: GamerDependencyInstallRequest,
): Promise<GamerDependencyInstallResult> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    throw new Error("Instalador gamer disponivel apenas no aplicativo Hermes.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<GamerDependencyInstallResult>("gamer_dependency_install_verified", {
    request: buildGamerDependencyInstallPayload(request),
  });
}

export function isGamerDependencyInstallerAction(actionId: string) {
  return (
    actionId.startsWith("vc-redist-") ||
    actionId === "directx-runtime" ||
    actionId === "directx-end-user-runtime"
  );
}

function fallbackGamerDependencyVerificationReport(): GamerDependencyVerificationReport {
  return {
    generatedAt: "0",
    engineVersion: "gamer-dependencies-verifier-fallback-v1",
    cacheDir: "Indisponível fora do backend Tauri",
    totalPackages: GAMER_DEPENDENCY_PACKAGES.length,
    readyCount: 0,
    blockedCount: GAMER_DEPENDENCY_PACKAGES.length,
    packages: GAMER_DEPENDENCY_PACKAGES.map((item) => ({
      packageId: item.id,
      title: item.title,
      installerFileName: item.installerFileName,
      officialSourcePage: item.officialSourcePage,
      officialUrl: item.officialUrl,
      cachedPath: "Indisponível",
      fileExists: false,
      status: "missing",
      expectedSha256: item.expectedSha256,
      blockedReasons: ["Verificação real disponível apenas no aplicativo Tauri."],
    })),
    warnings: ["Verificador real indisponível fora do backend Tauri."],
  };
}

function vcRedist(
  year: (typeof VCRUNTIME_YEARS)[number],
  architecture: "x86" | "x64",
): GamerDependencyPackage {
  const normalizedYear = year.replace("-", "_");
  const source = vcRedistSource(year, architecture);

  return {
    id: `vc-redist-${year}-${architecture}`,
    title: `Microsoft Visual C++ ${year} Redistributable ${architecture}`,
    family: "vcredist",
    version: year,
    architecture,
    installerFileName: `vcredist_${normalizedYear}_${architecture}.exe`,
    officialSourcePage: source.sourcePage,
    officialUrl: source.downloadUrl,
    requiredPublisher: "Microsoft Corporation",
    installCommand: `vcredist_${normalizedYear}_${architecture}.exe /quiet /norestart`,
    officialSourceStatus: source.downloadUrl ? "downloadUrlVerified" : "sourcePageVerified",
    expectedSha256Status: "requiredBeforeInstall",
    signatureStatus: "requiredBeforeInstall",
  };
}

function vcRedistSource(
  year: (typeof VCRUNTIME_YEARS)[number],
  architecture: "x86" | "x64",
): { sourcePage: string; downloadUrl?: string } {
  const learnPage =
    "https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?view=msvc-170";

  if (year === "2015-2022") {
    return {
      sourcePage: learnPage,
      downloadUrl: `https://aka.ms/vc14/vc_redist.${architecture}.exe`,
    };
  }

  if (year === "2012") {
    return {
      sourcePage: "https://www.microsoft.com/en-us/download/details.aspx?id=30679",
    };
  }

  if (year === "2010") {
    return {
      sourcePage: "https://www.microsoft.com/en-us/download/details.aspx?id=26999",
    };
  }

  if (year === "2008") {
    return {
      sourcePage: "https://www.microsoft.com/en-us/download/details.aspx?id=11895",
    };
  }

  if (year === "2013") {
    return {
      sourcePage: "https://www.microsoft.com/en-us/download/details.aspx?id=40784",
    };
  }

  return {
    sourcePage: "https://www.microsoft.com/en-us/download/details.aspx?id=26347",
  };
}
