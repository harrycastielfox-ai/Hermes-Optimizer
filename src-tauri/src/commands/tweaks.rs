use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct ApplyRequest {
    id: String,
}

#[derive(Serialize)]
pub struct HermesTweak {
    id: String,
    name: String,
    description: String,
    category: String,
    risk: String,
    mode: String,
    requires_admin: bool,
    reversible: bool,
    enabled: bool,
    recommended: bool,
    benefit: String,
    reversal_plan: String,
    warning: Option<String>,
}

#[derive(Serialize)]
pub struct PerformanceProfile {
    id: String,
    name: String,
    objective: String,
    tweak_count: u8,
    risk: String,
    mode: String,
    description: String,
    included_tweaks: Vec<String>,
}

#[derive(Serialize)]
pub struct SimulationResult {
    success: bool,
    message: String,
    log_id: String,
}

#[tauri::command]
pub fn list_available_tweaks() -> Vec<HermesTweak> {
    vec![
        HermesTweak {
            id: "safe-animations".into(),
            name: "Reduzir animações visuais".into(),
            description: "Mock para catálogo inicial.".into(),
            category: "Interface".into(),
            risk: "low".into(),
            mode: "safe".into(),
            requires_admin: false,
            reversible: true,
            enabled: false,
            recommended: true,
            benefit: "Interface mais responsiva.".into(),
            reversal_plan: "Restaurar a configuração anterior documentada no snapshot futuro."
                .into(),
            warning: None,
        },
        HermesTweak {
            id: "ext-services".into(),
            name: "Reduzir serviços não essenciais".into(),
            description: "Reservado para futuro com aviso forte.".into(),
            category: "Serviços".into(),
            risk: "high".into(),
            mode: "extreme".into(),
            requires_admin: true,
            reversible: true,
            enabled: false,
            recommended: false,
            benefit: "Pode reduzir carga em cenários específicos.".into(),
            reversal_plan: "Reativar serviços alterados conforme plano de reversão obrigatório."
                .into(),
            warning: Some("Não executado nesta base inicial.".into()),
        },
    ]
}

#[tauri::command]
pub fn list_performance_profiles() -> Vec<PerformanceProfile> {
    vec![
        PerformanceProfile {
            id: "safe".into(),
            name: "Hermes Safe".into(),
            objective: "Segurança e estabilidade".into(),
            tweak_count: 7,
            risk: "low".into(),
            mode: "safe".into(),
            description: "Perfil conservador e transparente para uso diário.".into(),
            included_tweaks: vec!["Reduzir animações".into(), "Revisar inicialização".into()],
        },
        PerformanceProfile {
            id: "gamer".into(),
            name: "Hermes Gamer".into(),
            objective: "Jogos, latência e redução de processos".into(),
            tweak_count: 7,
            risk: "medium".into(),
            mode: "gamer".into(),
            description: "Sessão temporária e reversível para jogos.".into(),
            included_tweaks: vec!["Plano alto desempenho".into(), "Reduzir overlays".into()],
        },
    ]
}

#[tauri::command]
pub fn simulate_apply_tweak(request: ApplyRequest) -> SimulationResult {
    SimulationResult {
        success: true,
        message: format!(
            "Tweak '{}' simulado. Nenhuma alteração real foi aplicada.",
            request.id
        ),
        log_id: "mock-log-tweak".into(),
    }
}

#[tauri::command]
pub fn simulate_apply_profile(request: ApplyRequest) -> SimulationResult {
    SimulationResult {
        success: true,
        message: format!("Perfil '{}' simulado com snapshot lógico.", request.id),
        log_id: "mock-log-profile".into(),
    }
}
