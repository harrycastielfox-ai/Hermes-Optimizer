use serde::{Deserialize, Serialize};

use super::history;

#[derive(Deserialize)]
pub struct SnapshotRequest {
    reason: String,
}

#[derive(Deserialize)]
pub struct RestoreRequest {
    snapshot_id: String,
}

#[derive(Serialize)]
pub struct RestoreSnapshot {
    id: String,
    date: String,
    profile_applied: String,
    tweaks_applied: Vec<String>,
    status: String,
    reversible: bool,
}

#[tauri::command]
pub fn create_restore_snapshot(request: SnapshotRequest) -> RestoreSnapshot {
    let timestamp = history::current_timestamp();
    let id = format!("snapshot-{timestamp}");
    let hardware_summary =
        "Snapshot lógico local leve; sem cópia de arquivos pessoais e sem envio externo.";
    let _ = history::save_snapshot_history(
        &id,
        &request.reason,
        "Snapshot local criado para histórico leve e reversão futura.",
        hardware_summary,
    );

    RestoreSnapshot {
        id,
        date: timestamp.to_string(),
        profile_applied: request.reason,
        tweaks_applied: vec!["snapshot-logico".into()],
        status: "simulated".into(),
        reversible: true,
    }
}

#[tauri::command]
pub fn simulate_restore_snapshot(request: RestoreRequest) -> RestoreSnapshot {
    RestoreSnapshot {
        id: request.snapshot_id,
        date: "03/06/2026 21:20".into(),
        profile_applied: "Restauração simulada".into(),
        tweaks_applied: vec![],
        status: "restored".into(),
        reversible: true,
    }
}
