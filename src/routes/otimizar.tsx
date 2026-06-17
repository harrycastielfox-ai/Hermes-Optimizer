import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  Cpu,
  Gamepad2,
  Gauge,
  HardDrive,
  ListChecks,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { GlobalAnalysisModal } from "@/components/analysis/GlobalAnalysisModal";
import { SafeTestModeNotice } from "@/components/common/SafeTestModeNotice";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SmartOptimizeModal } from "@/components/optimization/SmartOptimizeModal";
import {
  fallbackDiagnosticReport,
  loadDiagnosticReport,
  type DiagnosticReport,
} from "@/lib/diagnostic";
import { HERMES_SAFE_TEST_MODE } from "@/lib/safe-mode";

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
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [analysisRunKey, setAnalysisRunKey] = useState(0);
  const [isSmartOptimizeOpen, setIsSmartOptimizeOpen] = useState(false);
  const [smartOptimizeRunKey, setSmartOptimizeRunKey] = useState(0);

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

  const handleAnalyzeNow = useCallback(() => {
    if (isAnalysisModalOpen) {
      return;
    }

    setAnalysisRunKey((current) => current + 1);
    setIsAnalysisModalOpen(true);
  }, [isAnalysisModalOpen]);

  const handleOptimizeNow = useCallback(() => {
    if (isSmartOptimizeOpen) {
      return;
    }

    setSmartOptimizeRunKey((current) => current + 1);
    setIsSmartOptimizeOpen(true);
  }, [isSmartOptimizeOpen]);

  const handleDiagnosticUpdate = useCallback((report: DiagnosticReport) => {
    setDiagnostic(report);
  }, []);

  const healthScore = Math.round(diagnostic.healthScore);
  const projectStats = [
    { label: "Saude", value: `${healthScore}/100` },
    { label: "Plano", value: "150 acoes" },
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

            <section className="mt-4">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <PrimaryModeButton
                  icon={ListChecks}
                  eyebrow="BOTAO 1"
                  title={isAnalysisModalOpen ? "Analisando..." : "Analisar PC"}
                  description="Diagnostico global, IA local, hardware, disco, rede, seguranca e recomendacoes. Nao altera nada."
                  tone="analysis"
                  onClick={handleAnalyzeNow}
                  disabled={isAnalysisModalOpen}
                />
                <PrimaryModeButton
                  icon={Sparkles}
                  eyebrow="BOTAO 2"
                  title={isSmartOptimizeOpen ? "Otimizando..." : "Otimizar Tudo"}
                  description="Valida 150 acoes por fases, escolhe perfil recomendado e mistura Central, Gamer, limpeza, reparo e componentes."
                  tone="resolve"
                  onClick={handleOptimizeNow}
                  disabled={isSmartOptimizeOpen}
                />
              </div>
            </section>

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

      <GlobalAnalysisModal
        open={isAnalysisModalOpen}
        runKey={analysisRunKey}
        onClose={() => setIsAnalysisModalOpen(false)}
        onDiagnostic={handleDiagnosticUpdate}
      />
      <SmartOptimizeModal
        open={isSmartOptimizeOpen}
        runKey={smartOptimizeRunKey}
        onClose={() => setIsSmartOptimizeOpen(false)}
      />
    </div>
  );
}

function PrimaryModeButton({
  icon: Icon,
  eyebrow,
  title,
  description,
  tone,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  tone: "analysis" | "resolve";
  onClick: () => void;
  disabled?: boolean;
}) {
  const toneClass =
    tone === "resolve"
      ? "border-primary/55 bg-primary text-primary-foreground shadow-[0_20px_42px_-24px_rgba(37,99,235,0.95)] hover:bg-primary/95"
      : "border-border/70 bg-background/80 text-foreground hover:border-primary/35 hover:bg-primary/5";
  const iconClass = tone === "resolve" ? "bg-white/18 text-white" : "bg-primary-soft text-primary";
  const mutedClass = tone === "resolve" ? "text-white/78" : "text-muted-foreground";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group flex min-h-[148px] items-center gap-4 rounded-2xl border px-4 py-5 text-left transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${toneClass}`}
    >
      <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl ${iconClass}`}>
        <Icon className="h-8 w-8" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[10px] font-bold tracking-[0.18em] ${mutedClass}`}>
          {eyebrow}
        </span>
        <span className="mt-1 block text-2xl font-black leading-tight">{title}</span>
        <span className={`mt-2 block text-[12px] leading-relaxed ${mutedClass}`}>
          {description}
        </span>
      </span>
      <ArrowRight
        className={`h-5 w-5 shrink-0 transition group-hover:translate-x-0.5 ${
          tone === "resolve" ? "text-white/85" : "text-muted-foreground group-hover:text-primary"
        }`}
      />
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
