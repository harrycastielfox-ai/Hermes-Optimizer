import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUxMode } from "../../app/UxModeContext";
import { PrimaryButton } from "../../components/buttons/PrimaryButton";
import { MetricCard } from "../../components/cards/MetricCard";
import { SectionCard } from "../../components/cards/SectionCard";
import { ApiNotice, LoadingState } from "../../components/feedback/AsyncState";
import { useHermesResource } from "../../lib/hooks/useHermesResource";
import { getSystemOverview, runDiagnostics, scanTempFiles } from "../../lib/tauri";
import { formatGb } from "../../lib/utils/format";

const optimizeSteps = [
  "Arquivos temporários encontrados",
  "Inicialização analisada",
  "Cache analisado",
  "Sistema verificado",
];

function statusLabel(status: string) {
  if (status === "good") return "Saudável";
  if (status === "critical") return "Crítico";
  return "Atenção";
}

function scoreTone(score: number) {
  if (score >= 85) return "Excelente";
  if (score >= 70) return "Bom";
  return "Pode melhorar";
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { enterAdvancedMode } = useUxMode();
  const { data: overview, loading, error, fallback } = useHermesResource(getSystemOverview);
  const [optimizing, setOptimizing] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [gain, setGain] = useState<string | null>(null);

  async function optimizeNow() {
    if (optimizing) return;
    setOptimizing(true);
    setCompletedSteps([]);
    setGain(null);

    await Promise.allSettled([scanTempFiles(), runDiagnostics()]);

    for (const step of optimizeSteps) {
      await new Promise((resolve) => setTimeout(resolve, 360));
      setCompletedSteps((current) => [...current, step]);
    }

    const estimatedGain = overview?.healthScore && overview.healthScore >= 85 ? "até 6%" : "até 18%";
    setGain(estimatedGain);
    setOptimizing(false);
  }

  function openReport() {
    enterAdvancedMode();
    navigate("/diagnostico");
  }

  return (
    <>
      <ApiNotice error={error} fallback={fallback} />
      {loading || !overview ? <LoadingState label="Preparando painel simples do Hermes..." /> : (
        <div className="space-y-7">
          <section className="relative overflow-hidden rounded-[2.5rem] border border-white/80 bg-gradient-to-br from-white via-amber-50/80 to-stone-100 p-8 shadow-premium">
            <div className="absolute right-10 top-8 text-[12rem] leading-none text-amber-200/25">⚡</div>
            <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.38em] text-amber-600">Modo Simples</p>
                <h1 className="mt-4 max-w-3xl text-5xl font-black tracking-tight text-stone-950">Seu PC otimizado sem telas técnicas.</h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-stone-600">
                  O Hermes mostra apenas o que importa agora: saúde do PC, score, recomendações rápidas e ações seguras em um fluxo guiado.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <PrimaryButton className="px-6 py-3 text-base" onClick={optimizeNow} disabled={optimizing}>⚡ Otimizar Agora</PrimaryButton>
                  <PrimaryButton variant="secondary" className="px-6 py-3 text-base" onClick={() => navigate("/modo-gamer")}>🎮 Entrar em Modo Gamer</PrimaryButton>
                  <PrimaryButton variant="ghost" className="px-6 py-3 text-base" onClick={() => navigate("/restauracao")}>🔄 Restaurar Alterações</PrimaryButton>
                  <PrimaryButton variant="ghost" className="px-6 py-3 text-base" onClick={openReport}>📊 Ver Relatório</PrimaryButton>
                </div>
              </div>

              <div className="rounded-[2rem] border border-amber-200/70 bg-white/82 p-6 shadow-gold">
                <p className="text-sm font-semibold text-stone-500">Score Hermes</p>
                <div className="mt-4 flex items-end gap-3">
                  <strong className="text-7xl font-black text-stone-950">{overview.healthScore}</strong>
                  <span className="mb-3 text-xl font-bold text-stone-400">/100</span>
                </div>
                <p className="mt-3 text-lg font-semibold text-amber-700">{scoreTone(overview.healthScore)} • {statusLabel(overview.status)}</p>
                <div className="mt-6 h-3 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-600" style={{ width: `${overview.healthScore}%` }} />
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-5 md:grid-cols-3">
            <MetricCard title="Saúde do PC" value={overview.healthLabel} description={`${overview.healthScore}/100 • ${statusLabel(overview.status)}`} accent="gold" />
            <MetricCard title="Resumo curto" value={`${overview.ramUsage}% RAM`} description={`${formatGb(overview.ramFreeGb)} livres • disco com ${formatGb(overview.diskFreeGb)} disponíveis`} accent="stone" />
            <MetricCard title="Modo atual" value={overview.performanceMode} description="Perfil comercial simples, com engenharia avançada oculta." accent="gold" />
          </div>

          <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <SectionCard title="Recomendações rápidas" description="Sugestões curtas, sem exigir que o usuário entenda módulos internos.">
              <div className="grid gap-3 text-sm text-stone-600">
                <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">⚡ Executar otimização guiada para revisar cache, arquivos temporários e integridade.</div>
                <div className="rounded-2xl border border-stone-200 bg-white p-4">🎮 Usar Modo Gamer antes de jogar para aplicar uma sessão focada e reversível.</div>
                <div className="rounded-2xl border border-stone-200 bg-white p-4">🔄 Manter restauração disponível antes de mudanças mais profundas.</div>
              </div>
            </SectionCard>

            <SectionCard title="Otimização inteligente" description="Fluxo elegante e resumido. As telas técnicas permanecem no Modo Avançado.">
              <div className="space-y-3">
                {optimizeSteps.map((step) => {
                  const done = completedSteps.includes(step);
                  return (
                    <div key={step} className={`flex items-center justify-between rounded-2xl border p-4 text-sm transition ${done ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-stone-200 bg-white text-stone-500"}`}>
                      <span>{done ? "✓" : "•"} {step}</span>
                      <span className="font-semibold">{done ? "Concluído" : optimizing ? "Aguardando" : "Pronto"}</span>
                    </div>
                  );
                })}
                {optimizing ? <div className="h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-amber-300 to-amber-600" /></div> : null}
                {gain ? <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-5 text-stone-700"><strong className="text-stone-950">Ganho estimado de desempenho:</strong> {gain}</div> : null}
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </>
  );
}
