use serde::Serialize;

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
    vec![OptimizationLog {
        id: "log-1".into(),
        date: "03/06/2026 21:10".into(),
        action: "Diagnóstico executado".into(),
        module: "Diagnóstico".into(),
        result: "success".into(),
        risk: "low".into(),
        details: "Coleta simulada concluída sem ações no sistema.".into(),
    }]
}
