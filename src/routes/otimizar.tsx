import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  Cpu,
  Gamepad2,
  Gauge,
  HardDrive,
  ListChecks,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { SafeTestModeNotice } from "@/components/common/SafeTestModeNotice";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { QuickPrepareModal } from "@/components/optimization/QuickPrepareModal";
import { SmartOptimizeModal } from "@/components/optimization/SmartOptimizeModal";
import {
  DNS_PROVIDERS,
  type DnsProvider,
  type DnsProviderId,
  type QuickPrepareReports,
} from "@/lib/quick-prepare";
import {
  fallbackDiagnosticReport,
  loadDiagnosticReport,
  type DiagnosticReport,
} from "@/lib/diagnostic";
import { HERMES_SAFE_TEST_MODE } from "@/lib/safe-mode";
import {
  fallbackSystemSecurityContext,
  readSystemSecurityContext,
  relaunchHermesAsAdmin,
  type SystemSecurityContext,
} from "@/lib/system";

const QUICK_PREPARE_STORAGE_KEY = "hermes.quickPrepare.completed.v1";

type QuickPrepareGate = {
  completedAt: string;
  dnsProviderId: DnsProviderId;
  safeMode: boolean;
};

export const Route = createFileRoute("/otimizar")({
  head: () => ({
    meta: [
      { title: "Hermes Optimizer - Otimizar" },
      {
        name: "description",
        content: "Area de otimizacao guiada do Hermes Optimizer.",
      },
    ],
  }),
  component: OtimizarPage,
});

function OtimizarPage() {
  const [diagnostic, setDiagnostic] = useState<DiagnosticReport>(fallbackDiagnosticReport);
  const [isQuickPrepareOpen, setIsQuickPrepareOpen] = useState(false);
  const [quickPrepareRunKey, setQuickPrepareRunKey] = useState(0);
  const [isSmartOptimizeOpen, setIsSmartOptimizeOpen] = useState(false);
  const [smartOptimizeRunKey, setSmartOptimizeRunKey] = useState(0);
  const [selectedDnsProviderId, setSelectedDnsProviderId] = useState<DnsProviderId>("cloudflare");
  const [quickPrepareGate, setQuickPrepareGate] = useState<QuickPrepareGate | null>(() =>
    readQuickPrepareGate(),
  );
  const [systemContext, setSystemContext] = useState<SystemSecurityContext>(
    fallbackSystemSecurityContext,
  );
  const [adminLaunchStatus, setAdminLaunchStatus] = useState<
    "idle" | "running" | "requested" | "failed"
  >("idle");
  const [adminLaunchMessage, setAdminLaunchMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void loadDiagnosticReport().then((report) => {
      if (mounted) {
        setDiagnostic(report);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    void readSystemSecurityContext().then((context) => {
      if (mounted) {
        setSystemContext(context);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const handlePrepareNow = useCallback(() => {
    if (isQuickPrepareOpen) {
      return;
    }

    setQuickPrepareRunKey((current) => current + 1);
    setIsQuickPrepareOpen(true);
  }, [isQuickPrepareOpen]);

  const handleOptimizeNow = useCallback(() => {
    if (!quickPrepareGate) {
      return;
    }
    if (isSmartOptimizeOpen) {
      return;
    }

    setSmartOptimizeRunKey((current) => current + 1);
    setIsSmartOptimizeOpen(true);
  }, [isSmartOptimizeOpen, quickPrepareGate]);

  const handleDiagnosticUpdate = useCallback((report: DiagnosticReport) => {
    setDiagnostic(report);
  }, []);

  const handlePrepareCompleted = useCallback(
    (_reports: QuickPrepareReports) => {
      const nextGate: QuickPrepareGate = {
        completedAt: new Date().toISOString(),
        dnsProviderId: selectedDnsProviderId,
        safeMode: HERMES_SAFE_TEST_MODE,
      };
      setQuickPrepareGate(nextGate);
      writeQuickPrepareGate(nextGate);
    },
    [selectedDnsProviderId],
  );

  const handleRelaunchAsAdmin = useCallback(async () => {
    if (adminLaunchStatus === "running") {
      return;
    }

    setAdminLaunchStatus("running");
    setAdminLaunchMessage(null);
    try {
      const result = await relaunchHermesAsAdmin();
      setAdminLaunchStatus(result.alreadyElevated ? "idle" : "requested");
      setAdminLaunchMessage(result.message);
      const nextContext = await readSystemSecurityContext();
      setSystemContext(nextContext);
    } catch (error) {
      setAdminLaunchStatus("failed");
      setAdminLaunchMessage(error instanceof Error ? error.message : String(error));
    }
  }, [adminLaunchStatus]);

  const healthScore = Math.round(diagnostic.healthScore);
  const projectStats = [
    { label: "Saude", value: `${healthScore}/100` },
    { label: "Meta", value: "150 acoes" },
    { label: "Modo", value: HERMES_SAFE_TEST_MODE ? "Teste" : "Real" },
  ];
  const machineFacts = [
    { icon: Cpu, label: "CPU", value: compactValue(diagnostic.cpu.name) },
    { icon: HardDrive, label: "Disco", value: diagnostic.disk.healthStatus },
    { icon: Gamepad2, label: "GPU", value: compactValue(diagnostic.gpu.name) },
  ];
  const projectPhases = [
    { icon: Activity, title: "Diagnostico", text: "Entende o PC antes de qualquer decisao." },
    {
      icon: Wrench,
      title: "Componentes",
      text: "VC++, DirectX e dependencias entram como modulo.",
    },
    { icon: Gauge, title: "Performance", text: "Energia, inicializacao, limpeza e modo gamer." },
  ];
  const optimizeLocked = !quickPrepareGate;
  const selectedDnsProvider =
    DNS_PROVIDERS.find((provider) => provider.id === selectedDnsProviderId) ?? DNS_PROVIDERS[0];

  return (
    <div className="lightning-bg flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-auto px-5 pb-4 pt-6 xl:px-8 xl:pt-7">
          <div className="mx-auto flex min-h-full w-full max-w-[1220px] flex-col">
            <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div>
                <p className="mb-2 text-xs font-bold tracking-[0.22em] text-primary">
                  PROJETO DE OTIMIZACAO
                </p>
                <h1 className="text-[clamp(30px,3vw,48px)] font-black leading-tight tracking-normal text-foreground">
                  Hermes em dois passos
                </h1>
                <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">
                  O Dashboard acompanha o PC. Esta area concentra a parte que resolve: analisar,
                  montar o plano e preparar a otimizacao em fases.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 self-end">
                {projectStats.map((item) => (
                  <MiniStat key={item.label} label={item.label} value={item.value} />
                ))}
              </div>
            </div>

            <SafeTestModeNotice />

            <AdminModePanel
              systemContext={systemContext}
              launchStatus={adminLaunchStatus}
              launchMessage={adminLaunchMessage}
              onRelaunch={handleRelaunchAsAdmin}
            />

            <DnsProviderPicker
              selectedProviderId={selectedDnsProviderId}
              onSelect={setSelectedDnsProviderId}
            />

            <OptimizationPhaseBoard
              selectedDnsProvider={selectedDnsProvider}
              quickPrepareGate={quickPrepareGate}
              isQuickPrepareOpen={isQuickPrepareOpen}
              isSmartOptimizeOpen={isSmartOptimizeOpen}
              optimizeLocked={optimizeLocked}
              onPrepare={handlePrepareNow}
              onOptimize={handleOptimizeNow}
            />

            <section className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
              {machineFacts.map((item) => (
                <InfoTile key={item.label} icon={item.icon} label={item.label} value={item.value} />
              ))}
            </section>

            <section className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
              {projectPhases.map((item) => (
                <TrustCard key={item.title} icon={item.icon} title={item.title} text={item.text} />
              ))}
            </section>
          </div>
        </main>
      </div>

      <QuickPrepareModal
        open={isQuickPrepareOpen}
        runKey={quickPrepareRunKey}
        onClose={() => setIsQuickPrepareOpen(false)}
        onDiagnostic={handleDiagnosticUpdate}
        onCompleted={handlePrepareCompleted}
        dnsProviderId={selectedDnsProviderId}
      />
      <SmartOptimizeModal
        open={isSmartOptimizeOpen}
        runKey={smartOptimizeRunKey}
        onClose={() => setIsSmartOptimizeOpen(false)}
      />
    </div>
  );
}

function readQuickPrepareGate(): QuickPrepareGate | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(QUICK_PREPARE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as QuickPrepareGate;
    if (!parsed.completedAt || !parsed.dnsProviderId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeQuickPrepareGate(gate: QuickPrepareGate) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(QUICK_PREPARE_STORAGE_KEY, JSON.stringify(gate));
}

function AdminModePanel({
  systemContext,
  launchStatus,
  launchMessage,
  onRelaunch,
}: {
  systemContext: SystemSecurityContext;
  launchStatus: "idle" | "running" | "requested" | "failed";
  launchMessage: string | null;
  onRelaunch: () => void;
}) {
  const elevated = systemContext.isElevated;
  const running = launchStatus === "running";
  const statusLabel = elevated ? "Administrador ativo" : "Administrador pendente";
  const buttonLabel = elevated
    ? "Pronto para modo real"
    : HERMES_SAFE_TEST_MODE
      ? "Abrir como admin"
      : "Abrir para executar real";

  return (
    <section
      className={`mt-4 rounded-2xl border p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-24px_rgba(15,23,42,0.22)] ${
        elevated ? "border-success/30 bg-success/10" : "border-warning/25 bg-warning/10"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
              elevated ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"
            }`}
          >
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-black text-foreground">Modo administrador real</h2>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  elevated ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                }`}
              >
                {statusLabel}
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-muted-foreground">
              Necessario para DNS, DISM, Defender, rede e servicos quando o modo teste for
              desligado. Game Mode, GameDVR e visual gamer continuam no fluxo dos botoes.
            </p>
            {launchMessage && (
              <p
                className={`mt-2 rounded-lg border px-3 py-2 text-[12px] font-semibold ${
                  launchStatus === "failed"
                    ? "border-destructive/20 bg-destructive/10 text-destructive"
                    : "border-primary/20 bg-primary/10 text-primary"
                }`}
              >
                {launchMessage}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] lg:min-w-[390px]">
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="Windows" value={systemContext.isWindows ? "Sim" : "Nao"} />
            <MiniStat label="Modo" value={HERMES_SAFE_TEST_MODE ? "Teste" : "Real"} />
          </div>
          <button
            type="button"
            onClick={onRelaunch}
            disabled={elevated || running || !systemContext.isWindows}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground shadow-[0_14px_34px_-24px_rgba(37,99,235,0.95)] transition hover:bg-primary/95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {running ? "Solicitando..." : buttonLabel}
          </button>
        </div>
      </div>
    </section>
  );
}

function OptimizationPhaseBoard({
  selectedDnsProvider,
  quickPrepareGate,
  isQuickPrepareOpen,
  isSmartOptimizeOpen,
  optimizeLocked,
  onPrepare,
  onOptimize,
}: {
  selectedDnsProvider: DnsProvider;
  quickPrepareGate: QuickPrepareGate | null;
  isQuickPrepareOpen: boolean;
  isSmartOptimizeOpen: boolean;
  optimizeLocked: boolean;
  onPrepare: () => void;
  onOptimize: () => void;
}) {
  const completedLabel = quickPrepareGate
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(quickPrepareGate.completedAt))
    : null;

  return (
    <section className="mt-5">
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.22em] text-primary">FASES DE OTIMIZACAO</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Faca na ordem. Conclua a preparacao, reinicie quando o Hermes pedir e depois rode a fase
            avancada.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-3 rounded-full border border-border/70 bg-card/85 px-4 py-2">
          <PhaseStepperItem index="1" label="Preparacao" active />
          <span className="h-px w-8 bg-border" />
          <PhaseStepperItem index="2" label="Avancada" active={!optimizeLocked} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-success/35 bg-card/90 p-3.5 shadow-[0_18px_38px_-32px_rgba(34,197,94,0.6)]">
          <div className="mb-3 flex items-start justify-between gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-success text-sm font-black text-success-foreground shadow-[0_14px_30px_-20px_rgba(34,197,94,0.8)]">
              1
            </span>
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                quickPrepareGate ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
              }`}
            >
              {quickPrepareGate ? "Concluida" : "Aguardando"}
            </span>
          </div>
          <h2 className="text-base font-black text-foreground">Preparacao da Maquina</h2>
          <div className="mt-3 space-y-2">
            <PhaseActionRow index="1" label="Preparar maquina" ready />
            <PhaseActionRow
              index="2"
              label={`Aplicar DNS ${selectedDnsProvider.label}`}
              ready
              accent={selectedDnsProvider.label}
            />
            <PhaseActionRow index="3" label="Game Mode, GameDVR OFF e visual gamer" ready />
            <PhaseActionRow index="4" label="Privacidade, inicio e processos seguros" ready />
          </div>
          <button
            type="button"
            onClick={onPrepare}
            disabled={isQuickPrepareOpen}
            className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-center text-sm font-black text-primary-foreground shadow-[0_14px_34px_-24px_rgba(37,99,235,0.95)] transition hover:bg-primary/95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isQuickPrepareOpen ? "Preparando..." : "Iniciar Preparacao"}
          </button>
          <p className="mt-2 text-center text-[12px] font-bold text-muted-foreground">
            Leva de 2 a 5 minutos. Depois reinicie para a Fase 2 render melhor.
          </p>
        </article>

        <article
          className={`rounded-2xl border p-3.5 shadow-[0_18px_38px_-32px_rgba(37,99,235,0.6)] ${
            optimizeLocked ? "border-success/25 bg-card/70" : "border-primary/35 bg-card/90"
          }`}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <span
              className={`grid h-9 w-9 place-items-center rounded-xl text-sm font-black ${
                optimizeLocked
                  ? "bg-success/80 text-success-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              2
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold ${
                optimizeLocked ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
              }`}
            >
              {optimizeLocked && <Lock className="h-3 w-3" />}
              {optimizeLocked ? "Bloqueado" : "Liberado"}
            </span>
          </div>
          <h2 className="text-base font-black text-foreground">Otimizacao Avancada</h2>
          <div className="mt-3 space-y-2">
            <PhaseActionRow
              index="1"
              label="Aplicar cache e limpeza avancada"
              ready={!optimizeLocked}
            />
            <PhaseActionRow
              index="2"
              label="Otimizar sistema e perfil recomendado"
              ready={!optimizeLocked}
            />
            <PhaseActionRow
              index="3"
              label="Otimizar rede, Gamer e Fate Trigger"
              ready={!optimizeLocked}
            />
          </div>
          {optimizeLocked ? (
            <div className="mt-4 rounded-xl border border-border/60 bg-muted/70 px-4 py-3 text-center">
              <p className="text-sm font-black text-foreground">Conclua a Fase 1 primeiro</p>
              <p className="mt-1 text-[12px] font-semibold text-muted-foreground">
                Faca a Preparacao da Maquina antes. O Hermes libera este botao depois.
              </p>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={onOptimize}
                disabled={isSmartOptimizeOpen}
                className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-center text-sm font-black text-primary-foreground shadow-[0_14px_34px_-24px_rgba(37,99,235,0.95)] transition hover:bg-primary/95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSmartOptimizeOpen ? "Otimizando..." : "Iniciar Otimizacao Avancada"}
              </button>
              <p className="mt-2 text-center text-[12px] font-bold text-muted-foreground">
                Reinicio recomendado antes desta fase. Ultimo preparo: {completedLabel}.
              </p>
            </>
          )}
        </article>
      </div>
    </section>
  );
}

function PhaseStepperItem({
  index,
  label,
  active,
}: {
  index: string;
  label: string;
  active: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 ${active ? "text-primary" : "text-muted-foreground"}`}
    >
      <span
        className={`grid h-7 w-7 place-items-center rounded-full text-sm font-black ${
          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {index}
      </span>
      <span className="text-[12px] font-bold">{label}</span>
    </span>
  );
}

function PhaseActionRow({
  index,
  label,
  ready,
  accent,
}: {
  index: string;
  label: string;
  ready: boolean;
  accent?: string;
}) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/70 px-3 py-1.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-soft text-[11px] font-black text-primary">
          {index}
        </span>
        <p className="truncate text-[13px] font-bold text-foreground">
          {label}
          {accent && <span className="text-success"> {accent}</span>}
        </p>
      </div>
      <span
        className={`h-3 w-3 shrink-0 rounded-full border ${
          ready ? "border-primary bg-primary/10" : "border-muted-foreground/40"
        }`}
      />
    </div>
  );
}

function DnsProviderPicker({
  selectedProviderId,
  onSelect,
}: {
  selectedProviderId: DnsProviderId;
  onSelect: (providerId: DnsProviderId) => void;
}) {
  return (
    <section className="mt-4 rounded-2xl border border-primary/20 bg-card/85 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-24px_rgba(15,23,42,0.22)]">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-primary">DNS DO JOGADOR</p>
          <h2 className="text-lg font-black text-foreground">Escolha seu provedor DNS</h2>
        </div>
        <p className="text-[12px] text-muted-foreground">
          O Preparar PC usa essa escolha na fase de rede.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {DNS_PROVIDERS.map((provider) => (
          <DnsProviderButton
            key={provider.id}
            provider={provider}
            active={selectedProviderId === provider.id}
            onClick={() => onSelect(provider.id)}
          />
        ))}
      </div>
    </section>
  );
}

function DnsProviderButton({
  provider,
  active,
  onClick,
}: {
  provider: DnsProvider;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-14 rounded-xl border px-3 py-2 text-left transition ${
        active
          ? "border-success bg-success/10 text-success shadow-[0_0_0_1px_rgba(34,197,94,0.18)]"
          : "border-border/70 bg-background/70 text-foreground hover:border-primary/35 hover:bg-primary/5"
      }`}
    >
      <span className="block text-sm font-black">{provider.label}</span>
      <span
        className={`mt-0.5 block text-[11px] ${active ? "text-success" : "text-muted-foreground"}`}
      >
        {provider.primary}
      </span>
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/75 px-3 py-2">
      <p className="text-[9px] font-bold tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-black text-foreground">{value}</p>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-2xl border border-border/60 bg-card/85 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-24px_rgba(15,23,42,0.22)]">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="mt-0.5 truncate text-sm font-black text-foreground">{value}</p>
        </div>
      </div>
    </article>
  );
}

function TrustCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-border/60 bg-card/85 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-24px_rgba(15,23,42,0.22)]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{text}</p>
        </div>
      </div>
    </article>
  );
}

function compactValue(value: string) {
  if (!value || /indispon/i.test(value)) {
    return "Indisponivel";
  }

  return value.length > 34 ? `${value.slice(0, 34).trim()}...` : value;
}
