use crate::performance::{
    self, PerformanceApplyActionResult, PerformanceApplyRequest, PerformanceApplyResult,
};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};

const MAX_PROFILE_EVENTS: usize = 100;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfilesCatalog {
    pub generated_at: String,
    pub engine_version: String,
    pub read_only: bool,
    pub telemetry: bool,
    pub resident_process: bool,
    pub profiles: Vec<HermesProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HermesProfile {
    pub id: String,
    pub name: String,
    pub summary: String,
    pub risk: ProfileRisk,
    pub status: ProfileStatus,
    pub reversible: bool,
    pub requires_confirmation: bool,
    pub requires_extra_confirmation: bool,
    pub performance_action_ids: Vec<String>,
    pub expected_impact: Vec<String>,
    pub safeguards: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ProfileRisk {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ProfileStatus {
    Ready,
    PreviewOnly,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ProfileApplyRequest {
    pub profile_id: String,
    pub confirmed: bool,
    pub dry_run: Option<bool>,
    pub extreme_confirmed: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileApplyResult {
    pub generated_at: String,
    pub engine_version: String,
    pub profile_id: String,
    pub profile_name: String,
    pub dry_run: bool,
    pub snapshot_id: String,
    pub rollback_available: bool,
    pub applied_actions: Vec<PerformanceApplyActionResult>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProfileEvent {
    id: String,
    timestamp: String,
    profile_id: Option<String>,
    level: ProfileEventLevel,
    message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
enum ProfileEventLevel {
    Info,
    Warning,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct ProfileEventHistory {
    events: Vec<ProfileEvent>,
}

#[tauri::command]
pub fn profiles_list() -> ProfilesCatalog {
    ProfilesCatalog {
        generated_at: now_timestamp(),
        engine_version: "profiles-engine-v1".to_string(),
        read_only: true,
        telemetry: false,
        resident_process: false,
        profiles: profile_definitions(),
    }
}

#[tauri::command]
pub fn profiles_apply(
    app: AppHandle,
    request: Option<ProfileApplyRequest>,
) -> Result<ProfileApplyResult, String> {
    let request = request.unwrap_or_default();
    let profile = profile_definitions()
        .into_iter()
        .find(|profile| profile.id == request.profile_id)
        .ok_or_else(|| format!("Perfil Hermes nao encontrado: {}", request.profile_id))?;
    let dry_run = request.dry_run.unwrap_or(!request.confirmed);

    if !dry_run && !request.confirmed {
        return Err("Confirmacao obrigatoria antes de aplicar um perfil Hermes.".to_string());
    }

    if !dry_run && profile.requires_extra_confirmation && request.extreme_confirmed != Some(true) {
        return Err("Perfil Extremo exige confirmacao extra antes da aplicacao real.".to_string());
    }

    append_profile_event(
        &app,
        ProfileEventLevel::Info,
        Some(profile.id.clone()),
        if dry_run {
            "Dry-run de perfil Hermes iniciado."
        } else {
            "Aplicacao real de perfil Hermes iniciada apos confirmacao."
        },
    )?;

    let performance_result = performance::performance_apply_controlled(
        app.clone(),
        Some(PerformanceApplyRequest {
            confirmed: request.confirmed,
            dry_run: Some(dry_run),
            action_ids: Some(profile.performance_action_ids.clone()),
            reason: Some(format!("Perfil Hermes: {}", profile.name)),
        }),
    )?;

    log_profile_result(&app, &profile, &performance_result)?;

    Ok(ProfileApplyResult {
        generated_at: now_timestamp(),
        engine_version: "profiles-engine-v1".to_string(),
        profile_id: profile.id,
        profile_name: profile.name,
        dry_run: performance_result.dry_run,
        snapshot_id: performance_result.snapshot_id,
        rollback_available: performance_result.rollback_available,
        applied_actions: performance_result.applied_actions,
        message: performance_result.message,
    })
}

fn profile_definitions() -> Vec<HermesProfile> {
    vec![
        profile(
            "seguro",
            "Seguro",
            "Maxima estabilidade com plano equilibrado.",
            ProfileRisk::Low,
            false,
            vec!["set-balanced-power-plan"],
            vec![
                "Mantem o Windows em modo equilibrado.".to_string(),
                "Evita ajustes agressivos.".to_string(),
            ],
        ),
        profile(
            "trabalho",
            "Trabalho",
            "Equilibrio para produtividade diaria.",
            ProfileRisk::Low,
            false,
            vec!["disable-transparency", "set-balanced-power-plan"],
            vec![
                "Reduz custo visual leve.".to_string(),
                "Mantem energia equilibrada.".to_string(),
            ],
        ),
        profile(
            "gamer",
            "Gamer",
            "Prioriza resposta e desempenho sob demanda.",
            ProfileRisk::Medium,
            false,
            vec![
                "disable-transparency",
                "disable-window-animations",
                "disable-visual-shadows",
                "set-high-performance-power-plan",
            ],
            vec![
                "Reduz efeitos visuais nao essenciais.".to_string(),
                "Ativa Alto Desempenho quando disponivel.".to_string(),
            ],
        ),
        profile(
            "economia",
            "Economia",
            "Reduz consumo e animacoes nao essenciais.",
            ProfileRisk::Low,
            false,
            vec![
                "disable-transparency",
                "disable-window-animations",
                "set-power-saver-power-plan",
            ],
            vec![
                "Reduz efeitos visuais leves.".to_string(),
                "Ativa Economia de Energia quando disponivel.".to_string(),
            ],
        ),
        profile(
            "extremo",
            "Extremo",
            "Desempenho maximo com confirmacao extra.",
            ProfileRisk::High,
            true,
            vec![
                "disable-transparency",
                "disable-window-animations",
                "disable-visual-shadows",
                "set-high-performance-power-plan",
            ],
            vec![
                "Aplica todos os ajustes disponiveis desta fase.".to_string(),
                "Exige confirmacao extra antes da aplicacao real.".to_string(),
            ],
        ),
    ]
}

fn profile(
    id: &str,
    name: &str,
    summary: &str,
    risk: ProfileRisk,
    requires_extra_confirmation: bool,
    performance_action_ids: Vec<&str>,
    expected_impact: Vec<String>,
) -> HermesProfile {
    HermesProfile {
        id: id.to_string(),
        name: name.to_string(),
        summary: summary.to_string(),
        risk,
        status: ProfileStatus::Ready,
        reversible: true,
        requires_confirmation: true,
        requires_extra_confirmation,
        performance_action_ids: performance_action_ids
            .into_iter()
            .map(ToString::to_string)
            .collect(),
        expected_impact,
        safeguards: vec![
            "Snapshot obrigatorio antes de aplicar.".to_string(),
            "Log local obrigatorio.".to_string(),
            "Rollback pelo Restore Engine.".to_string(),
            "Sem telemetria ou processo residente.".to_string(),
        ],
    }
}

fn log_profile_result(
    app: &AppHandle,
    profile: &HermesProfile,
    result: &PerformanceApplyResult,
) -> Result<(), String> {
    let failed = result.applied_actions.iter().any(|action| {
        matches!(
            action.status,
            performance::PerformanceApplyActionStatus::Failed
        )
    });
    let level = if failed {
        ProfileEventLevel::Error
    } else {
        ProfileEventLevel::Info
    };
    append_profile_event(
        app,
        level,
        Some(profile.id.clone()),
        &format!(
            "Perfil {} concluido. Snapshot: {}. Mensagem: {}",
            profile.name, result.snapshot_id, result.message
        ),
    )
}

fn append_profile_event(
    app: &AppHandle,
    level: ProfileEventLevel,
    profile_id: Option<String>,
    message: &str,
) -> Result<(), String> {
    let path = profile_events_path(app)?;
    let mut history = read_profile_event_history(&path);
    history.events.insert(
        0,
        ProfileEvent {
            id: format!("profile-event-{}-{}", now_timestamp(), now_nanos()),
            timestamp: now_timestamp(),
            profile_id,
            level,
            message: message.to_string(),
        },
    );
    history.events.truncate(MAX_PROFILE_EVENTS);
    write_profile_event_history(&path, &history)
}

fn profile_events_path(app: &AppHandle) -> Result<PathBuf, String> {
    let mut dir = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("Nao foi possivel localizar AppData: {err}"))?;
    dir.push("history");
    fs::create_dir_all(&dir)
        .map_err(|err| format!("Nao foi possivel criar historico de perfis: {err}"))?;
    dir.push("profile_events.json");
    Ok(dir)
}

fn read_profile_event_history(path: &PathBuf) -> ProfileEventHistory {
    let Ok(contents) = fs::read_to_string(path) else {
        return ProfileEventHistory::default();
    };
    serde_json::from_str(&contents).unwrap_or_default()
}

fn write_profile_event_history(
    path: &PathBuf,
    history: &ProfileEventHistory,
) -> Result<(), String> {
    let contents = serde_json::to_string_pretty(history)
        .map_err(|err| format!("Nao foi possivel serializar logs de perfis: {err}"))?;
    fs::write(path, contents)
        .map_err(|err| format!("Nao foi possivel gravar logs de perfis: {err}"))
}

fn now_timestamp() -> String {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default();
    seconds.to_string()
}

fn now_nanos() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default()
}
