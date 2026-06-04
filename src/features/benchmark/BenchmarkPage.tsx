import { useEffect, useState } from "react";
import { PrimaryButton } from "../../components/buttons/PrimaryButton";
import { MetricCard } from "../../components/cards/MetricCard";
import { SectionCard } from "../../components/cards/SectionCard";
import { ApiNotice } from "../../components/feedback/AsyncState";
import { PageHeader } from "../../components/layout/PageHeader";
import { getLastBenchmarkResult, runLightBenchmark } from "../../lib/tauri";
import type { BenchmarkResult } from "../../lib/types";

function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
}

function formatBenchmarkTime(timestamp: string) {
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || seconds <= 0) return "Horário local não disponível";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(seconds * 1000));
}

function accentForScore(score: number) {
  if (score >= 85) return "green" as const;
  if (score >= 70) return "cyan" as const;
  return "purple" as const;
}

function scoreText(score: number) {
  return `${Math.round(score)}/100`;
}

type BenchmarkState = "idle" | "loading-last" | "running" | "done" | "error";

export function BenchmarkPage() {
  const [state, setState] = useState<BenchmarkState>("loading-last");
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    let mounted = true;
    getLastBenchmarkResult()
      .then((response) => {
        if (!mounted) return;
        setFallback(response.fallback ?? false);
        setError(response.error);
        setResult(response.data);
        setState(response.data ? "done" : "idle");
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Não foi possível consultar o último benchmark.");
        setState("idle");
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function handleRunBenchmark() {
    setState("running");
    setError(undefined);
    try {
      const response = await runLightBenchmark();
      setFallback(response.fallback ?? false);
      setError(response.error);
      setResult(response.data);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao executar benchmark leve.");
      setState("error");
    }
  }

  const running = state === "running" || state === "loading-last";
  const hasResult = Boolean(result);

  return (
    <>
      <PageHeader eyebrow="Benchmark Engine" title="Benchmark Hermes" description="Medições locais leves, somente leitura, sem alteração no Windows." />
      <ApiNotice error={error} fallback={fallback} />

      <div className="space-y-5">
        <SectionCard title="Execução segura" description="Teste leve e local. Nenhuma configuração será alterada.">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2 text-sm leading-6 text-slate-300">
              <p>• Local e sem envio de dados para internet.</p>
              <p>• Somente leitura: não altera Registro, serviços, Defender, Firewall, Windows Update, drivers, energia ou configurações.</p>
              <p>• CPU/RAM/disco usam cargas pequenas e curtas; GPU recebe apenas readiness inicial sem benchmark gráfico pesado.</p>
            </div>
            <PrimaryButton onClick={handleRunBenchmark} disabled={running} className="min-w-48">
              {state === "running" ? "Executando..." : "Executar benchmark"}
            </PrimaryButton>
          </div>
          {state === "idle" && (
            <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
              Nenhum benchmark foi executado nesta sessão. Clique em executar para criar uma linha de base local para comparações futuras.
            </p>
          )}
          {state === "running" && (
            <p className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
              Benchmark leve em andamento. O Hermes está medindo operações curtas e controladas, sem aplicar tweaks ou alterações no Windows.
            </p>
          )}
          {state === "error" && (
            <p className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
              Não foi possível concluir o benchmark agora. Feche apps pesados e tente novamente. Detalhe: {error}
            </p>
          )}
        </SectionCard>

        <div className="grid grid-cols-5 gap-4">
          <MetricCard title="CPU" value={hasResult ? scoreText(result!.cpu.score) : "—"} description={hasResult ? `${result!.cpu.elapsedMs} ms • ${result!.cpu.classification}` : "Aguardando execução"} accent={hasResult ? accentForScore(result!.cpu.score) : "cyan"} />
          <MetricCard title="RAM" value={hasResult ? scoreText(result!.memory.score) : "—"} description={hasResult ? `${result!.memory.testedMb} MB • ${formatNumber(result!.memory.throughputMbS, 1)} MB/s` : "Aguardando execução"} accent={hasResult ? accentForScore(result!.memory.score) : "cyan"} />
          <MetricCard title="Disco" value={hasResult ? scoreText(result!.disk.score) : "—"} description={hasResult ? `${result!.disk.testedMb} MB • L ${formatNumber(result!.disk.readMbS, 1)} / E ${formatNumber(result!.disk.writeMbS, 1)} MB/s` : "Aguardando execução"} accent={hasResult ? accentForScore(result!.disk.score) : "cyan"} />
          <MetricCard title="GPU" value={hasResult ? scoreText(result!.gpu.readinessScore) : "—"} description={hasResult ? (result!.gpu.detected ? "Detectada • readiness inicial" : "Não detectada nesta leitura") : "Aguardando execução"} accent={hasResult ? accentForScore(result!.gpu.readinessScore) : "cyan"} />
          <MetricCard title="Score Geral" value={hasResult ? scoreText(result!.score.overallScore) : "—"} description={hasResult ? result!.score.classification : "Sem pontuação ainda"} accent={hasResult ? accentForScore(result!.score.overallScore) : "cyan"} />
        </div>

        {result && (
          <>
            <div className="grid grid-cols-3 gap-5">
              <SectionCard title="Resultado" description={result.summary}>
                <div className="space-y-3 text-sm text-slate-300">
                  <p>Executado em: <strong className="text-white">{formatBenchmarkTime(result.timestamp)}</strong></p>
                  <p>Gaming readiness: <strong className="text-white">{result.score.gamingReadinessScore}/100</strong></p>
                  <p>Estabilidade percebida: <strong className="text-white">{result.score.stabilityScore}/100</strong></p>
                  <p className="leading-6 text-slate-400">{result.score.explanation}</p>
                </div>
              </SectionCard>

              <SectionCard title="Hardware snapshot" description="Estrutura preparada para futuro histórico SQLite/local store.">
                <div className="space-y-3 text-sm text-slate-300">
                  <p>CPU: <strong className="text-white">{result.hardwareSnapshot.cpuName}</strong></p>
                  <p>Threads: <strong className="text-white">{result.hardwareSnapshot.cpuThreads}</strong></p>
                  <p>RAM total: <strong className="text-white">{formatNumber(result.hardwareSnapshot.memoryTotalGb, 1)} GB</strong></p>
                  <p>Disco: <strong className="text-white">{result.hardwareSnapshot.primaryDisk}</strong></p>
                  <p>GPU: <strong className="text-white">{result.hardwareSnapshot.gpuName}</strong></p>
                  <p>VRAM informada: <strong className="text-white">{result.hardwareSnapshot.gpuMemoryMb > 0 ? `${formatNumber(result.hardwareSnapshot.gpuMemoryMb, 0)} MB` : "Não informada"}</strong></p>
                </div>
              </SectionCard>

              <SectionCard title="Segurança" description="Escopo desta fase do Benchmark Engine.">
                <ul className="space-y-2 text-sm leading-6 text-slate-300">
                  <li>• Sem stress test agressivo.</li>
                  <li>• Sem benchmark gráfico pesado.</li>
                  <li>• Sem instalação de dependências.</li>
                  <li>• Sem internet e sem telemetria.</li>
                  <li>• {result.safetyNote}</li>
                </ul>
              </SectionCard>
            </div>

            <SectionCard title="Hermes Advisor para benchmark" description="Recomendações simples baseadas no teste leve atual.">
              <div className="grid grid-cols-2 gap-4">
                {result.recommendations.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-white">{item.title}</h3>
                      <span className="rounded-full border border-cyan-300/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-200">{item.severity}</span>
                    </div>
                    <p className="text-sm leading-6 text-slate-400">{item.message}</p>
                  </article>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Detalhes técnicos" description="O que é medido de verdade nesta fase e o que ainda é aproximação.">
              <div className="grid grid-cols-2 gap-4 text-sm leading-6 text-slate-300">
                <p><strong className="text-white">CPU real:</strong> {result.cpu.details}</p>
                <p><strong className="text-white">RAM real:</strong> {result.memory.details}</p>
                <p><strong className="text-white">Disco real:</strong> {result.disk.details}</p>
                <p><strong className="text-white">GPU aproximada:</strong> {result.gpu.details}</p>
              </div>
            </SectionCard>
          </>
        )}
      </div>
    </>
  );
}
