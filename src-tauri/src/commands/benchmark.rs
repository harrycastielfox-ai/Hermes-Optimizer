use serde::Serialize;
use serde_json::Value;
use std::fs::{remove_file, File};
use std::hint::black_box;
use std::io::{Read, Write};
use std::sync::{Mutex, OnceLock};
use std::time::{Instant, SystemTime, UNIX_EPOCH};

use super::diagnostics;

const CPU_ITERATIONS: u64 = 2_000_000;
const MEMORY_TEST_BYTES: usize = 8 * 1024 * 1024;
const DISK_TEST_BYTES: usize = 4 * 1024 * 1024;

static LAST_BENCHMARK: OnceLock<Mutex<Option<BenchmarkResult>>> = OnceLock::new();

#[derive(Clone, Serialize)]
pub struct BenchmarkResult {
    id: String,
    timestamp: String,
    cpu: CpuBenchmark,
    memory: MemoryBenchmark,
    disk: DiskBenchmark,
    gpu: GpuBenchmark,
    score: BenchmarkScore,
    recommendations: Vec<BenchmarkRecommendation>,
    summary: String,
    hardware_snapshot: HardwareSnapshot,
    safety_note: String,
    data_source: String,
}

#[derive(Clone, Serialize)]
pub struct CpuBenchmark {
    elapsed_ms: u128,
    iterations: u64,
    score: u8,
    classification: String,
    details: String,
}

#[derive(Clone, Serialize)]
pub struct MemoryBenchmark {
    elapsed_ms: u128,
    tested_mb: u64,
    throughput_mb_s: f64,
    score: u8,
    classification: String,
    details: String,
}

#[derive(Clone, Serialize)]
pub struct DiskBenchmark {
    elapsed_ms: u128,
    tested_mb: u64,
    write_ms: u128,
    read_ms: u128,
    write_mb_s: f64,
    read_mb_s: f64,
    score: u8,
    classification: String,
    details: String,
}

#[derive(Clone, Serialize)]
pub struct GpuBenchmark {
    detected: bool,
    name: String,
    dedicated_memory_mb: u64,
    readiness_score: u8,
    classification: String,
    details: String,
}

#[derive(Clone, Serialize)]
pub struct BenchmarkScore {
    cpu_score: u8,
    memory_score: u8,
    disk_score: u8,
    gpu_readiness_score: u8,
    overall_score: u8,
    gaming_readiness_score: u8,
    stability_score: u8,
    classification: String,
    explanation: String,
}

#[derive(Clone, Serialize)]
pub struct BenchmarkRecommendation {
    id: String,
    title: String,
    message: String,
    severity: String,
}

#[derive(Clone, Serialize)]
pub struct HardwareSnapshot {
    cpu_name: String,
    cpu_threads: u64,
    memory_total_gb: f64,
    primary_disk: String,
    gpu_name: String,
    gpu_detected: bool,
    gpu_memory_mb: u64,
    data_source: String,
}

#[tauri::command]
pub fn run_light_benchmark() -> Result<BenchmarkResult, String> {
    let hardware = hardware_snapshot();
    let cpu = run_cpu_benchmark();
    let memory = run_memory_benchmark();
    let disk = run_disk_benchmark()?;
    let gpu = run_gpu_benchmark(&hardware);
    let score = calculate_score(&cpu, &memory, &disk, &gpu);
    let recommendations = build_recommendations(&memory, &disk, &gpu);
    let timestamp = current_timestamp();
    let result = BenchmarkResult {
        id: format!("bench-{}", timestamp),
        timestamp,
        summary: format!(
            "Benchmark leve concluído com nota {}/100 ({}) em modo local somente leitura.",
            score.overall_score, score.classification
        ),
        cpu,
        memory,
        disk,
        gpu,
        score,
        recommendations,
        hardware_snapshot: hardware,
        safety_note: "Teste leve e local: não altera Registro, serviços, Defender, Firewall, Windows Update, drivers, energia, configurações ou arquivos do usuário.".into(),
        data_source: "Hermes Benchmark Engine local em memória; preparado para histórico persistente futuro.".into(),
    };

    let storage = LAST_BENCHMARK.get_or_init(|| Mutex::new(None));
    if let Ok(mut last) = storage.lock() {
        *last = Some(result.clone());
    }

    Ok(result)
}

#[tauri::command]
pub fn get_last_benchmark_result() -> Option<BenchmarkResult> {
    LAST_BENCHMARK
        .get_or_init(|| Mutex::new(None))
        .lock()
        .ok()
        .and_then(|last| last.clone())
}

fn run_cpu_benchmark() -> CpuBenchmark {
    let start = Instant::now();
    let mut value = 0x9E37_79B9_7F4A_7C15_u64;

    for i in 0..CPU_ITERATIONS {
        value = value
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(i ^ (value >> 13));
        if i % 250_000 == 0 {
            std::thread::yield_now();
        }
    }

    black_box(value);
    let elapsed_ms = start.elapsed().as_millis();
    let score = score_lower_is_better(elapsed_ms, 20, 750);

    CpuBenchmark {
        elapsed_ms,
        iterations: CPU_ITERATIONS,
        score,
        classification: classify(score),
        details: "Loop matemático controlado em thread única; não é stress test e não força CPU ao máximo por longo período.".into(),
    }
}

fn run_memory_benchmark() -> MemoryBenchmark {
    let start = Instant::now();
    let mut buffer = vec![0_u8; MEMORY_TEST_BYTES];

    for (index, byte) in buffer.iter_mut().enumerate() {
        *byte = (index % 251) as u8;
    }

    let checksum: u64 = buffer.iter().map(|byte| u64::from(*byte)).sum();
    black_box(checksum);

    let elapsed_ms = start.elapsed().as_millis().max(1);
    let tested_mb = (MEMORY_TEST_BYTES / 1024 / 1024) as u64;
    let throughput_mb_s = tested_mb as f64 / (elapsed_ms as f64 / 1000.0);
    let score = score_higher_is_better(throughput_mb_s, 250.0, 5_000.0);

    MemoryBenchmark {
        elapsed_ms,
        tested_mb,
        throughput_mb_s,
        score,
        classification: classify(score),
        details: "Alocação temporária pequena com leitura/escrita simples; memória liberada imediatamente ao final do teste.".into(),
    }
}

fn run_disk_benchmark() -> Result<DiskBenchmark, String> {
    let path = std::env::temp_dir().join(format!(
        "hermes_light_benchmark_{}.tmp",
        current_timestamp()
    ));
    let data = vec![0xA5_u8; DISK_TEST_BYTES];
    let tested_mb = (DISK_TEST_BYTES / 1024 / 1024) as u64;
    let mut write_ms = 0;
    let mut read_ms = 0;
    let total_start = Instant::now();

    let result = (|| -> Result<(), String> {
        let write_start = Instant::now();
        {
            let mut file = File::create(&path)
                .map_err(|err| format!("Falha ao criar arquivo temporário seguro: {err}"))?;
            file.write_all(&data).map_err(|err| {
                format!("Falha ao escrever arquivo temporário de benchmark: {err}")
            })?;
            file.sync_all().map_err(|err| {
                format!("Falha ao sincronizar arquivo temporário de benchmark: {err}")
            })?;
        }
        write_ms = write_start.elapsed().as_millis().max(1);

        let read_start = Instant::now();
        let mut file = File::open(&path)
            .map_err(|err| format!("Falha ao reabrir arquivo temporário seguro: {err}"))?;
        let mut read_buffer = Vec::with_capacity(DISK_TEST_BYTES);
        file.read_to_end(&mut read_buffer)
            .map_err(|err| format!("Falha ao ler arquivo temporário de benchmark: {err}"))?;
        black_box(read_buffer.len());
        read_ms = read_start.elapsed().as_millis().max(1);
        Ok(())
    })();

    if path.exists() {
        let _ = remove_file(&path);
    }

    result?;

    let elapsed_ms = total_start.elapsed().as_millis().max(1);
    let write_mb_s = tested_mb as f64 / (write_ms as f64 / 1000.0);
    let read_mb_s = tested_mb as f64 / (read_ms as f64 / 1000.0);
    let average_mb_s = (write_mb_s + read_mb_s) / 2.0;
    let score = score_higher_is_better(average_mb_s, 25.0, 800.0);

    Ok(DiskBenchmark {
        elapsed_ms,
        tested_mb,
        write_ms,
        read_ms,
        write_mb_s,
        read_mb_s,
        score,
        classification: classify(score),
        details: "Arquivo temporário pequeno na pasta temp do usuário; escrito, lido e removido ao final sem varrer ou alterar o disco inteiro.".into(),
    })
}

fn run_gpu_benchmark(snapshot: &HardwareSnapshot) -> GpuBenchmark {
    let readiness_score = if snapshot.gpu_detected { 70 } else { 25 };
    GpuBenchmark {
        detected: snapshot.gpu_detected,
        name: snapshot.gpu_name.clone(),
        dedicated_memory_mb: snapshot.gpu_memory_mb,
        readiness_score,
        classification: classify(readiness_score),
        details: if snapshot.gpu_detected {
            "GPU detectada. Benchmark gráfico real será implementado em fase futura; esta nota mede apenas presença/capacidade básica informada pelo sistema.".into()
        } else {
            "GPU não detectada nesta leitura. Nenhum teste gráfico pesado foi executado.".into()
        },
    }
}

fn calculate_score(
    cpu: &CpuBenchmark,
    memory: &MemoryBenchmark,
    disk: &DiskBenchmark,
    gpu: &GpuBenchmark,
) -> BenchmarkScore {
    let overall = ((cpu.score as u16 * 30
        + memory.score as u16 * 25
        + disk.score as u16 * 25
        + gpu.readiness_score as u16 * 20)
        / 100) as u8;
    let gaming = ((cpu.score as u16 * 30
        + memory.score as u16 * 20
        + disk.score as u16 * 15
        + gpu.readiness_score as u16 * 35)
        / 100) as u8;
    let stability = ((cpu.score as u16 + memory.score as u16 + disk.score as u16) / 3) as u8;
    let classification = classify(overall);

    BenchmarkScore {
        cpu_score: cpu.score,
        memory_score: memory.score,
        disk_score: disk.score,
        gpu_readiness_score: gpu.readiness_score,
        overall_score: overall,
        gaming_readiness_score: gaming,
        stability_score: stability,
        explanation: format!(
            "Nota ponderada: CPU 30%, RAM 25%, Disco 25% e GPU readiness 20%. Classificação atual: {classification}."
        ),
        classification,
    }
}

fn build_recommendations(
    memory: &MemoryBenchmark,
    disk: &DiskBenchmark,
    gpu: &GpuBenchmark,
) -> Vec<BenchmarkRecommendation> {
    vec![
        BenchmarkRecommendation {
            id: "disk-light".into(),
            title: "Disco".into(),
            severity: if disk.score >= 70 {
                "info"
            } else {
                "attention"
            }
            .into(),
            message: if disk.score >= 70 {
                "Seu disco apresentou leitura/escrita saudável para teste leve.".into()
            } else {
                "O teste leve de disco ficou abaixo do esperado; evite conclusões definitivas sem repetir o benchmark com poucos apps abertos.".into()
            },
        },
        BenchmarkRecommendation {
            id: "memory-light".into(),
            title: "RAM".into(),
            severity: if memory.score >= 70 {
                "info"
            } else {
                "attention"
            }
            .into(),
            message: if memory.score >= 70 {
                "Sua RAM respondeu bem no teste controlado.".into()
            } else {
                "A RAM respondeu abaixo do esperado no teste controlado; uso alto em segundo plano pode interferir.".into()
            },
        },
        BenchmarkRecommendation {
            id: "gpu-readiness".into(),
            title: "GPU".into(),
            severity: "info".into(),
            message: if gpu.detected {
                "GPU detectada; desempenho gamer pode variar conforme o jogo, driver e configurações gráficas.".into()
            } else {
                "GPU não detectada nesta leitura; o Hermes mantém estado amigável sem executar benchmark gráfico pesado.".into()
            },
        },
        BenchmarkRecommendation {
            id: "professional-tests".into(),
            title: "Limitação".into(),
            severity: "info".into(),
            message: "Este benchmark é leve e não substitui testes profissionais.".into(),
        },
    ]
}

fn hardware_snapshot() -> HardwareSnapshot {
    let value = serde_json::to_value(diagnostics::get_hardware_info()).unwrap_or(Value::Null);
    let cpu = &value["cpu"];
    let memory = &value["memory"];
    let disks = value["disks"].as_array().cloned().unwrap_or_default();
    let primary_disk = disks
        .iter()
        .find(|disk| disk["is_primary"].as_bool().unwrap_or(false))
        .or_else(|| disks.first())
        .cloned()
        .unwrap_or(Value::Null);
    let gpu = value.get("gpu").cloned().unwrap_or(Value::Null);
    let gpu_detected = gpu["detected"].as_bool().unwrap_or(false);

    HardwareSnapshot {
        cpu_name: string_at(cpu, "name", "CPU não identificada"),
        cpu_threads: cpu["logical_processors"].as_u64().unwrap_or(1),
        memory_total_gb: bytes_to_gb(memory["total_bytes"].as_u64().unwrap_or(0)),
        primary_disk: format!(
            "{} {}",
            string_at(&primary_disk, "drive_letter", "Disco local"),
            string_at(&primary_disk, "media_type", "tipo desconhecido")
        ),
        gpu_name: if gpu_detected {
            string_at(&gpu, "name", "GPU detectada")
        } else {
            "GPU não detectada nesta leitura".into()
        },
        gpu_detected,
        gpu_memory_mb: gpu["dedicated_memory_bytes"].as_u64().unwrap_or(0) / 1024 / 1024,
        data_source: string_at(
            &value,
            "data_source",
            "Hardware snapshot local via diagnóstico Hermes",
        ),
    }
}

fn string_at(value: &Value, key: &str, fallback: &str) -> String {
    value[key].as_str().unwrap_or(fallback).to_string()
}

fn score_lower_is_better(value: u128, excellent: u128, limited: u128) -> u8 {
    if value <= excellent {
        return 100;
    }
    if value >= limited {
        return 35;
    }
    let range = limited - excellent;
    let penalty = ((value - excellent) * 65 / range) as u8;
    100_u8.saturating_sub(penalty)
}

fn score_higher_is_better(value: f64, limited: f64, excellent: f64) -> u8 {
    if value >= excellent {
        return 100;
    }
    if value <= limited {
        return 35;
    }
    let ratio = (value - limited) / (excellent - limited);
    (35.0 + ratio * 65.0).round().clamp(35.0, 100.0) as u8
}

fn classify(score: u8) -> String {
    if score >= 85 {
        "Excelente".into()
    } else if score >= 70 {
        "Bom".into()
    } else if score >= 50 {
        "Atenção".into()
    } else {
        "Limitado".into()
    }
}

fn bytes_to_gb(bytes: u64) -> f64 {
    bytes as f64 / 1024_f64.powi(3)
}

fn current_timestamp() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".into())
}
