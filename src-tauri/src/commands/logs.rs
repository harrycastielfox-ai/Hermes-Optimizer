use serde::Serialize;

use super::history;

#[derive(Serialize)]
pub struct OptimizationLog {
    id: String,
    date: String,
    action: String,
    module: String,
    result: String,
    risk: String,
    details: String,
}

#[tauri::command]
pub fn list_logs() -> Vec<OptimizationLog> {
    history::list_history_logs()
        .unwrap_or_default()
        .into_iter()
        .map(|entry| OptimizationLog {
            id: entry.id,
            date: entry.timestamp.to_string(),
            module: module_from_action(&entry.action),
            action: entry.action,
            result: "success".into(),
            risk: "low".into(),
            details: entry.details,
        })
        .collect()
}

fn module_from_action(action: &str) -> String {
    if action.contains("benchmark") {
        "Benchmark".into()
    } else if action.contains("diagnóstico") {
        "Diagnóstico".into()
    } else if action.contains("snapshot") {
        "Snapshots".into()
    } else {
        "Histórico".into()
    }
}
