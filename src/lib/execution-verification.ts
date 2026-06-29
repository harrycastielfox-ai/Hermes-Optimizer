import { type ExecutionReportAction, type ExecutionVerification } from "@/lib/execution-report";
import { refreshAdvancedCatalog, type AdvancedCatalog } from "@/lib/advanced";
import { refreshPerformanceReport, type PerformanceReport } from "@/lib/performance";

type VerificationContext = {
  performance: PerformanceReport | null;
  advanced: AdvancedCatalog | null;
};

type VerificationRule = (context: VerificationContext) => boolean | undefined;

const PERFORMANCE_RULES: Array<{ matches: string[]; verify: VerificationRule; expected: string }> =
  [
    {
      matches: ["PowerPlan.HighPerformance", "performance-set-high-performance-power-plan"],
      verify: ({ performance }) =>
        performanceAvailable(performance)
          ? performance.powerPlan.status === "Desempenho"
          : undefined,
      expected: "Plano de energia em Alto desempenho",
    },
    {
      matches: ["Visual.Transparency", "performance-disable-transparency"],
      verify: ({ performance }) =>
        booleanState(performance?.visualEffects.transparencyEnabled, false),
      expected: "Transparência desativada",
    },
    {
      matches: ["Visual.Animations", "performance-disable-window-animations"],
      verify: ({ performance }) =>
        booleanState(performance?.visualEffects.animationsEnabled, false),
      expected: "Animações desativadas",
    },
    {
      matches: ["Visual.Shadows", "performance-disable-visual-shadows"],
      verify: ({ performance }) => booleanState(performance?.visualEffects.shadowsEnabled, false),
      expected: "Sombras visuais desativadas",
    },
    {
      matches: ["GameBar.AllowAutoGameMode", "advanced-enable-game-mode"],
      verify: ({ performance }) => booleanState(performance?.gameMode.enabled, true),
      expected: "Modo de Jogo ativado",
    },
    {
      matches: ["GameDVR.AppCapture", "advanced-disable-game-dvr"],
      verify: ({ performance }) => booleanState(performance?.gameMode.gameDvrEnabled, false),
      expected: "GameDVR desativado",
    },
    {
      matches: ["Power.Hibernate", "advanced-disable-hibernation"],
      verify: ({ advanced }) => advancedValueEquals(advanced, "disable-hibernation", "0"),
      expected: "Hibernação desativada",
    },
    {
      matches: ["Explorer.StartupDelay", "advanced-disable-startup-delay"],
      verify: ({ advanced }) => advancedValueEquals(advanced, "disable-startup-delay", "0"),
      expected: "Atraso de inicialização desativado",
    },
    {
      matches: ["Boot.Timeout", "advanced-set-boot-timeout-fast"],
      verify: ({ advanced }) => verifyBootTimeout(advanced),
      expected: "Menu de boot ajustado para 5 segundos",
    },
    ...serviceDemandVerificationRules(),
    {
      matches: [
        "MMCSS.SystemResponsiveness",
        "MMCSS.GpuPriority",
        "MMCSS.Priority",
        "advanced-set-mmcss-gamer-pack",
      ],
      verify: ({ advanced }) => verifyMmcssPack(advanced),
      expected: "Pacote MMCSS Gamer aplicado",
    },
    {
      matches: ["Steam.GamePriority.FateTrigger", "advanced-set-fate-trigger-cpu-priority-high"],
      verify: ({ advanced }) => verifyFatePriority(advanced),
      expected: "Prioridade de CPU do Fate Trigger configurada",
    },
    ...dnsVerificationRules(),
  ];

export async function verifyExecutionActions(
  actions: ExecutionReportAction[],
  safeMode: boolean,
): Promise<ExecutionReportAction[]> {
  const checkedAt = new Date().toISOString();

  if (safeMode) {
    return actions.map((action) => ({
      ...action,
      verification: notRequiredVerification(action, checkedAt),
    }));
  }

  const [performance, advanced] = await Promise.all([
    refreshPerformanceReport().catch(() => null),
    refreshAdvancedCatalog().catch(() => null),
  ]);
  const context = { performance, advanced };

  return actions.map((action) => ({
    ...action,
    verification: verifyAction(action, context, checkedAt),
  }));
}

function verifyAction(
  action: ExecutionReportAction,
  context: VerificationContext,
  checkedAt: string,
): ExecutionVerification {
  if (action.status !== "applied") {
    return notRequiredVerification(action, checkedAt);
  }

  const identity = `${action.id} ${action.technicalName ?? ""}`;
  const rule = PERFORMANCE_RULES.find((candidate) =>
    candidate.matches.some((match) => identity.includes(match)),
  );

  if (!rule) {
    return {
      status: "unavailable",
      detail: "Ação executada, mas ainda sem leitura pós-execução específica.",
      checkedAt,
    };
  }

  const result = rule.verify(context);
  if (result === undefined) {
    return {
      status: "unavailable",
      detail: `${rule.expected}: leitura do Windows indisponível.`,
      checkedAt,
    };
  }

  return {
    status: result ? "confirmed" : "notConfirmed",
    detail: result
      ? `${rule.expected}: confirmado pela leitura posterior.`
      : `${rule.expected}: não confirmado pela leitura posterior.`,
    checkedAt,
  };
}

function notRequiredVerification(
  action: ExecutionReportAction,
  checkedAt: string,
): ExecutionVerification {
  return {
    status: "notRequired",
    detail:
      action.status === "simulated"
        ? "Modo teste: nenhuma alteração real para confirmar."
        : "Esta ação não exige confirmação pós-execução.",
    checkedAt,
  };
}

function booleanState(value: boolean | undefined, expected: boolean) {
  return value === undefined ? undefined : value === expected;
}

function performanceAvailable(report: PerformanceReport | null): report is PerformanceReport {
  return Boolean(report && !report.engineVersion.includes("fallback"));
}

function advancedValueEquals(catalog: AdvancedCatalog | null, actionId: string, expected: string) {
  const value = advancedCurrentValue(catalog, actionId);
  return value === undefined ? undefined : value.trim() === expected;
}

function verifyBootTimeout(catalog: AdvancedCatalog | null) {
  const value = advancedCurrentValue(catalog, "set-boot-timeout-fast");
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (isUnavailableAdvancedValue(normalized)) return undefined;
  return normalized.startsWith("5 ");
}

function verifyServiceDemandStart(catalog: AdvancedCatalog | null, actionId: string) {
  const value = advancedCurrentValue(catalog, actionId);
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (isUnavailableAdvancedValue(normalized)) return undefined;
  return (
    normalized === "manual" ||
    normalized === "demand" ||
    normalized === "demand_start" ||
    normalized.includes("sob demanda")
  );
}

function isUnavailableAdvancedValue(normalizedValue: string) {
  return normalizedValue.includes("nao detectado") || normalizedValue.includes("não detectado");
}

function verifyMmcssPack(catalog: AdvancedCatalog | null) {
  const value = advancedCurrentValue(catalog, "set-mmcss-gamer-pack");
  if (value === undefined) return undefined;
  const normalized = value.toLowerCase();
  return (
    normalized.includes("systemresponsiveness=0") &&
    normalized.includes("gpu priority=8") &&
    normalized.includes("priority=6") &&
    normalized.includes("scheduling=high") &&
    normalized.includes("sfio=high")
  );
}

function verifyFatePriority(catalog: AdvancedCatalog | null) {
  const value = advancedCurrentValue(catalog, "set-fate-trigger-cpu-priority-high");
  if (value === undefined) return undefined;
  const normalized = value.toLowerCase();
  return (
    normalized.includes("fatetrigger.exe=3") &&
    normalized.includes("fatetrigger-win64-shipping.exe=3")
  );
}

function advancedCurrentValue(catalog: AdvancedCatalog | null, actionId: string) {
  if (!catalog || catalog.engineVersion.includes("fallback")) return undefined;
  return catalog.actions.find((action) => action.id === actionId)?.currentValue;
}

function dnsVerificationRules() {
  const providers = [
    ["cloudflare", ["1.1.1.1", "1.0.0.1"]],
    ["google", ["8.8.8.8", "8.8.4.4"]],
    ["opendns", ["208.67.222.222", "208.67.220.220"]],
    ["quad9", ["9.9.9.9", "149.112.112.112"]],
    ["adguard", ["94.140.14.14", "94.140.15.15"]],
  ] as const;

  return providers.map(([provider, servers]) => ({
    matches: [`advanced-set-dns-${provider}`],
    expected: `DNS ${provider} aplicado`,
    verify: ({ advanced }: VerificationContext) => {
      const value = advancedCurrentValue(advanced, `set-dns-${provider}`);
      if (value === undefined) return undefined;
      return servers.every((server) => value.includes(server));
    },
  }));
}

function serviceDemandVerificationRules() {
  const services = [
    ["DiagTrack", "set-diagtrack-service-manual", "Telemetria sob demanda"],
    ["MapsBroker", "set-mapsbroker-service-manual", "Mapas sob demanda"],
    ["WerSvc", "set-wersvc-service-manual", "Relatorio de erros sob demanda"],
    ["WMPNetworkSvc", "set-wmpnetworksvc-service-manual", "Compartilhamento de midia sob demanda"],
    ["Fax", "set-fax-service-manual", "Fax sob demanda"],
    ["RetailDemo", "set-retaildemo-service-manual", "Demo de varejo sob demanda"],
    ["PhoneSvc", "set-phonesvc-service-manual", "Vincular telefone sob demanda"],
    ["WalletService", "set-walletservice-manual", "Carteira do Windows sob demanda"],
    ["XblAuthManager", "set-xbl-auth-manager-manual", "Xbox Live Auth sob demanda"],
    ["XblGameSave", "set-xbl-game-save-manual", "Xbox Game Save sob demanda"],
    ["XboxNetApiSvc", "set-xbox-net-api-svc-manual", "Xbox Live Networking sob demanda"],
  ] as const;

  return services.map(([serviceName, actionId, expected]) => ({
    matches: [`Service.${serviceName}.Start`, `advanced-${actionId}`],
    expected,
    verify: ({ advanced }: VerificationContext) => verifyServiceDemandStart(advanced, actionId),
  }));
}
