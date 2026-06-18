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
  score: 0,
  previousScore: undefined,
  delta: undefined,
  verdict: "Benchmark indispon?vel",
  components: {
    cpu: component("CPU", 0, "Indispon?vel sem leitura real", 20),
    memory: component("RAM", 0, "Indispon?vel sem leitura real", 20),
    disk: component("Disco", 0, "Indispon?vel sem leitura real", 20),
    startup: component("Inicializa??o", 0, "Indispon?vel sem leitura real", 15),
    power: component("Energia", 0, "Indispon?vel sem leitura real", 15),
    security: component("Seguran?a", 0, "Indispon?vel sem leitura real", 10),
    antiCheat: component("Anti-Cheat", 0, "Indispon?vel sem leitura real", 10),
  },
  observations: ["Benchmark real indispon?vel. Nenhum score demonstrativo foi exibido."],
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
      console.warn("Benchmark salvo indispon?vel, usando fallback indispon?vel.", error);
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
    console.warn("Benchmark Engine indispon?vel, usando fallback indispon?vel.", error);
    return fallbackBenchmarkReport;
  }
}

function component(
  label: string,
  score: number,
  detail: string,
  weight: number,
): BenchmarkComponentScore {
  return {
    score,
    label,
    detail,
    weight,
  };
}
