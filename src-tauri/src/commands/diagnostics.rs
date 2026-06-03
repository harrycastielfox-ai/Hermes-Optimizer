use serde::Serialize;

#[derive(Serialize)]
pub struct SystemOverview {
    status: String,
    cpu_usage: u8,
    ram_usage: u8,
    disk_usage: u8,
    free_space_gb: u16,
    temp_files_estimate_mb: u32,
    performance_mode: String,
    last_diagnostic: String,
}

#[derive(Serialize)]
pub struct DiagnosticResult {
    id: String,
    title: String,
    status: String,
    value: String,
    description: String,
}

#[tauri::command]
pub fn get_system_overview() -> SystemOverview {
    SystemOverview {
        status: "good".into(),
        cpu_usage: 28,
        ram_usage: 61,
        disk_usage: 47,
        free_space_gb: 238,
        temp_files_estimate_mb: 1840,
        performance_mode: "Hermes Safe".into(),
        last_diagnostic: "03/06/2026 21:10".into(),
    }
}

#[tauri::command]
pub fn run_diagnostics() -> Vec<DiagnosticResult> {
    vec![
        DiagnosticResult {
            id: "cpu".into(),
            title: "CPU".into(),
            status: "ok".into(),
            value: "28% em uso".into(),
            description: "Diagnóstico mockado seguro.".into(),
        },
        DiagnosticResult {
            id: "ram".into(),
            title: "Memória RAM".into(),
            status: "attention".into(),
            value: "61% em uso".into(),
            description: "Preparado para coleta real futura.".into(),
        },
        DiagnosticResult {
            id: "windows".into(),
            title: "Integridade do Windows".into(),
            status: "ok".into(),
            value: "Sem alertas".into(),
            description: "Nenhuma alteração de segurança é executada.".into(),
        },
    ]
}
