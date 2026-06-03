use serde::{Deserialize, Serialize};

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
    RestoreSnapshot {
        id: "mock-snapshot".into(),
        date: "03/06/2026 21:15".into(),
        profile_applied: request.reason,
        tweaks_applied: vec!["simulated-tweak".into()],
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
