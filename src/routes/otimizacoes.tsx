import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Eye,
  Gauge,
  Gamepad2,
  ListChecks,
  LockKeyhole,
  MonitorCog,
  Palette,
  Power,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SafeTestModeNotice } from "@/components/common/SafeTestModeNotice";
import { Sidebar } from "@/components/dashboard/Sidebar";
import {
  fallbackAdvancedCatalog,
  loadAdvancedCatalog,
  type AdvancedAction,
  type AdvancedBlockedAction,
  type AdvancedCatalog,
  type AdvancedMethod,
  type AdvancedRisk,
} from "@/lib/advanced";
import {
  fallbackPerformanceReport,
  loadPerformanceReport,
  type PerformanceReport,
  type PerformanceSetting,
} from "@/lib/performance";
import { HERMES_SAFE_TEST_MODE } from "@/lib/safe-mode";

export const Route = createFileRoute("/otimizacoes")({
  head: () => ({
    meta: [
      { title: "Hermes Optimizer - Otimiza??es" },
      { name: "description", content: "Performance Engine somente leitura do Hermes Optimizer." },
    ],
  }),
  component: OtimizacoesPage,
});

function OtimizacoesPage() {
  const [report, setReport] = useState<PerformanceReport>(fallbackPerformanceReport);
  const [advancedCatalog, setAdvancedCatalog] = useState<AdvancedCatalog>(fallbackAdvancedCatalog);
  const [selectedRecommendationId, setSelectedRecommendationId] =
    useState<OptimizationRecommendationId>("system");
  const [showAdvancedView, setShowAdvancedView] = useState(false);
  const recommendationDetailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        const nextReport = await loadPerformanceReport();
        if (!mounted) {
          return;
        }
        setReport(nextReport);

        const nextCatalog = await loadAdvancedCatalog();
        if (!mounted) {
          return;
        }
        setAdvancedCatalog(nextCatalog);
      })();
    }, 350);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, []);

  const recommendations = buildOptimizationRecommendations(report, advancedCatalog);
  const selectedRecommendation =
    recommendations.find((item) => item.id === selectedRecommendationId) ?? recommendations[0];

  function selectRecommendation(recommendationId: OptimizationRecommendationId) {
    setSelectedRecommendationId(recommendationId);
    window.setTimeout(() => {
      recommendationDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  return (
    <div className="lightning-bg min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 px-5 pt-6 pb-4 overflow-auto xl:px-8 xl:pt-7">
          <div className="mb-6">
            <p className="text-xs font-bold tracking-[0.22em] text-primary mb-2">
              OTIMIZACOES RECOMENDADAS
            </p>
            <h1 className="text-[clamp(26px,2vw,32px)] leading-tight font-bold tracking-tight text-foreground">
              Otimiza??es
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1">
              Com base no diagn?stico do seu PC, o Hermes organizou ajustes que podem melhorar
              desempenho, inicializa??o e experi?ncia geral, mantendo reversao e modo seguro.
            </p>
          </div>

          <SafeTestModeNotice />

          <section className="rounded-2xl bg-card border border-border/60 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-[0.18em] text-primary">
                  O QUE O HERMES RECOMENDA
                </h2>
                <p className="text-[12px] text-muted-foreground mt-1">
                  Primeira camada em linguagem simples. Os detalhes tecnicos continuam disponiveis
                  abaixo.
                </p>
              </div>
              <ModePill />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {recommendations.map((recommendation) => (
                <RecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  selected={recommendation.id === selectedRecommendation.id}
                  onSelect={() => selectRecommendation(recommendation.id)}
                />
              ))}
            </div>

            <div ref={recommendationDetailRef}>
              <RecommendationDetail recommendation={selectedRecommendation} />
            </div>
          </section>

          <section className="mt-4 rounded-2xl bg-card border border-border/60 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
            <button
              type="button"
              onClick={() => setShowAdvancedView((current) => !current)}
              className="flex w-full items-center justify-between gap-4 text-left"
            >
              <div>
                <h2 className="text-sm font-bold tracking-[0.18em] text-primary">
                  COMO O HERMES FAZ ISSO
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Performance Engine, Advanced Engine, comandos, valores e a??es bloqueadas ficam
                  recolhidos por padr?o.
                </p>
              </div>
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary">
                {showAdvancedView ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </span>
            </button>

            {showAdvancedView && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                  <SummaryCard
                    icon={Power}
                    label="ENERGIA"
                    value={report.powerPlan.status}
                    sub={report.powerPlan.activeSchemeName}
                  />
                  <SummaryCard
                    icon={Gamepad2}
                    label="MODO JOGO"
                    value={report.gameMode.status}
                    sub="Configuracao do Windows"
                  />
                  <SummaryCard
                    icon={Palette}
                    label="EFEITOS VISUAIS"
                    value={report.visualEffects.status}
                    sub={report.visualEffects.profile}
                  />
                  <SummaryCard
                    icon={MonitorCog}
                    label="SEGUNDO PLANO"
                    value={report.backgroundApps.status}
                    sub="Apps em background"
                  />
                </div>

                <section className="rounded-2xl border border-border/60 bg-background/55 p-4">
                  <div className="flex flex-col gap-1 mb-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-sm font-bold tracking-[0.18em] text-primary">
                        AJUSTES DETECTADOS
                      </h2>
                      <p className="text-[12px] text-muted-foreground mt-1">
                        Leitura local das configura??es que influenciam desempenho. Detalhes
                        tecnicos ficam recolhidos.
                      </p>
                    </div>
                    <span className="inline-flex w-fit items-center rounded-full border border-success/20 bg-success/10 px-3 py-1 text-[11px] font-semibold text-success">
                      Somente leitura
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    {report.settings.map((item) => (
                      <SettingRow key={item.id} item={item} />
                    ))}
                  </div>

                  {report.warnings.length > 0 && (
                    <div className="mt-3 rounded-xl bg-warning/10 px-3 py-2 text-[12px] text-warning">
                      {report.warnings[0]}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-border/60 bg-background/55 p-4">
                  <h2 className="text-sm font-bold tracking-[0.18em] text-primary">
                    PREPARADO PARA REVERSAO
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    A Performance Engine j? esta separada para criar um ponto de seguran?a antes de
                    qualquer ajuste real futuro.
                  </p>
                </section>

                <AdvancedEnginePanel catalog={advancedCatalog} />
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

type OptimizationRecommendationId =
  | "system"
  | "startup"
  | "gamer"
  | "visual"
  | "network"
  | "advanced";
type CentralLevelId = "seguro" | "limpeza" | "performance" | "gamer" | "avancado";

type OptimizationRecommendation = {
  id: OptimizationRecommendationId;
  centralLevel: CentralLevelId;
  icon: LucideIcon;
  title: string;
  state: string;
  recommendation: string;
  impact: string;
  level: AdvancedRisk;
  rollback: string;
  mode: string;
  detail: string;
};

function buildOptimizationRecommendations(
  report: PerformanceReport,
  catalog: AdvancedCatalog,
): OptimizationRecommendation[] {
  const startupDelay = findAction(catalog, "disable-startup-delay");
  const dnsFlush = findAction(catalog, "flush-dns-cache");
  const highPerformance = findAction(catalog, "set-high-performance-power-plan");
  const gameDvr = findAction(catalog, "disable-game-dvr");

  return [
    {
      id: "system",
      centralLevel: "performance",
      icon: Power,
      title: "Desempenho do Sistema",
      state: report.powerPlan.status,
      recommendation: highPerformance
        ? "Preparar ajuste controlado do plano de energia."
        : "Manter leitura do plano de energia atual.",
      impact: "Pode melhorar resposta geral, com poss?vel aumento de consumo.",
      level: "medium",
      rollback: "Dispon?vel",
      mode: safeModeLabel(),
      detail: `Plano atual: ${report.powerPlan.activeSchemeName}. O Hermes recomenda validar energia antes de qualquer perfil.`,
    },
    {
      id: "startup",
      centralLevel: "performance",
      icon: ListChecks,
      title: "Inicializa??o",
      state: startupDelay?.currentValue || "Monitorada",
      recommendation: "Revisar atrasos e itens que iniciam com o Windows.",
      impact: "Pode reduzir tempo de boot e deixar o login mais leve.",
      level: startupDelay ? "medium" : "low",
      rollback: "Dispon?vel",
      mode: safeModeLabel(),
      detail:
        "A recomenda??o principal e validar primeiro. O Hermes n?o remove programas e n?o apaga executaveis.",
    },
    {
      id: "gamer",
      centralLevel: "gamer",
      icon: Gamepad2,
      title: "Experi?ncia Gamer",
      state: report.gameMode.status,
      recommendation: gameDvr
        ? "Verificar Modo Jogo e captura em segundo plano."
        : "Validar Modo Jogo antes de aplicar perfil gamer.",
      impact: "Pode melhorar foco em jogos e reduzir tarefas desnecessarias durante partidas.",
      level: "medium",
      rollback: "Dispon?vel",
      mode: safeModeLabel(),
      detail:
        "O Hermes deve sugerir ajustes e fechamento de apps apenas com confirmacao, preservando processos protegidos.",
    },
    {
      id: "visual",
      centralLevel: "performance",
      icon: Palette,
      title: "Efeitos Visuais",
      state: report.visualEffects.profile,
      recommendation:
        "Reduzir apenas efeitos opcionais, sem alterar tema do Windows ou navegadores.",
      impact: "Pode melhorar fluidez em maquinas intermediarias.",
      level: "low",
      rollback: "Dispon?vel",
      mode: safeModeLabel(),
      detail:
        "Transparencias, animacoes e sombras devem continuar opt-in, reversiveis e explicadas antes de qualquer mudanca real.",
    },
    {
      id: "network",
      centralLevel: "avan?ado",
      icon: Wifi,
      title: "Rede/DNS",
      state: dnsFlush ? "Cache local detectado" : "Sem a??o indicada",
      recommendation: "Limpar cache DNS apenas se houver lentidao ou falha de navegacao.",
      impact: "Pode resolver problemas tempor?rios de resolucao de nomes.",
      level: "low",
      rollback: "N?o necess?rio",
      mode: safeModeLabel(),
      detail: "Esta e uma a??o temporaria. N?o muda configura??es permanentes de rede.",
    },
    {
      id: "advanced",
      centralLevel: "avan?ado",
      icon: Terminal,
      title: "Avan?ado",
      state: `${catalog.actions.length} acoes seguras`,
      recommendation:
        "Manter recursos avancados disponiveis apenas para valida??o e detalhes tecnicos.",
      impact:
        "Permite auditar CMD, PowerShell e Registro sem expor complexidade na primeira camada.",
      level: "high",
      rollback: "Conforme a??o",
      mode: safeModeLabel(),
      detail:
        "A??es bloqueadas continuam bloqueadas. Comandos profundos exigem confirmacao forte em Reparar Windows.",
    },
  ];
}

function RecommendationCard({
  recommendation,
  selected,
  onSelect,
}: {
  recommendation: OptimizationRecommendation;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = recommendation.icon;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`cursor-pointer rounded-2xl border p-4 transition focus:outline-none focus:ring-2 focus:ring-primary/35 focus:ring-offset-2 focus:ring-offset-background ${
        selected
          ? "border-primary/60 bg-blue-50/70 shadow-[0_16px_34px_-28px_rgba(37,99,235,0.85)] dark:bg-primary/12 dark:shadow-[0_16px_34px_-28px_rgba(59,130,246,0.9)]"
          : "border-border/70 bg-background/70 hover:border-primary/30 hover:bg-blue-50/30 dark:hover:border-primary/45 dark:hover:bg-primary/10"
      }`}
      aria-pressed={selected}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold leading-tight text-foreground">
              {recommendation.title}
            </h3>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${riskVisual(recommendation.level)}`}
            >
              {riskLabel(recommendation.level)}
            </span>
          </div>
          <p className="mt-2 text-[12px] text-muted-foreground">{recommendation.recommendation}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <MiniFact label="Estado" value={recommendation.state} />
        <MiniFact label="Modo" value={recommendation.mode} />
        <MiniFact label="Reversao" value={recommendation.rollback} />
        <MiniFact
          label="Impacto"
          value={
            recommendation.level === "high"
              ? "Avan?ado"
              : recommendation.level === "medium"
                ? "Medio"
                : "Leve"
          }
        />
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        className={`mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition ${
          selected
            ? "bg-primary text-primary-foreground shadow-[0_10px_24px_-16px_rgba(37,99,235,0.95)]"
            : "border border-border bg-card text-foreground hover:bg-muted dark:hover:bg-primary/10"
        }`}
      >
        Entender recomenda??o
        <ArrowRight className="h-4 w-4" />
      </button>
    </article>
  );
}

function RecommendationDetail({ recommendation }: { recommendation: OptimizationRecommendation }) {
  const Icon = recommendation.icon;

  return (
    <div className="mt-4 scroll-mt-6 rounded-2xl border border-primary/45 bg-blue-50/50 p-4 shadow-[0_18px_46px_-30px_rgba(37,99,235,0.75),0_0_0_1px_rgba(37,99,235,0.10)_inset,0_0_28px_-20px_rgba(37,99,235,0.95)] dark:bg-primary/12 dark:shadow-[0_18px_46px_-30px_rgba(59,130,246,0.85),0_0_0_1px_rgba(59,130,246,0.18)_inset,0_0_28px_-20px_rgba(59,130,246,0.95)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-primary dark:bg-primary/15">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-primary">
              RECOMENDACAO SELECIONADA
            </p>
            <h3 className="mt-1 text-lg font-bold text-foreground">{recommendation.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{recommendation.detail}</p>
            <p className="mt-2 text-sm font-semibold text-primary">{recommendation.impact}</p>
          </div>
        </div>

        <Link
          to="/central"
          search={{ nivel: recommendation.centralLevel, recomendacao: recommendation.id }}
          className="inline-flex h-10 w-fit shrink-0 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-white px-4 text-sm font-bold text-primary transition hover:bg-blue-50 dark:bg-background/70 dark:hover:bg-primary/10"
        >
          Ir para Central
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/70 px-3 py-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-[12px] font-bold text-foreground">{value}</p>
    </div>
  );
}

function ModePill() {
  return (
    <span className="inline-flex w-fit items-center rounded-full border border-warning/25 bg-warning/10 px-3 py-1 text-[11px] font-bold text-warning">
      {safeModeLabel()}
    </span>
  );
}

function safeModeLabel() {
  return HERMES_SAFE_TEST_MODE ? "Dry-run ativo" : "Confirmacao exigida";
}

function findAction(catalog: AdvancedCatalog, id: string) {
  return catalog.actions.find((action) => action.id === id);
}

function AdvancedEnginePanel({ catalog }: { catalog: AdvancedCatalog }) {
  return (
    <section className="mt-4 rounded-2xl bg-card border border-border/60 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-sm font-bold tracking-[0.18em] text-primary">
            ACOES AVANCADAS PREPARADAS
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Recursos importantes continuam disponiveis, mas os comandos e chaves tecnicas ficam
            recolhidos por padr?o.
          </p>
        </div>
        <div className="flex shrink-0">
          <Link
            to="/personalizado"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[0_10px_26px_-14px_rgba(37,99,235,0.85)] transition hover:bg-primary/95"
          >
            <Terminal className="w-4 h-4" />
            Abrir Personalizado
          </Link>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
        {catalog.actions.map((action) => (
          <AdvancedActionRow key={action.id} action={action} />
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-border/70 bg-background/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <LockKeyhole className="w-4 h-4 text-primary" />
          <h3 className="text-[11px] font-bold tracking-[0.18em] text-primary">
            BLOQUEADOS NESTA FASE
          </h3>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 xl:grid-cols-2">
          {catalog.blockedActions.map((item) => (
            <BlockedActionRow key={item.id} item={item} />
          ))}
        </div>
      </div>

      {catalog.warnings.length > 0 && (
        <div className="mt-3 rounded-xl bg-warning/10 px-3 py-2 text-[12px] text-warning">
          {catalog.warnings[0]}
        </div>
      )}
    </section>
  );
}

function AdvancedActionRow({ action }: { action: AdvancedAction }) {
  const [showDetails, setShowDetails] = useState(false);
  const presentation = advancedPresentation(action);

  return (
    <div className="rounded-xl border border-border/70 bg-background/70 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{presentation.title}</p>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${riskVisual(action.risk)}`}
            >
              {riskLabel(action.risk)}
            </span>
            {action.reversible && <StatusBadge label="Revers?vel" />}
            {action.requiresAdmin && <StatusBadge label="Admin" tone="warning" />}
            {!action.persistent && <StatusBadge label="Temporario" />}
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground">{presentation.description}</p>
          <p className="mt-1 text-[12px] font-semibold text-primary">{presentation.impact}</p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="text-[11px] text-muted-foreground">Estado</p>
          <p className="text-sm font-semibold text-foreground">
            {action.persistent ? "Revers?vel" : "Temporario"}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-primary">
            {HERMES_SAFE_TEST_MODE ? "Preparado" : "Confirmacao exigida"}
          </p>
        </div>
      </div>
      <TechnicalDetails open={showDetails} onToggle={() => setShowDetails((current) => !current)}>
        <TechnicalLine label="Titulo t?cnico" value={action.title} />
        <TechnicalLine label="Metodo" value={methodLabel(action.method)} />
        <TechnicalLine label="Valor atual" value={action.currentValue} />
        <TechnicalLine label="Mudanca planejada" value={action.plannedChange} />
        <TechnicalLine label="Preview t?cnico" value={action.commandPreview} />
        <TechnicalLine label="Persistente" value={action.persistent ? "sim" : "n?o"} />
        <TechnicalLine label="Revers?vel" value={action.reversible ? "sim" : "n?o"} />
      </TechnicalDetails>
    </div>
  );
}

function BlockedActionRow({ item }: { item: AdvancedBlockedAction }) {
  const [showDetails, setShowDetails] = useState(false);
  const presentation = blockedPresentation(item);

  return (
    <div className="rounded-xl border border-border/70 bg-card px-3 py-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-warning" />
        <p className="text-sm font-semibold text-foreground">{presentation.title}</p>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${riskVisual(item.risk)}`}
        >
          {riskLabel(item.risk)}
        </span>
      </div>
      <p className="mt-1 text-[12px] text-muted-foreground">{presentation.reason}</p>
      <TechnicalDetails open={showDetails} onToggle={() => setShowDetails((current) => !current)}>
        <TechnicalLine label="Titulo t?cnico" value={item.title} />
        <TechnicalLine label="Metodo" value={methodLabel(item.method)} />
        <TechnicalLine label="Exige admin" value={item.requiresAdmin ? "sim" : "n?o"} />
        <TechnicalLine label="Exige modo extremo" value={item.requiresExtreme ? "sim" : "n?o"} />
        <TechnicalLine label="Motivo original" value={item.reason} />
      </TechnicalDetails>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Power;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border/60 p-4 flex items-center gap-3 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
      <div className="w-11 h-11 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-wider text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold leading-tight truncate">{value}</p>
        <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
      </div>
    </div>
  );
}

function methodLabel(method: AdvancedMethod) {
  if (method === "cmd") {
    return "CMD";
  }

  if (method === "powerShell") {
    return "PowerShell";
  }

  return "Registro";
}

function riskLabel(risk: AdvancedRisk) {
  if (risk === "high") {
    return "Alto";
  }

  if (risk === "medium") {
    return "Medio";
  }

  return "Baixo";
}

function riskVisual(risk: AdvancedRisk) {
  if (risk === "high") {
    return "bg-destructive/10 text-destructive border-destructive/20";
  }

  if (risk === "medium") {
    return "bg-warning/15 text-warning border-warning/25";
  }

  return "bg-success/15 text-success border-success/25";
}

function advancedPresentation(action: AdvancedAction) {
  const map: Record<string, { title: string; description: string; impact: string }> = {
    "enable-game-mode": {
      title: "Modo Jogo do Windows",
      description: "Prepara o Windows para priorizar a experi?ncia em jogos.",
      impact: "Impacto: melhor foco em jogos. Revers?vel.",
    },
    "disable-game-dvr": {
      title: "Captura Xbox / Game DVR",
      description: "Reduz gravacao em segundo plano durante jogos.",
      impact: "Impacto: pode melhorar FPS e reduzir overhead. Revers?vel.",
    },
    "disable-startup-delay": {
      title: "Atraso de inicializa??o",
      description: "Reduz a espera antes de iniciar apps ap?s login.",
      impact: "Impacto: inicializa??o mais r?pida. Revers?vel.",
    },
    "flush-dns-cache": {
      title: "Limpar cache DNS",
      description: "Limpa o cache local de nomes de rede.",
      impact: "Impacto: pode resolver lentidao ou falhas de navegacao. Temporario.",
    },
    "list-power-plans": {
      title: "Ver planos de energia",
      description: "Lista os planos disponiveis sem alterar nada.",
      impact: "Impacto: somente leitura. Sem risco de mudanca.",
    },
    "set-high-performance-power-plan": {
      title: "Plano de alto desempenho",
      description: "Prepara troca controlada para maior desempenho.",
      impact: "Impacto: mais desempenho com poss?vel maior consumo. Revers?vel.",
    },
    "disable-transparency": {
      title: "Transparencias do Windows",
      description: "Pode reduzir efeitos visuais leves quando o usu?rio aceitar.",
      impact: "Impacto: apar?ncia mais simples e uso gr?fico menor. Opt-in.",
    },
    "disable-window-animations": {
      title: "Animacoes do Windows",
      description: "Pode reduzir animacoes de janelas quando o usu?rio aceitar.",
      impact: "Impacto: sensacao mais r?pida. Opt-in e revers?vel.",
    },
    "disable-visual-shadows": {
      title: "Sombras visuais",
      description: "Pode reduzir sombras leves da interface quando o usu?rio aceitar.",
      impact: "Impacto: menor custo visual. Opt-in e revers?vel.",
    },
    "set-visual-effects-custom": {
      title: "Efeitos visuais do Windows",
      description: "Marca os efeitos como personalizados apenas com confirmacao clara.",
      impact: "Impacto: apar?ncia/desempenho. Opt-in e revers?vel.",
    },
  };

  return (
    map[action.id] ?? {
      title: action.title,
      description: action.description,
      impact: "Impacto: preparado com confirmacao e dry-run.",
    }
  );
}

function blockedPresentation(item: AdvancedBlockedAction) {
  const map: Record<string, { title: string; reason: string }> = {
    "chkdsk-repair": {
      title: "Reparo profundo do disco",
      reason: "Bloqueado por seguran?a: pode demorar muito e exigir reinicio.",
    },
    "defrag-optimize": {
      title: "Otimiza??o autom?tica de disco",
      reason: "Bloqueado: precisa diferenciar SSD, HDD e NVMe antes de qualquer execu??o.",
    },
    "winsock-reset": {
      title: "Reset completo de rede",
      reason: "Bloqueado: pode alterar conectividade e exigir reinicio.",
    },
    "disable-windows-update": {
      title: "Desativar atualiza??es do Windows",
      reason: "Bloqueado: atualiza??es de seguran?a n?o devem ser desativadas permanentemente.",
    },
    "disable-defender": {
      title: "Desativar prote??o do Windows",
      reason: "Bloqueado: prote??o permanente n?o ser? reduzida automaticamente.",
    },
    "delete-user-files": {
      title: "Apagar arquivos pessoais",
      reason: "Bloqueado: arquivos pessoais ficam fora do Hermes.",
    },
    "remove-programs": {
      title: "Remover programas",
      reason: "Bloqueado: o Hermes nunca remove softwares.",
    },
    "free-registry-delete": {
      title: "Altera??es livres no sistema",
      reason: "Bloqueado: somente itens da lista segura podem ser preparados.",
    },
    "hklm-multimedia-tweaks": {
      title: "Ajustes profundos de multimidia",
      reason: "Bloqueado: exige administrador e backup dedicado.",
    },
    "sfc-scan-now": {
      title: "Verificador de arquivos do Windows",
      reason: "Preparado para Reparar Windows com confirmacao forte.",
    },
    "dism-restore-health": {
      title: "Reparo da imagem do Windows",
      reason: "Preparado para Reparar Windows com confirmacao forte.",
    },
  };

  return map[item.id] ?? { title: item.title, reason: item.reason };
}

function performancePresentation(item: PerformanceSetting) {
  const map: Record<string, { title: string; description: string; impact: string }> = {
    "power-plan": {
      title: "Plano de energia",
      description: "Define como o Windows equilibra consumo e desempenho.",
      impact: "Impacto: desempenho, bateria e temperatura.",
    },
    "game-mode": {
      title: "Modo Jogo",
      description: "Ajuda o Windows a priorizar a experi?ncia em jogos.",
      impact: "Impacto: estabilidade e foco durante jogos.",
    },
    transparency: {
      title: "Transparencias",
      description: "Efeito visual do Windows. Nunca muda sem aceite explicito.",
      impact: "Impacto: apar?ncia e custo gr?fico leve.",
    },
    animations: {
      title: "Animacoes",
      description: "Efeitos de movimento da interface. Ajuste sempre opt-in.",
      impact: "Impacto: sensacao de velocidade e apar?ncia.",
    },
    shadows: {
      title: "Sombras visuais",
      description: "Sombras da interface. Ajuste sempre revers?vel.",
      impact: "Impacto: apar?ncia e custo visual leve.",
    },
    "background-apps": {
      title: "Apps em segundo plano",
      description: "Apps que podem continuar trabalhando mesmo sem estar em uso.",
      impact: "Impacto: consumo de recursos e bateria.",
    },
  };

  const presentation = map[item.id] ?? {
    title: item.label,
    description: "Configuracao de desempenho monitorada pelo Hermes.",
    impact: "Impacto: depende do estado atual do Windows.",
  };

  return { ...presentation, state: item.value };
}

function SettingRow({ item }: { item: PerformanceSetting }) {
  const [showDetails, setShowDetails] = useState(false);
  const Icon = getSettingIcon(item.id);
  const visual = getStatusVisual(item.status);
  const presentation = performancePresentation(item);

  return (
    <div className="rounded-xl border border-border/70 bg-background/70 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{presentation.title}</p>
            <p className="text-[12px] text-muted-foreground">{presentation.description}</p>
            <p className="mt-1 text-[11px] font-semibold text-primary">{presentation.impact}</p>
          </div>
        </div>
        <span className={`w-fit rounded-full border px-3 py-1 text-[11px] font-bold ${visual}`}>
          {presentation.state}
        </span>
      </div>
      <TechnicalDetails open={showDetails} onToggle={() => setShowDetails((current) => !current)}>
        <TechnicalLine label="Nome t?cnico" value={item.label} />
        <TechnicalLine label="Fonte" value={item.source} />
        <TechnicalLine label="Valor lido" value={item.value} />
        <TechnicalLine label="Estado interno" value={item.status} />
        <TechnicalLine
          label="Otimizavel futuramente"
          value={item.canOptimizeLater ? "sim" : "n?o"}
        />
      </TechnicalDetails>
    </div>
  );
}

function TechnicalDetails({
  open,
  onToggle,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mt-3 border-t border-border/70 pt-3">
      <button
        type="button"
        onClick={onToggle}
        className="text-[12px] font-bold text-primary transition hover:text-primary/80"
      >
        {open ? "Ocultar detalhes tecnicos" : "Ver detalhes tecnicos"}
      </button>
      {open && <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">{children}</div>}
    </div>
  );
}

function TechnicalLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-card px-3 py-2">
      <p className="text-[10px] font-bold tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-[12px] font-semibold text-foreground">
        {value || "indispon?vel"}
      </p>
    </div>
  );
}

function StatusBadge({ label, tone = "default" }: { label: string; tone?: "default" | "warning" }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
        tone === "warning"
          ? "border-warning/25 bg-warning/10 text-warning"
          : "border-primary/20 bg-primary/10 text-primary"
      }`}
    >
      {label}
    </span>
  );
}

function getSettingIcon(id: string) {
  if (id === "power-plan") {
    return Power;
  }

  if (id === "game-mode") {
    return Gamepad2;
  }

  if (id === "transparency") {
    return Eye;
  }

  if (id === "animations" || id === "shadows") {
    return Sparkles;
  }

  if (id === "background-apps") {
    return Gauge;
  }

  return ShieldCheck;
}

function getStatusVisual(status: PerformanceSetting["status"]) {
  if (status === "optimized" || status === "disabled") {
    return "bg-success/15 text-success border-success/25";
  }

  if (status === "balanced") {
    return "bg-info/15 text-info border-info/25";
  }

  if (status === "enabled") {
    return "bg-warning/15 text-warning border-warning/25";
  }

  return "bg-muted text-muted-foreground border-border";
}
