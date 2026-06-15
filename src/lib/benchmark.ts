export type BenchmarkComponentScore = {
  score: number;
  label: string;
  detail: string;
  weight: number;
};

export type BenchmarkReport = {
  generatedAt: string;
  engineVersion: string;
  readOnly: boolean;
  score: number;
  previousScore?: number;
  delta?: number;
  verdict: string;
  components: {
    cpu: BenchmarkComponentScore;
    memory: BenchmarkComponentScore;
    disk: BenchmarkComponentScore;
    startup: BenchmarkComponentScore;
    power: BenchmarkComponentScore;
    security: BenchmarkComponentScore;
    antiCheat: BenchmarkComponentScore;
  };
  observations: string[];
};

export const fallbackBenchmarkReport: BenchmarkReport = {
  generatedAt: "0",
  engineVersion: "benchmark-engine-fallback-v1",
  readOnly: true,
  score: 78,
  previousScore: undefined,
  delta: undefined,
  verdict: "Primeiro benchmark salvo como base",
  components: {
    cpu: component("CPU", 85, "23% em uso durante a leitura", 20),
    memory: component("RAM", 74, "7.4 GB livres de 15.7 GB", 20),
    disk: component("Disco", 86, "235 GB livres em C:", 20),
    startup: component("Inicializacao", 60, "17 itens, 2 de alto impacto", 15),
    power: component("Energia", 82, "Equilibrado", 15),
    security: component("Seguranca", 100, "Ativo", 10),
    antiCheat: component("Anti-Cheat", 0, "Aguardando analise", 10),
  },
  observations: ["Primeiro benchmark salvo como base de comparacao."],
};

let benchmarkMemoryCache: BenchmarkReport | null = null;
let benchmarkLoadPromise: Promise<BenchmarkReport> | null = null;

export async function loadCachedBenchmark(): Promise<BenchmarkReport> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return fallbackBenchmarkReport;
  }

  if (benchmarkMemoryCache) {
    return benchmarkMemoryCache;
  }

  benchmarkLoadPromise ??= import("@tauri-apps/api/core")
    .then(({ invoke }) => invoke<BenchmarkReport>("benchmark_engine_read_cached"))
    .then((report) => {
      benchmarkMemoryCache = report;
      return report;
    })
    .catch((error) => {
      console.warn("Benchmark salvo indisponivel, usando fallback local.", error);
      return fallbackBenchmarkReport;
    })
    .finally(() => {
      benchmarkLoadPromise = null;
    });

  return benchmarkLoadPromise;
}

export async function runBenchmark(): Promise<BenchmarkReport> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return fallbackBenchmarkReport;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const report = await invoke<BenchmarkReport>("benchmark_engine_run");
    benchmarkMemoryCache = report;
    return report;
  } catch (error) {
    console.warn("Benchmark Engine indisponivel, usando fallback local.", error);
    return fallbackBenchmarkReport;
  }
}

function component(label: string, score: number, detail: string, weight: number): BenchmarkComponentScore {
  return {
    score,
    label,
    detail,
    weight,
  };
}
