import { createFileRoute } from "@tanstack/react-router";
import { Heart, Cpu, MemoryStick, HardDrive, Clock, Zap, Shield, RefreshCw, CheckCircle2, Info, AlertTriangle, Gamepad2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { HealthRing } from "@/components/dashboard/HealthRing";
import { MetricCard, ProgressBar, Sparkline } from "@/components/dashboard/MetricCard";
import { InfoPanel, InfoRow, HwRow, RecRow } from "@/components/dashboard/InfoPanel";
import { fallbackAdvisorRecommendations, loadAdvisorRecommendations, type AdvisorRecommendation } from "@/lib/advisor";
import { advisorInputFromDiagnostic, fallbackDiagnosticReport, loadDiagnosticReport, type DiagnosticReport } from "@/lib/diagnostic";
import { runOptimizeNowPlan } from "@/lib/optimizer";
import {
  HermesArchitectureIcon,
  HermesClockIcon,
  HermesCollectionIcon,
  HermesComputerIcon,
  HermesCpuIcon,
  HermesDiskIcon,
  HermesGpuIcon,
  HermesMotherboardIcon,
  HermesRamIcon,
  HermesVersionIcon,
  HermesWindowsIcon,
} from "@/components/dashboard/HermesPanelIcons";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hermes Optimizer — Dashboard" },
      { name: "description", content: "Painel central do PC com coleta local somente leitura." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [diagnostic, setDiagnostic] = useState<DiagnosticReport>(fallbackDiagnosticReport);
  const [recommendations, setRecommendations] = useState<AdvisorRecommendation[]>(fallbackAdvisorRecommendations);
  const [isOptimizeRunning, setIsOptimizeRunning] = useState(false);

  useEffect(() => {
    let mounted = true;
    const timer = window.setTimeout(() => {
      loadDiagnosticReport()
        .then(async (report) => {
          const items = await loadAdvisorRecommendations(advisorInputFromDiagnostic(report));
          return { report, items };
        })
        .then(({ report, items }) => {
          if (mounted) {
            setDiagnostic(report);
            setRecommendations(items);
          }
        });
    }, 350);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, []);

  const handleOptimizeNow = useCallback(async () => {
    if (isOptimizeRunning) {
      return;
    }

    setIsOptimizeRunning(true);
    try {
      const plan = await runOptimizeNowPlan();
      console.info("[Hermes] Plano seguro do Otimizar Agora", plan);
    } finally {
      setIsOptimizeRunning(false);
    }
  }, [isOptimizeRunning]);

  const healthScore = Math.round(diagnostic.healthScore);
  const healthSub = `${diagnostic.healthLabel} • ${diagnostic.defender.active ? "Sistema protegido" : "Verificar segurança"}`;
  const cpuUsage = Math.round(diagnostic.cpu.usagePercent);
  const ramUsage = Math.round(diagnostic.ram.usedPercent);
  const diskUsage = Math.round(diagnostic.disk.usedPercent);
  const startupImpact = getStartupImpactLabel(diagnostic);
  const updateStatus = diagnostic.windowsUpdate.status;
  const temperatureText = diagnostic.temperature.available && typeof diagnostic.temperature.celsius === "number"
    ? ` • ${formatNumber(diagnostic.temperature.celsius)}°C`
    : "";

  return (
    <div className="lightning-bg min-h-screen flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 px-5 pt-6 pb-4 overflow-auto xl:px-8 xl:pt-7">
          {/* Header */}
          <div className="flex flex-col gap-4 mb-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1 className="text-[clamp(26px,2vw,32px)] leading-tight font-bold tracking-tight text-foreground">Dashboard Hermes</h1>
              <p className="text-[13px] text-muted-foreground mt-1">
                Status central do PC com coleta local somente leitura. Nenhuma otimização real é executada nesta fase.
              </p>
            </div>
            <div className="w-full max-w-[320px] rounded-xl bg-card border border-border/60 px-4 py-3 flex items-center justify-between gap-3 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_22px_-14px_rgba(15,23,42,0.10)] xl:w-[300px] xl:justify-start">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
                <Shield className="absolute inset-0 h-full w-full text-blue-100 fill-blue-50 drop-shadow-[0_5px_10px_rgba(37,99,235,0.12)]" strokeWidth={1.6} />
                <Zap className="relative h-5 w-5 text-primary fill-primary drop-shadow-[0_3px_8px_rgba(37,99,235,0.24)]" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[9px] font-bold tracking-wider text-muted-foreground">SAÚDE GERAL</p>
                <p className="text-[20px] font-bold leading-none mt-0.5">{healthScore}<span className="text-xs text-muted-foreground font-medium">/100</span></p>
                <p className="text-[9px] text-muted-foreground mt-1 truncate">{healthSub}</p>
              </div>
              <HealthRing value={healthScore} size={58} stroke={6} />
            </div>
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-1 gap-3 mb-4 lg:grid-cols-2 2xl:grid-cols-4">
            <MetricCard icon={Heart} label="Saúde geral" value={`${healthScore}/100`} sub={healthSub}>
              <Sparkline />
            </MetricCard>
            <MetricCard icon={Cpu} label="CPU" value={`${cpuUsage}%`} footer={<>{diagnostic.cpu.name}<br />{diagnostic.cpu.logicalProcessors} threads • {formatGhz(diagnostic.cpu.currentClockMhz)}</>}>
              <ProgressBar value={cpuUsage} gradient="from-primary to-info" />
            </MetricCard>
            <MetricCard icon={MemoryStick} label="RAM" value={`${ramUsage}%`} footer={<>{formatGb(diagnostic.ram.usedGb)} GB usados • {formatGb(diagnostic.ram.freeGb)} GB livres<br />Total {formatGb(diagnostic.ram.totalGb)} GB</>}>
              <ProgressBar value={ramUsage} gradient="from-primary to-purple-accent" />
            </MetricCard>
            <MetricCard icon={HardDrive} label={`Disco principal (${diagnostic.disk.mount})`} value={`${diskUsage}%`} footer={<>{formatGb(diagnostic.disk.freeGb)} GB livres de {formatGb(diagnostic.disk.totalGb)} GB<br />{diagnostic.disk.mediaType} • {diagnostic.disk.healthStatus}</>}>
              <ProgressBar value={diskUsage} gradient="from-info to-primary" />
            </MetricCard>
          </div>

          {/* Three panels */}
          <div className="grid grid-cols-1 gap-3.5 mb-4 xl:grid-cols-2 2xl:grid-cols-3">
            <InfoPanel title="SISTEMA" watermarkSrc="/hermes-watermark.png">
              <InfoRow icon={HermesComputerIcon} label="Computador:" value={diagnostic.system.computerName} />
              <InfoRow icon={HermesWindowsIcon} label="Sistema:" value={diagnostic.system.osName} />
              <InfoRow icon={HermesVersionIcon} label="Versão:" value={`${diagnostic.system.osVersion} (Build ${diagnostic.system.osBuild})`} />
              <InfoRow icon={HermesArchitectureIcon} label="Arquitetura:" value={diagnostic.system.architecture} />
              <InfoRow icon={HermesClockIcon} label="Tempo ligado:" value={diagnostic.uptime.label} />
              <InfoRow icon={HermesCollectionIcon} label="Coleta:" value="Somente leitura (local)" />
            </InfoPanel>

            <InfoPanel title="HARDWARE DETALHADO">
              <HwRow icon={HermesCpuIcon} label="CPU" primary={diagnostic.cpu.name} secondary={`${diagnostic.cpu.physicalCores} núcleos • ${diagnostic.cpu.logicalProcessors} threads${temperatureText}`} />
              <HwRow icon={HermesRamIcon} label="MEMÓRIA RAM" primary={`${formatGb(diagnostic.ram.totalGb)} GB RAM`} secondary={`${formatGb(diagnostic.ram.usedGb)} GB usados (${ramUsage}%)`} />
              <HwRow icon={HermesGpuIcon} label="GPU" primary={diagnostic.gpu.name} secondary={`Driver ${diagnostic.gpu.driverVersion}`} />
              <HwRow icon={HermesDiskIcon} label="DISCO PRINCIPAL" primary={diagnostic.disk.physicalName} secondary={`${diagnostic.disk.mediaType} • ${formatGb(diagnostic.disk.totalGb)} GB • ${diskUsage}% usado`} />
              <HwRow icon={HermesMotherboardIcon} label="PLACA-MÃE" primary={`Fabricante: ${diagnostic.system.motherboardManufacturer}`} secondary={`Modelo: ${diagnostic.system.motherboardModel}`} />
            </InfoPanel>

            <InfoPanel title="RECOMENDAÇÕES HERMES">
              {recommendations.map((recommendation) => {
                const visual = getRecommendationVisual(recommendation);
                return (
                  <RecRow
                    key={recommendation.id}
                    icon={visual.icon}
                    color={visual.color}
                    title={recommendation.title}
                    desc={recommendation.description}
                  />
                );
              })}
              <button className="mt-2 text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                Ver todas as recomendações →
              </button>
            </InfoPanel>
          </div>

          {/* Status bar */}
          <div className="rounded-2xl bg-card border border-border/60 p-2.5 flex flex-wrap items-center gap-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] 2xl:flex-nowrap">
            <StatusItem icon={Zap} label="INICIALIZAÇÃO" value={`${diagnostic.startup.totalItems} itens`} sub={`${startupImpact} impacto`} />
            <div className="w-px h-12 bg-border" />
            <StatusItem icon={Clock} label="UPTIME" value={diagnostic.uptime.label} sub="Sistema estável" />
            <div className="w-px h-12 bg-border" />
            <StatusItem icon={Shield} label="SEGURANÇA" value={diagnostic.defender.status} sub="Windows Defender" />
            <div className="w-px h-12 bg-border" />
            <StatusItem icon={RefreshCw} label="ATUALIZAÇÕES" value={updateStatus} sub={diagnostic.windowsUpdate.lastHotfixId} />
            <button
              aria-busy={isOptimizeRunning}
              aria-label="Otimizar agora. Análise e segurança engine PRO."
              className="optimize-cta group ml-auto shrink-0 relative overflow-hidden h-[58px] w-[210px] rounded-xl text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] 2xl:h-[60px] 2xl:w-[220px]"
              disabled={isOptimizeRunning}
              onClick={handleOptimizeNow}
            >
              <span className="sr-only">OTIMIZAR AGORA</span>
              <span className="sr-only">Análise e segurança engine PRO</span>
              <span aria-hidden="true" className="hidden">
                <Zap className="w-4 h-4 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.75)]" fill="currentColor" />
              </span>
            </button>
          </div>

          <p className="text-center text-[11px] text-muted-foreground mt-3">
            Hermes Optimizer 0.1.0 • Somente leitura • Nenhuma alteração é feita no sistema
          </p>
        </main>
      </div>
    </div>
  );
}

function StatusItem({ icon: Icon, label, value, sub }: { icon: typeof Zap; label: string; value: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5 px-2.5 flex-1 min-w-0">
      <div className="w-9 h-9 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
        <Icon className="w-[18px] h-[18px] text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold leading-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground truncate">{sub}</p>
      </div>
    </div>
  );
}

function getRecommendationVisual(recommendation: AdvisorRecommendation) {
  if (recommendation.category === "hardware") {
    return { icon: Gamepad2, color: "bg-purple-accent/15 text-purple-accent" };
  }

  if (recommendation.category === "profile") {
    return { icon: Gamepad2, color: "bg-purple-accent/15 text-purple-accent" };
  }

  if (recommendation.category === "cleanup") {
    return { icon: Zap, color: "bg-primary/15 text-primary" };
  }

  if (recommendation.category === "power") {
    return { icon: Zap, color: "bg-info/15 text-info" };
  }

  if (recommendation.severity === "success") {
    return { icon: CheckCircle2, color: "bg-success/15 text-success" };
  }

  if (recommendation.severity === "warning") {
    return { icon: AlertTriangle, color: "bg-warning/15 text-warning" };
  }

  return { icon: Info, color: "bg-info/15 text-info" };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value);
}

function formatGb(value: number) {
  return formatNumber(value);
}

function formatGhz(clockMhz: number) {
  if (!clockMhz || clockMhz <= 0) {
    return "clock indisponível";
  }

  return `${formatNumber(clockMhz / 1000)} GHz`;
}

function getStartupImpactLabel(report: DiagnosticReport) {
  if (report.startup.highImpactCount >= 3 || report.startup.totalItems >= 25) {
    return "Alto";
  }

  if (report.startup.highImpactCount >= 1 || report.startup.totalItems >= 10) {
    return "Médio";
  }

  return "Baixo";
}
