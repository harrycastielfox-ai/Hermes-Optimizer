use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

const BENCHMARK_LIMIT: usize = 20;
const DIAGNOSTIC_LIMIT: usize = 20;
const LOG_LIMIT: usize = 20;
const SNAPSHOT_LIMIT: usize = 10;

#[derive(Clone, Deserialize, Serialize)]
pub struct BenchmarkHistoryEntry {
    pub id: String,
    pub timestamp: i64,
    pub overall_score: u8,
    pub cpu_score: u8,
    pub ram_score: u8,
    pub disk_score: u8,
    pub gpu_score: u8,
    pub gaming_readiness: u8,
    pub summary: String,
}

#[derive(Clone, Deserialize, Serialize)]
pub struct DiagnosticHistoryEntry {
    pub id: String,
    pub timestamp: i64,
    pub health_score: u8,
    pub issues_count: u32,
    pub recommendations_count: u32,
    pub summary: String,
}

#[derive(Clone, Deserialize, Serialize)]
pub struct HistoryLogEntry {
    pub id: String,
    pub timestamp: i64,
    pub level: String,
    pub action: String,
    pub details: String,
}

#[derive(Clone, Deserialize, Serialize)]
pub struct SnapshotHistoryEntry {
    pub id: String,
    pub timestamp: i64,
    pub name: String,
    pub description: String,
    pub hardware_summary: String,
}

#[derive(Clone, Serialize)]
pub struct HistoryComparison {
    pub current_score: u8,
    pub previous_score: u8,
    pub delta: i16,
    pub direction: String,
    pub message: String,
}

#[derive(Deserialize, Serialize)]
struct HistoryStore {
    benchmarks: Vec<BenchmarkHistoryEntry>,
    diagnostics: Vec<DiagnosticHistoryEntry>,
    logs: Vec<HistoryLogEntry>,
    snapshots: Vec<SnapshotHistoryEntry>,
}

#[derive(Serialize)]
pub struct HistoryOverview {
    database_path: String,
    local_only: bool,
    benchmarks: Vec<BenchmarkHistoryEntry>,
    diagnostics: Vec<DiagnosticHistoryEntry>,
    logs: Vec<HistoryLogEntry>,
    snapshots: Vec<SnapshotHistoryEntry>,
    benchmark_comparison: Option<HistoryComparison>,
    diagnostic_comparison: Option<HistoryComparison>,
    advisor_insights: Vec<String>,
}

impl Default for HistoryStore {
    fn default() -> Self {
        Self {
            benchmarks: Vec::new(),
            diagnostics: Vec::new(),
            logs: Vec::new(),
            snapshots: Vec::new(),
        }
    }
}

pub fn save_benchmark_history(
    id: &str,
    timestamp: &str,
    overall_score: u8,
    cpu_score: u8,
    ram_score: u8,
    disk_score: u8,
    gpu_score: u8,
    gaming_readiness: u8,
    summary: &str,
) -> Result<(), String> {
    update_store(|store| {
        upsert_by_id(
            &mut store.benchmarks,
            BenchmarkHistoryEntry {
                id: id.into(),
                timestamp: parse_timestamp(timestamp),
                overall_score,
                cpu_score,
                ram_score,
                disk_score,
                gpu_score,
                gaming_readiness,
                summary: summary.into(),
            },
            |entry| &entry.id,
        );
        retain_latest(&mut store.benchmarks, BENCHMARK_LIMIT, |entry| {
            entry.timestamp
        });
        push_log(store, "info", "benchmark executado", &format!("Overall {overall_score}/100; CPU {cpu_score}; RAM {ram_score}; Disco {disk_score}; GPU {gpu_score}"));
    })
}

pub fn save_diagnostic_history(
    id: &str,
    health_score: u8,
    issues_count: u32,
    recommendations_count: u32,
    summary: &str,
) -> Result<(), String> {
    update_store(|store| {
        upsert_by_id(
            &mut store.diagnostics,
            DiagnosticHistoryEntry {
                id: id.into(),
                timestamp: current_timestamp(),
                health_score,
                issues_count,
                recommendations_count,
                summary: summary.into(),
            },
            |entry| &entry.id,
        );
        retain_latest(&mut store.diagnostics, DIAGNOSTIC_LIMIT, |entry| {
            entry.timestamp
        });
        push_log(store, "info", "diagnóstico executado", &format!("Health Score {health_score}/100; {issues_count} problema(s); {recommendations_count} recomendação(ões)"));
    })
}

pub fn save_snapshot_history(
    id: &str,
    name: &str,
    description: &str,
    hardware_summary: &str,
) -> Result<i64, String> {
    let timestamp = current_timestamp();
    update_store(|store| {
        upsert_by_id(
            &mut store.snapshots,
            SnapshotHistoryEntry {
                id: id.into(),
                timestamp,
                name: name.into(),
                description: description.into(),
                hardware_summary: hardware_summary.into(),
            },
            |entry| &entry.id,
        );
        retain_latest(&mut store.snapshots, SNAPSHOT_LIMIT, |entry| {
            entry.timestamp
        });
        push_log(
            store,
            "info",
            "snapshot criado",
            &format!("{name}: {description}"),
        );
    })?;
    Ok(timestamp)
}

pub fn current_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0)
}

pub fn database_path() -> PathBuf {
    local_data_dir()
        .join("Hermes Optimizer")
        .join("hermes_history.json")
}

#[tauri::command]
pub fn get_history_overview() -> Result<HistoryOverview, String> {
    let store = read_store()?;
    let benchmark_comparison = comparison_from_benchmarks(&store.benchmarks);
    let diagnostic_comparison = comparison_from_diagnostics(&store.diagnostics);
    let advisor_insights = advisor_insights_from_history(&store.benchmarks, &store.diagnostics);
    Ok(HistoryOverview {
        database_path: database_path().display().to_string(),
        local_only: true,
        benchmarks: store.benchmarks,
        diagnostics: store.diagnostics,
        logs: store.logs,
        snapshots: store.snapshots,
        benchmark_comparison,
        diagnostic_comparison,
        advisor_insights,
    })
}

#[tauri::command]
pub fn list_benchmark_history() -> Result<Vec<BenchmarkHistoryEntry>, String> {
    Ok(read_store()?.benchmarks)
}

#[tauri::command]
pub fn list_diagnostic_history() -> Result<Vec<DiagnosticHistoryEntry>, String> {
    Ok(read_store()?.diagnostics)
}

#[tauri::command]
pub fn list_history_logs() -> Result<Vec<HistoryLogEntry>, String> {
    Ok(read_store()?.logs)
}

#[tauri::command]
pub fn list_snapshot_history() -> Result<Vec<SnapshotHistoryEntry>, String> {
    Ok(read_store()?.snapshots)
}

#[tauri::command]
pub fn compare_last_benchmarks() -> Result<Option<HistoryComparison>, String> {
    Ok(comparison_from_benchmarks(&read_store()?.benchmarks))
}

#[tauri::command]
pub fn compare_last_diagnostics() -> Result<Option<HistoryComparison>, String> {
    Ok(comparison_from_diagnostics(&read_store()?.diagnostics))
}

#[tauri::command]
pub fn get_history_advisor_insights() -> Result<Vec<String>, String> {
    let store = read_store()?;
    Ok(advisor_insights_from_history(
        &store.benchmarks,
        &store.diagnostics,
    ))
}

fn read_store() -> Result<HistoryStore, String> {
    let path = database_path();
    if !path.exists() {
        return Ok(HistoryStore::default());
    }
    let content = fs::read_to_string(&path)
        .map_err(|err| format!("Falha ao ler histórico local do Hermes: {err}"))?;
    let mut store = serde_json::from_str::<HistoryStore>(&content).unwrap_or_default();
    normalize_store(&mut store);
    Ok(store)
}

fn write_store(store: &HistoryStore) -> Result<(), String> {
    let path = database_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|err| format!("Falha ao preparar pasta local do histórico: {err}"))?;
    }
    let content = serde_json::to_string_pretty(store)
        .map_err(|err| format!("Falha ao serializar histórico local: {err}"))?;
    fs::write(&path, content).map_err(|err| format!("Falha ao gravar histórico local: {err}"))
}

fn update_store(update: impl FnOnce(&mut HistoryStore)) -> Result<(), String> {
    let mut store = read_store()?;
    update(&mut store);
    normalize_store(&mut store);
    write_store(&store)
}

fn normalize_store(store: &mut HistoryStore) {
    retain_latest(&mut store.benchmarks, BENCHMARK_LIMIT, |entry| {
        entry.timestamp
    });
    retain_latest(&mut store.diagnostics, DIAGNOSTIC_LIMIT, |entry| {
        entry.timestamp
    });
    retain_latest(&mut store.logs, LOG_LIMIT, |entry| entry.timestamp);
    retain_latest(&mut store.snapshots, SNAPSHOT_LIMIT, |entry| {
        entry.timestamp
    });
}

fn retain_latest<T>(items: &mut Vec<T>, limit: usize, timestamp: impl Fn(&T) -> i64) {
    items.sort_by(|a, b| timestamp(b).cmp(&timestamp(a)));
    items.truncate(limit);
}

fn upsert_by_id<T>(items: &mut Vec<T>, item: T, id: impl Fn(&T) -> &String) {
    let item_id = id(&item).clone();
    if let Some(position) = items.iter().position(|existing| id(existing) == &item_id) {
        items[position] = item;
    } else {
        items.push(item);
    }
}

fn push_log(store: &mut HistoryStore, level: &str, action: &str, details: &str) {
    let timestamp = current_timestamp();
    let duplicate_count = store
        .logs
        .iter()
        .filter(|log| log.id.starts_with(&format!("log-{timestamp}")))
        .count();
    let suffix = if duplicate_count == 0 {
        String::new()
    } else {
        format!("-{duplicate_count}")
    };
    store.logs.push(HistoryLogEntry {
        id: format!("log-{timestamp}{suffix}"),
        timestamp,
        level: level.into(),
        action: action.into(),
        details: details.into(),
    });
    retain_latest(&mut store.logs, LOG_LIMIT, |entry| entry.timestamp);
}

fn comparison_from_benchmarks(items: &[BenchmarkHistoryEntry]) -> Option<HistoryComparison> {
    let current = items.first()?;
    let previous = items.get(1)?;
    Some(build_comparison(
        current.overall_score,
        previous.overall_score,
        "benchmark",
    ))
}

fn comparison_from_diagnostics(items: &[DiagnosticHistoryEntry]) -> Option<HistoryComparison> {
    let current = items.first()?;
    let previous = items.get(1)?;
    Some(build_comparison(
        current.health_score,
        previous.health_score,
        "diagnóstico",
    ))
}

fn build_comparison(current_score: u8, previous_score: u8, label: &str) -> HistoryComparison {
    let delta = current_score as i16 - previous_score as i16;
    let direction = if delta > 0 {
        "up"
    } else if delta < 0 {
        "down"
    } else {
        "stable"
    };
    let message = if delta > 0 {
        format!("Seu score de {label} aumentou {delta} ponto(s) desde a última execução.")
    } else if delta < 0 {
        format!(
            "Seu score de {label} caiu {} ponto(s) desde a última execução.",
            delta.abs()
        )
    } else {
        format!("Seu score de {label} permaneceu estável desde a última execução.")
    };
    HistoryComparison {
        current_score,
        previous_score,
        delta,
        direction: direction.into(),
        message,
    }
}

fn advisor_insights_from_history(
    benchmarks: &[BenchmarkHistoryEntry],
    diagnostics: &[DiagnosticHistoryEntry],
) -> Vec<String> {
    let mut insights = Vec::new();
    if let Some(comparison) = comparison_from_benchmarks(benchmarks) {
        insights.push(comparison.message);
    }
    if let Some(comparison) = comparison_from_diagnostics(diagnostics) {
        insights.push(comparison.message);
    }
    if diagnostics.len() >= 3
        && diagnostics
            .iter()
            .take(3)
            .all(|item| item.health_score >= 80)
    {
        insights.push("Seu sistema permanece estável nas últimas análises.".into());
    }
    if benchmarks.len() < 2 && diagnostics.len() < 2 {
        insights.push(
            "Execute mais de uma análise para o Hermes comparar a evolução localmente.".into(),
        );
    }
    insights
}

fn parse_timestamp(timestamp: &str) -> i64 {
    timestamp
        .parse::<i64>()
        .unwrap_or_else(|_| current_timestamp())
}

fn local_data_dir() -> PathBuf {
    if let Ok(path) = std::env::var("LOCALAPPDATA") {
        return PathBuf::from(path);
    }
    if let Ok(path) = std::env::var("XDG_DATA_HOME") {
        return PathBuf::from(path);
    }
    if let Ok(path) = std::env::var("HOME") {
        return PathBuf::from(path).join(".local").join("share");
    }
    std::env::temp_dir()
}
