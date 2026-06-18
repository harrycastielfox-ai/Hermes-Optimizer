import type { AdvancedCatalog } from "@/lib/advanced";

export type GamerDependencyFamily = "vcredist" | "directx";
export type GamerDependencyArchitecture = "x86" | "x64" | "web";

export type GamerDependencyPackage = {
  id: string;
  title: string;
  family: GamerDependencyFamily;
  version: string;
  architecture: GamerDependencyArchitecture;
  installerFileName: string;
  requiredPublisher: "Microsoft Corporation";
  installCommand: string;
  officialSourceStatus: "pendingOfficialUrl";
  expectedSha256Status: "requiredBeforeInstall";
  signatureStatus: "requiredBeforeInstall";
};

export type GamerDependencyReadiness = {
  summary: string;
  totalPackages: number;
  blockedCount: number;
  readyCount: number;
  detectedSummary: string;
  packages: GamerDependencyPackage[];
  blockers: string[];
};

const VCRUNTIME_YEARS = ["2005", "2008", "2010", "2012", "2013", "2015-2022"] as const;

export const GAMER_DEPENDENCY_PACKAGES: GamerDependencyPackage[] = [
  ...VCRUNTIME_YEARS.flatMap((year) => [
    vcRedist(year, "x86"),
    vcRedist(year, "x64"),
  ]),
  {
    id: "directx-end-user-runtime",
    title: "DirectX End-User Runtime",
    family: "directx",
    version: "legacy-runtime",
    architecture: "web",
    installerFileName: "dxwebsetup.exe",
    requiredPublisher: "Microsoft Corporation",
    installCommand: "dxwebsetup.exe /Q",
    officialSourceStatus: "pendingOfficialUrl",
    expectedSha256Status: "requiredBeforeInstall",
    signatureStatus: "requiredBeforeInstall",
  },
];

export function buildGamerDependencyReadiness(
  advancedCatalog?: AdvancedCatalog,
): GamerDependencyReadiness {
  const dependencyCheck = advancedCatalog?.actions.find(
    (action) => action.id === "check-gamer-dependencies",
  );
  const detectedSummary =
    dependencyCheck?.currentValue && dependencyCheck.currentValue !== "Indisponível"
      ? dependencyCheck.currentValue
      : "Leitura local ainda não retornou VC++/DirectX.";
  const blockers = [
    "Instaladores oficiais ainda não foram vinculados ao manifesto.",
    "SHA256 esperado precisa ser preenchido antes de qualquer download/instalação.",
    "Assinatura Authenticode Microsoft precisa ser validada antes de executar.",
  ];

  return {
    summary: `${GAMER_DEPENDENCY_PACKAGES.length} dependência(s) gamer mapeada(s); instalação bloqueada até hash e assinatura.`,
    totalPackages: GAMER_DEPENDENCY_PACKAGES.length,
    blockedCount: GAMER_DEPENDENCY_PACKAGES.length,
    readyCount: 0,
    detectedSummary,
    packages: GAMER_DEPENDENCY_PACKAGES,
    blockers,
  };
}

export function isGamerDependencyInstallerAction(actionId: string) {
  return (
    actionId.startsWith("vc-redist-") ||
    actionId === "directx-runtime" ||
    actionId === "directx-end-user-runtime"
  );
}

function vcRedist(
  year: (typeof VCRUNTIME_YEARS)[number],
  architecture: "x86" | "x64",
): GamerDependencyPackage {
  const normalizedYear = year.replace("-", "_");

  return {
    id: `vc-redist-${year}-${architecture}`,
    title: `Microsoft Visual C++ ${year} Redistributable ${architecture}`,
    family: "vcredist",
    version: year,
    architecture,
    installerFileName: `vcredist_${normalizedYear}_${architecture}.exe`,
    requiredPublisher: "Microsoft Corporation",
    installCommand: `vcredist_${normalizedYear}_${architecture}.exe /quiet /norestart`,
    officialSourceStatus: "pendingOfficialUrl",
    expectedSha256Status: "requiredBeforeInstall",
    signatureStatus: "requiredBeforeInstall",
  };
}
