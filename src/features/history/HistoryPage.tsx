import { MetricCard } from "../../components/cards/MetricCard";
import { SectionCard } from "../../components/cards/SectionCard";
import { ApiNotice, LoadingState } from "../../components/feedback/AsyncState";
import { PageHeader } from "../../components/layout/PageHeader";
import { useHermesResource } from "../../lib/hooks/useHermesResource";
import { getHistoryOverview } from "../../lib/tauri";

function formatHistoryTime(timestamp: number) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "Horário local não disponível";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(timestamp * 1000));
}

function deltaText(delta?: number) {
  if (delta === undefined) return "—";
  if (delta > 0) return `+${delta} pontos`;
  if (delta < 0) return `${delta} pontos`;
  return "estável";
}

export function HistoryPage() {
  const { data: history, loading, error, fallback } = useHermesResource(getHistoryOverview);

  return (
    <>
      <PageHeader eyebrow="Histórico Inteligente Local" title="Histórico" description="Comparação local leve entre execuções, com retenção automática e sem nuvem, conta, telemetria ou serviços em segundo plano." />
      <ApiNotice error={error} fallback={fallback} />
      {loading || !history ? <LoadingState /> : (
        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-4">
            <MetricCard title="Benchmarks" value={`${history.benchmarks.length}/20`} description={history.benchmarkComparison?.message ?? "Execute dois benchmarks para comparar."} accent="cyan" />
            <MetricCard title="Diagnósticos" value={`${history.diagnostics.length}/20`} description={history.diagnosticComparison?.message ?? "Execute dois diagnósticos para comparar."} accent="green" />
            <MetricCard title="Logs" value={`${history.logs.length}/20`} description="Eventos locais recentes" />
            <MetricCard title="Snapshots" value={`${history.snapshots.length}/10`} description="Snapshots lógicos locais" />
          </div>

          <SectionCard title="Comparação" description="A comparação usa o registro mais recente contra o imediatamente anterior.">
            <div className="grid grid-cols-2 gap-4 text-sm text-slate-300">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <h3 className="font-semibold text-white">Benchmark</h3>
                <p className="mt-2 text-2xl font-bold text-cyan-100">{deltaText(history.benchmarkComparison?.delta)}</p>
                <p className="mt-2 text-slate-400">Atual: {history.benchmarkComparison?.currentScore ?? "—"} • Anterior: {history.benchmarkComparison?.previousScore ?? "—"}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <h3 className="font-semibold text-white">Diagnóstico</h3>
                <p className="mt-2 text-2xl font-bold text-emerald-100">{deltaText(history.diagnosticComparison?.delta)}</p>
                <p className="mt-2 text-slate-400">Atual: {history.diagnosticComparison?.currentScore ?? "—"} • Anterior: {history.diagnosticComparison?.previousScore ?? "—"}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Advisor local" description="Regras simples consultando apenas o histórico local.">
            <ul className="space-y-2 text-sm text-slate-300">
              {history.advisorInsights.map((insight) => <li key={insight}>• {insight}</li>)}
            </ul>
          </SectionCard>

          <SectionCard title="Benchmarks" description="Últimos 20 resultados salvos automaticamente.">
            <div className="space-y-3">
              {history.benchmarks.map((item) => (
                <article key={item.id} className="grid grid-cols-[160px_110px_1fr] gap-4 rounded-2xl border border-slate-800 bg-slate-900/45 p-4 text-sm">
                  <span className="text-slate-400">{formatHistoryTime(item.timestamp)}</span>
                  <strong className="text-white">Overall {item.overallScore}</strong>
                  <span className="text-slate-300">CPU {item.cpuScore} • RAM {item.ramScore} • Disco {item.diskScore} • GPU {item.gpuScore} • Gamer {item.gamingReadiness}</span>
                </article>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Diagnósticos" description="Últimos 20 diagnósticos salvos automaticamente.">
            <div className="space-y-3">
              {history.diagnostics.map((item) => (
                <article key={item.id} className="grid grid-cols-[160px_120px_1fr] gap-4 rounded-2xl border border-slate-800 bg-slate-900/45 p-4 text-sm">
                  <span className="text-slate-400">{formatHistoryTime(item.timestamp)}</span>
                  <strong className="text-white">Health {item.healthScore}</strong>
                  <span className="text-slate-300">{item.issuesCount} problema(s) • {item.recommendationsCount} recomendação(ões) • {item.summary}</span>
                </article>
              ))}
            </div>
          </SectionCard>

          <div className="grid grid-cols-2 gap-5">
            <SectionCard title="Logs" description="Últimos 20 eventos locais.">
              <div className="space-y-3">
                {history.logs.map((item) => <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4 text-sm text-slate-300"><strong className="text-white">{item.action}</strong><span className="ml-2 text-slate-500">{formatHistoryTime(item.timestamp)}</span><p className="mt-1 text-slate-400">{item.details}</p></article>)}
              </div>
            </SectionCard>
            <SectionCard title="Snapshots" description="Últimos 10 snapshots lógicos.">
              <div className="space-y-3">
                {history.snapshots.map((item) => <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4 text-sm text-slate-300"><strong className="text-white">{item.name}</strong><span className="ml-2 text-slate-500">{formatHistoryTime(item.timestamp)}</span><p className="mt-1 text-slate-400">{item.description}</p><p className="mt-1 text-slate-500">{item.hardwareSummary}</p></article>)}
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Persistência e privacidade" description="Arquivo local estruturado do usuário; nenhum dado sai da máquina.">
            <p className="text-sm text-slate-300">Banco: <code className="rounded bg-slate-950 px-2 py-1 text-cyan-100">{history.databasePath}</code></p>
          </SectionCard>
        </div>
      )}
    </>
  );
}
