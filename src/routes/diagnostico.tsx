import { createFileRoute } from "@tanstack/react-router";
import { Activity, Cpu, Gauge, HardDrive, MemoryStick, RefreshCw, Shield, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { fallbackBenchmarkReport, runBenchmark, type BenchmarkComponentScore, type BenchmarkReport } from "@/lib/benchmark";

export const Route = createFileRoute("/diagnostico")({
  head: () => ({
    meta: [
      { title: "Hermes Optimizer - Diagnostico" },
      { name: "description", content: "Benchmark local leve do Hermes Optimizer." },
    ],
  }),
  component: DiagnosticoPage,
});

function DiagnosticoPage() {
  const [report, setReport] = useState<BenchmarkReport>(fallbackBenchmarkReport);
  const [isRunning, setIsRunning] = useState(false);

  const executeBenchmark = useCallback(async () => {
    if (isRunning) {
      return;
    }

    setIsRunning(true);
    try {
      const nextReport = await runBenchmark();
      setReport(nextReport);
    } finally {
      setIsRunning(false);
    }
  }, [isRunning]);

  useEffect(() => {
    let mounted = true;
    const timer = window.setTimeout(() => {
      if (mounted) {
        executeBenchmark();
      }
    }, 450);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, []);

  const deltaText = formatDelta(report.delta);

  return (
    <div className="lightning-bg min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 px-5 pt-6 pb-4 overflow-auto xl:px-8 xl:pt-7">
          <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.22em] text-primary mb-2">BENCHMARK ENGINE</p>
              <h1 className="text-[clamp(26px,2vw,32px)] leading-tight font-bold tracking-tight text-foreground">Diagnostico</h1>
              <p className="text-[13px] text-muted-foreground mt-1">
                Benchmark leve, local e somente leitura para comparar antes e depois das otimizacoes.
              </p>
            </div>
            <button
              className="inline-flex h-10 w-fit items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:bg-muted"
              disabled={isRunning}
              onClick={executeBenchmark}
            >
              <RefreshCw className={`h-4 w-4 text-primary ${isRunning ? "animate-spin" : ""}`} />
              Reexecutar benchmark
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 mb-4 lg:grid-cols-[1.1fr_0.9fr_0.9fr]">
            <section className="rounded-2xl bg-card border border-border/60 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold tracking-wider text-muted-foreground">SCORE ATUAL</p>
                  <p className="mt-1 text-5xl font-bold leading-none text-foreground">{report.score}</p>
                  <p className="mt-2 text-sm font-semibold text-primary">{report.verdict}</p>
                </div>
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary-soft">
                  <Gauge className="h-11 w-11 text-primary" />
                </div>
              </div>
            </section>

            <SummaryCard icon={Activity} label="ANTES" value={report.previousScore == null ? "Base" : String(report.previousScore)} sub="Benchmark anterior" />
            <SummaryCard icon={Zap} label="DIFERENCA" value={deltaText} sub="Comparacao local" />
          </div>

          <section className="rounded-2xl bg-card border border-border/60 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
            <div className="mb-4">
              <h2 className="text-sm font-bold tracking-[0.18em] text-primary">COMPONENTES DO SCORE</h2>
              <p className="text-[12px] text-muted-foreground mt-1">Leitura rapida de estado. Nao executa stress test e nao altera o Windows.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <ComponentRow icon={Cpu} item={report.components.cpu} />
              <ComponentRow icon={MemoryStick} item={report.components.memory} />
              <ComponentRow icon={HardDrive} item={report.components.disk} />
              <ComponentRow icon={Zap} item={report.components.startup} />
              <ComponentRow icon={Gauge} item={report.components.power} />
              <ComponentRow icon={Shield} item={report.components.security} />
            </div>
          </section>

          <section className="mt-4 rounded-2xl bg-card border border-border/60 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
            <h2 className="text-sm font-bold tracking-[0.18em] text-primary">OBSERVACOES</h2>
            <div className="mt-3 space-y-2">
              {report.observations.map((observation) => (
                <p key={observation} className="rounded-xl bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  {observation}
                </p>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub }: { icon: typeof Zap; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border/60 p-5 flex items-center gap-3 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
      <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-wider text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold leading-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
      </div>
    </div>
  );
}

function ComponentRow({ icon: Icon, item }: { icon: typeof Zap; item: BenchmarkComponentScore }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/70 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{item.label}</p>
            <p className="text-[12px] text-muted-foreground truncate">{item.detail}</p>
          </div>
        </div>
        <p className="text-lg font-bold text-foreground">{item.score}</p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${item.score}%` }} />
      </div>
    </div>
  );
}

function formatDelta(delta?: number) {
  if (delta == null) {
    return "Base";
  }

  if (delta > 0) {
    return `+${delta}`;
  }

  return String(delta);
}
