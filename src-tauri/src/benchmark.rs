use crate::diagnostic;
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf, time::SystemTime};
use tauri::{AppHandle, Manager};

const MAX_BENCHMARK_REPORTS: usize = 20;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BenchmarkReport {
    pub generated_at: String,
    pub engine_version: String,
    pub read_only: bool,
    pub score: u8,
    pub previous_score: Option<u8>,
    pub delta: Option<i16>,
    pub verdict: String,
    pub components: BenchmarkComponents,
    pub observations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BenchmarkComponents {
    pub cpu: BenchmarkComponentScore,
    pub memory: BenchmarkComponentScore,
    pub disk: BenchmarkComponentScore,
    pub startup: BenchmarkComponentScore,
    pub power: BenchmarkComponentScore,
    pub security: BenchmarkComponentScore,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BenchmarkComponentScore {
    pub score: u8,
    pub label: String,
    pub detail: String,
    pub weight: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct BenchmarkHistory {
    reports: Vec<BenchmarkReport>,
}

#[tauri::command]
pub async fn benchmark_engine_run(app: AppHandle) -> Result<BenchmarkReport, String> {
    tauri::async_runtime::spawn_blocking(move || benchmark_engine_run_blocking(app))
        .await
        .map_err(|err| format!("Falha ao executar benchmark em segundo plano: {err}"))?
}

fn benchmark_engine_run_blocking(app: AppHandle) -> Result<BenchmarkReport, String> {
    let diagnostic = diagnostic::collect_diagnostic_report();
    let history_path = benchmark_history_path(&app)?;
    let mut history = read_history(&history_path);
    let previous_score = history.reports.first().map(|report| report.score);
    let report = build_report(&diagnostic, previous_score);

    history.reports.insert(0, report.clone());
    history.reports.truncate(MAX_BENCHMARK_REPORTS);
    write_history(&history_path, &history)?;

    Ok(report)
}

fn build_report(
    diagnostic: &diagnostic::DiagnosticReport,
    previous_score: Option<u8>,
) -> BenchmarkReport {
    let components = BenchmarkComponents {
        cpu: cpu_score(diagnostic),
        memory: memory_score(diagnostic),
        disk: disk_score(diagnostic),
        startup: startup_score(diagnostic),
        power: power_score(diagnostic),
        security: security_score(diagnostic),
    };

    let score = weighted_score(&components);
    let delta = previous_score.map(|previous| score as i16 - previous as i16);

    BenchmarkReport {
        generated_at: now_timestamp(),
        engine_version: "benchmark-engine-light-readonly-v1".to_string(),
        read_only: true,
        score,
        previous_score,
        delta,
        verdict: verdict(score, delta).to_string(),
        observations: observations(diagnostic, &components, delta),
        components,
    }
}

fn cpu_score(diagnostic: &diagnostic::DiagnosticReport) -> BenchmarkComponentScore {
    let usage = diagnostic.cpu.usage_percent.clamp(0.0, 100.0);
    let score = (100.0 - usage * 0.65).clamp(35.0, 100.0).round() as u8;
    component(
        score,
        "CPU",
        format!("{:.0}% em uso durante a leitura", usage),
        20,
    )
}

fn memory_score(diagnostic: &diagnostic::DiagnosticReport) -> BenchmarkComponentScore {
    let usage = diagnostic.ram.used_percent.clamp(0.0, 100.0);
    let score = (100.0 - usage * 0.5).clamp(30.0, 100.0).round() as u8;
    component(
        score,
        "RAM",
        format!(
            "{:.1} GB livres de {:.1} GB",
            diagnostic.ram.free_gb, diagnostic.ram.total_gb
        ),
        20,
    )
}

fn disk_score(diagnostic: &diagnostic::DiagnosticReport) -> BenchmarkComponentScore {
    let free_percent = if diagnostic.disk.total_gb <= 0.0 {
        0.0
    } else {
        (diagnostic.disk.free_gb / diagnostic.disk.total_gb * 100.0).clamp(0.0, 100.0)
    };
    let media_bonus = if diagnostic.disk.media_type.to_lowercase().contains("ssd") {
        8.0
    } else {
        0.0
    };
    let score = (55.0 + free_percent * 0.45 + media_bonus)
        .clamp(30.0, 100.0)
        .round() as u8;
    component(
        score,
        "Disco",
        format!(
            "{:.1} GB livres em {}",
            diagnostic.disk.free_gb, diagnostic.disk.mount
        ),
        20,
    )
}

fn startup_score(diagnostic: &diagnostic::DiagnosticReport) -> BenchmarkComponentScore {
    let penalty = diagnostic.startup.total_items as f32 * 1.8
        + diagnostic.startup.high_impact_count as f32 * 5.0;
    let score = (100.0 - penalty).clamp(25.0, 100.0).round() as u8;
    component(
        score,
        "Inicializacao",
        format!(
            "{} itens, {} de alto impacto",
            diagnostic.startup.total_items, diagnostic.startup.high_impact_count
        ),
        15,
    )
}

fn power_score(diagnostic: &diagnostic::DiagnosticReport) -> BenchmarkComponentScore {
    let normalized = diagnostic.power_plan.active_scheme_name.to_lowercase();
    let score = if normalized.contains("alto")
        || normalized.contains("high")
        || normalized.contains("ultimate")
    {
        100
    } else if normalized.contains("equilibr") || normalized.contains("balanced") {
        82
    } else if normalized.contains("econom") || normalized.contains("power saver") {
        68
    } else {
        75
    };
    component(
        score,
        "Energia",
        diagnostic.power_plan.active_scheme_name.clone(),
        15,
    )
}

fn security_score(diagnostic: &diagnostic::DiagnosticReport) -> BenchmarkComponentScore {
    let score = if diagnostic.defender.active { 100 } else { 60 };
    component(score, "Seguranca", diagnostic.defender.status.clone(), 10)
}

fn component(
    score: u8,
    label: impl Into<String>,
    detail: impl Into<String>,
    weight: u8,
) -> BenchmarkComponentScore {
    BenchmarkComponentScore {
        score,
        label: label.into(),
        detail: detail.into(),
        weight,
    }
}

fn weighted_score(components: &BenchmarkComponents) -> u8 {
    let weighted_total = components.cpu.score as u32 * components.cpu.weight as u32
        + components.memory.score as u32 * components.memory.weight as u32
        + components.disk.score as u32 * components.disk.weight as u32
        + components.startup.score as u32 * components.startup.weight as u32
        + components.power.score as u32 * components.power.weight as u32
        + components.security.score as u32 * components.security.weight as u32;
    let weight_total = components.cpu.weight as u32
        + components.memory.weight as u32
        + components.disk.weight as u32
        + components.startup.weight as u32
        + components.power.weight as u32
        + components.security.weight as u32;

    ((weighted_total as f32 / weight_total as f32).round() as u8).clamp(0, 100)
}

fn verdict(score: u8, delta: Option<i16>) -> &'static str {
    if let Some(delta) = delta {
        if delta >= 5 {
            return "Melhorou desde o ultimo benchmark";
        }
        if delta <= -5 {
            return "Caiu desde o ultimo benchmark";
        }
    }

    if score >= 90 {
        "Excelente"
    } else if score >= 80 {
        "Bom"
    } else if score >= 65 {
        "Regular"
    } else {
        "Precisa de atencao"
    }
}

fn observations(
    diagnostic: &diagnostic::DiagnosticReport,
    components: &BenchmarkComponents,
    delta: Option<i16>,
) -> Vec<String> {
    let mut observations = Vec::new();

    if let Some(delta) = delta {
        if delta > 0 {
            observations.push(format!(
                "Score subiu {delta} ponto(s) desde a ultima leitura."
            ));
        } else if delta < 0 {
            observations.push(format!(
                "Score caiu {} ponto(s) desde a ultima leitura.",
                delta.abs()
            ));
        } else {
            observations.push("Score estavel desde a ultima leitura.".to_string());
        }
    } else {
        observations.push("Primeiro benchmark salvo como base de comparacao.".to_string());
    }

    if components.startup.score < 75 {
        observations.push("Inicializacao tem potencial claro de melhoria.".to_string());
    }

    if components.power.score < 90 {
        observations.push(format!(
            "Plano de energia atual: {}.",
            diagnostic.power_plan.active_scheme_name
        ));
    }

    observations
}

fn benchmark_history_path(app: &AppHandle) -> Result<PathBuf, String> {
    let mut dir = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("Nao foi possivel localizar AppData: {err}"))?;
    dir.push("history");
    fs::create_dir_all(&dir)
        .map_err(|err| format!("Nao foi possivel criar historico de benchmark: {err}"))?;
    dir.push("benchmark_reports.json");
    Ok(dir)
}

fn read_history(path: &PathBuf) -> BenchmarkHistory {
    let Ok(contents) = fs::read_to_string(path) else {
        return BenchmarkHistory::default();
    };
    serde_json::from_str(&contents).unwrap_or_default()
}

fn write_history(path: &PathBuf, history: &BenchmarkHistory) -> Result<(), String> {
    let contents = serde_json::to_string_pretty(history)
        .map_err(|err| format!("Nao foi possivel serializar benchmark: {err}"))?;
    fs::write(path, contents)
        .map_err(|err| format!("Nao foi possivel gravar historico de benchmark: {err}"))
}

fn now_timestamp() -> String {
    let seconds = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default();
    seconds.to_string()
}
