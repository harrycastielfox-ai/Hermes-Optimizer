use crate::{
    restore::{
        self, RestoreCreateSnapshotRequest, RestorePlannedAction, RestorePreviousState,
        RestorePreviousStateCategory, RestoreRiskLevel, RestoreRollbackAction,
        RestoreRollbackActionStatus, RestoreRollbackActionType,
    },
    safe_mode,
};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::PathBuf,
    process::{Command, Stdio},
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};

const ADVANCED_COMMAND_TIMEOUT_SECONDS: u64 = 15;
const MAX_ADVANCED_EVENTS: usize = 100;
const MISSING_REGISTRY_VALUE: &str = "__HERMES_MISSING__";
const BALANCED_POWER_PLAN_GUID: &str = "381b4222-f694-41f0-9685-ff5bb260df2e";
const HIGH_PERFORMANCE_POWER_PLAN_GUID: &str = "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c";
const POWER_SAVER_POWER_PLAN_GUID: &str = "a1841308-3541-4fab-bc81-f71556f20b4a";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdvancedCatalog {
    pub generated_at: String,
    pub engine_version: String,
    pub read_only: bool,
    pub will_modify_system: bool,
    pub telemetry: bool,
    pub resident_process: bool,
    pub actions: Vec<AdvancedAction>,
    pub blocked_actions: Vec<AdvancedBlockedAction>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdvancedAction {
    pub id: String,
    pub title: String,
    pub description: String,
    pub method: AdvancedMethod,
    pub risk: AdvancedRisk,
    pub requires_admin: bool,
    pub requires_extreme: bool,
    pub reversible: bool,
    pub persistent: bool,
    pub requires_restart: bool,
    pub current_value: String,
    pub planned_change: String,
    pub command_preview: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdvancedBlockedAction {
    pub id: String,
    pub title: String,
    pub reason: String,
    pub method: AdvancedMethod,
    pub risk: AdvancedRisk,
    pub requires_admin: bool,
    pub requires_extreme: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AdvancedMethod {
    Registry,
    Cmd,
    PowerShell,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AdvancedRisk {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AdvancedApplyRequest {
    pub confirmed: bool,
    pub dry_run: Option<bool>,
    pub action_ids: Option<Vec<String>>,
    pub extreme_mode: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdvancedApplyResult {
    pub generated_at: String,
    pub engine_version: String,
    pub dry_run: bool,
    pub snapshot_id: String,
    pub rollback_available: bool,
    pub applied_actions: Vec<AdvancedActionResult>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdvancedActionResult {
    pub id: String,
    pub title: String,
    pub status: AdvancedActionStatus,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AdvancedActionStatus {
    DryRun,
    Applied,
    Skipped,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdvancedEvent {
    id: String,
    timestamp: String,
    snapshot_id: Option<String>,
    level: AdvancedEventLevel,
    message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
enum AdvancedEventLevel {
    Info,
    Warning,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct AdvancedEventHistory {
    events: Vec<AdvancedEvent>,
}

#[derive(Debug, Clone)]
struct AdvancedPlan {
    action: AdvancedAction,
    operations: Vec<AdvancedOperation>,
}

#[derive(Debug, Clone)]
enum AdvancedOperation {
    RegistryDword {
        path: String,
        name: String,
        value: i64,
        previous_value: Option<String>,
        rollback_type: RestoreRollbackActionType,
    },
    RegistryString {
        path: String,
        name: String,
        value: String,
        previous_value: Option<String>,
        rollback_type: RestoreRollbackActionType,
    },
    PowerPlan {
        guid: String,
        previous_guid: Option<String>,
        previous_name: Option<String>,
    },
    Cmd {
        program: String,
        args: Vec<String>,
        transient: bool,
    },
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawAdvancedState {
    auto_game_mode_enabled: Option<i64>,
    allow_auto_game_mode: Option<i64>,
    game_dvr_enabled: Option<i64>,
    app_capture_enabled: Option<i64>,
    startup_delay_in_msec: Option<i64>,
    enable_transparency: Option<i64>,
    min_animate: Option<String>,
    taskbar_animations: Option<i64>,
    listview_alpha_select: Option<i64>,
    listview_shadow: Option<i64>,
    visual_fx_setting: Option<i64>,
    power_plan_guid: Option<String>,
    power_plan_name: Option<String>,
}

#[tauri::command]
pub async fn advanced_engine_catalog() -> AdvancedCatalog {
    tauri::async_runtime::spawn_blocking(collect_advanced_catalog)
        .await
        .unwrap_or_else(|err| {
            build_catalog(
                fallback_state(),
                vec![format!(
                    "Falha ao ler catalogo avancado em segundo plano: {err}"
                )],
            )
        })
}

#[tauri::command]
pub async fn advanced_engine_apply(
    app: AppHandle,
    request: Option<AdvancedApplyRequest>,
) -> Result<AdvancedApplyResult, String> {
    tauri::async_runtime::spawn_blocking(move || advanced_engine_apply_blocking(app, request, true))
        .await
        .map_err(|err| format!("Falha ao aplicar Advanced Engine em segundo plano: {err}"))?
}

#[tauri::command]
pub async fn advanced_engine_apply_optimize_now(
    app: AppHandle,
    request: Option<AdvancedApplyRequest>,
) -> Result<AdvancedApplyResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        advanced_engine_apply_blocking(app, request, false)
    })
    .await
    .map_err(|err| format!("Falha ao otimizar emulador no Otimizar Agora: {err}"))?
}

#[tauri::command]
pub async fn advanced_set_graphics_high_performance_optimize_now(
    app: AppHandle,
    executable_path: String,
    dry_run: Option<bool>,
) -> Result<AdvancedApplyResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        graphics_preference_apply_blocking(
            app,
            executable_path,
            safe_mode::force_dry_run(dry_run.unwrap_or(false)),
        )
    })
    .await
    .map_err(|err| format!("Falha ao priorizar Elementos Graficos: {err}"))?
}

pub(crate) fn advanced_engine_apply_blocking(
    app: AppHandle,
    request: Option<AdvancedApplyRequest>,
    enforce_safe_test_mode: bool,
) -> Result<AdvancedApplyResult, String> {
    let request = request.unwrap_or_default();
    let requested_dry_run = request.dry_run.unwrap_or(!request.confirmed);
    let dry_run = if enforce_safe_test_mode {
        safe_mode::force_dry_run(requested_dry_run)
    } else {
        requested_dry_run
    };
    if !dry_run && !request.confirmed {
        return Err("Confirmacao obrigatoria antes de aplicar comandos avancados.".to_string());
    }

    let state = collect_windows_state()?;
    let selected_ids = selected_action_ids(request.action_ids.as_deref());
    let plans = build_plans(&state, &selected_ids);
    if plans.is_empty() {
        return Err("Nenhuma acao avancada segura foi selecionada.".to_string());
    }
    validate_plans_for_apply(&plans, request.extreme_mode.unwrap_or(false))?;

    execute_advanced_plans(app, plans, dry_run)
}

fn graphics_preference_apply_blocking(
    app: AppHandle,
    executable_path: String,
    dry_run: bool,
) -> Result<AdvancedApplyResult, String> {
    if !cfg!(target_os = "windows") {
        return Err("Elementos Graficos exige Windows.".to_string());
    }

    let executable_path = normalize_graphics_preference_path(&executable_path)?;
    let registry_path = "HKCU:\\Software\\Microsoft\\DirectX\\UserGpuPreferences";
    let previous_value = read_registry_string(registry_path, &executable_path)?;
    let plans = vec![graphics_high_performance_plan(
        &executable_path,
        previous_value,
    )];
    validate_plans_for_apply(&plans, false)?;
    execute_advanced_plans(app, plans, dry_run)
}

fn execute_advanced_plans(
    app: AppHandle,
    plans: Vec<AdvancedPlan>,
    dry_run: bool,
) -> Result<AdvancedApplyResult, String> {
    let snapshot = restore::restore_create_snapshot(
        app.clone(),
        Some(build_snapshot_request(&plans, dry_run)),
    )?;
    append_advanced_event(
        &app,
        AdvancedEventLevel::Info,
        Some(snapshot.id.clone()),
        if dry_run {
            "DRY-RUN | Advanced Engine criou snapshot obrigatorio em dry-run."
        } else {
            "Advanced Engine criou snapshot obrigatorio antes da aplicacao."
        },
    )?;

    let applied_actions = if dry_run {
        plans
            .iter()
            .map(|plan| AdvancedActionResult {
                id: plan.action.id.clone(),
                title: plan.action.title.clone(),
                status: AdvancedActionStatus::DryRun,
                message: format!(
                    "{} — nenhum comando CMD/PowerShell/Registro foi executado.",
                    safe_mode::mode_prefix(dry_run)
                ),
            })
            .collect::<Vec<_>>()
    } else {
        apply_plans(&app, &snapshot.id, &plans)?
    };

    let failed = applied_actions
        .iter()
        .any(|result| matches!(result.status, AdvancedActionStatus::Failed));
    let message = if failed {
        append_advanced_event(
            &app,
            AdvancedEventLevel::Warning,
            Some(snapshot.id.clone()),
            "Falha detectada. Rollback automatico acionado.",
        )?;
        match restore::restore_apply_snapshot(app.clone(), snapshot.id.clone(), Some(false)) {
            Ok(result) if result.applied => {
                "Falha durante comandos avancados. Rollback automatico concluido.".to_string()
            }
            Ok(result) => format!(
                "Falha durante comandos avancados. Rollback parcial: {}",
                result.message
            ),
            Err(error) => format!("Falha durante comandos avancados e rollback falhou: {error}"),
        }
    } else if dry_run {
        format!(
            "{} — comandos avancados validados com snapshot e rollback preparados. {}",
            safe_mode::mode_prefix(dry_run),
            if safe_mode::is_enabled() {
                safe_mode::notice()
            } else {
                ""
            }
        )
    } else {
        "Comandos avancados aplicados com snapshot, log e rollback disponiveis.".to_string()
    };

    append_advanced_event(
        &app,
        if failed {
            AdvancedEventLevel::Warning
        } else {
            AdvancedEventLevel::Info
        },
        Some(snapshot.id.clone()),
        &message,
    )?;

    Ok(AdvancedApplyResult {
        generated_at: now_timestamp(),
        engine_version: "advanced-engine-v1".to_string(),
        dry_run,
        snapshot_id: snapshot.id,
        rollback_available: true,
        applied_actions,
        message,
    })
}

pub fn collect_advanced_catalog() -> AdvancedCatalog {
    match collect_windows_state() {
        Ok(state) => build_catalog(state, Vec::new()),
        Err(error) => build_catalog(
            fallback_state(),
            vec![
                error,
                "Fallback indisponivel usado porque a leitura real nao respondeu. Nenhum estado demonstrativo foi retornado.".to_string(),
            ],
        ),
    }
}

fn collect_windows_state() -> Result<RawAdvancedState, String> {
    if !cfg!(target_os = "windows") {
        return Err("Advanced Engine usa PowerShell/Registro locais do Windows.".to_string());
    }

    let stdout = run_powershell(
        POWERSHELL_ADVANCED_STATE_SCRIPT,
        ADVANCED_COMMAND_TIMEOUT_SECONDS,
    )?;
    serde_json::from_str::<RawAdvancedState>(&stdout)
        .map_err(|err| format!("Nao foi possivel interpretar estado avancado: {err}"))
}

fn build_catalog(state: RawAdvancedState, warnings: Vec<String>) -> AdvancedCatalog {
    let plans = build_plans(&state, &default_action_ids());
    AdvancedCatalog {
        generated_at: now_timestamp(),
        engine_version: "advanced-engine-v1".to_string(),
        read_only: true,
        will_modify_system: false,
        telemetry: false,
        resident_process: false,
        actions: plans.into_iter().map(|plan| plan.action).collect(),
        blocked_actions: blocked_actions(),
        warnings,
    }
}

fn build_plans(state: &RawAdvancedState, selected_ids: &[String]) -> Vec<AdvancedPlan> {
    selected_ids
        .iter()
        .filter_map(|id| match id.as_str() {
            "enable-game-mode" => Some(enable_game_mode_plan(state)),
            "disable-game-mode" => Some(disable_game_mode_plan(state)),
            "disable-game-dvr" => Some(disable_game_dvr_plan(state)),
            "enable-game-dvr" => Some(enable_game_dvr_plan(state)),
            "disable-startup-delay" => Some(disable_startup_delay_plan(state)),
            "flush-dns-cache" => Some(flush_dns_cache_plan()),
            "list-power-plans" => Some(list_power_plans_plan(state)),
            "set-high-performance-power-plan" => Some(set_power_plan_plan(
                state,
                "set-high-performance-power-plan",
                "Ativar plano Alto desempenho",
                "Troca o plano de energia para Alto desempenho usando powercfg, com rollback para o plano anterior.",
                HIGH_PERFORMANCE_POWER_PLAN_GUID,
                AdvancedRisk::Medium,
            )),
            "set-balanced-power-plan" => Some(set_power_plan_plan(
                state,
                "set-balanced-power-plan",
                "Ativar plano Equilibrado",
                "Troca o plano de energia para Equilibrado usando powercfg, com rollback para o plano anterior.",
                BALANCED_POWER_PLAN_GUID,
                AdvancedRisk::Low,
            )),
            "set-power-saver-power-plan" => Some(set_power_plan_plan(
                state,
                "set-power-saver-power-plan",
                "Ativar plano Economia de energia",
                "Troca o plano de energia para Economia de energia usando powercfg, com rollback para o plano anterior.",
                POWER_SAVER_POWER_PLAN_GUID,
                AdvancedRisk::Low,
            )),
            "disable-transparency" => Some(disable_transparency_plan(state)),
            "disable-window-animations" => Some(disable_window_animations_plan(state)),
            "disable-visual-shadows" => Some(disable_visual_shadows_plan(state)),
            "set-visual-effects-custom" => Some(set_visual_effects_custom_plan(state)),
            "open-performance-options" => Some(open_performance_options_plan()),
            _ => None,
        })
        .collect()
}

fn enable_game_mode_plan(state: &RawAdvancedState) -> AdvancedPlan {
    AdvancedPlan {
        action: action(
            "enable-game-mode",
            "Ativar Game Mode",
            "Ativa as chaves nativas do Windows Game Mode no usuario atual.",
            AdvancedMethod::Registry,
            AdvancedRisk::Low,
            false,
            false,
            true,
            true,
            false,
            format!(
                "AutoGameModeEnabled={}, AllowAutoGameMode={}",
                display_optional(state.auto_game_mode_enabled),
                display_optional(state.allow_auto_game_mode)
            ),
            "Definir ambos como 1",
            "PowerShell New-ItemProperty em HKCU GameBar",
        ),
        operations: vec![
            registry_dword(
                "HKCU:\\Software\\Microsoft\\GameBar",
                "AutoGameModeEnabled",
                1,
                state.auto_game_mode_enabled,
                RestoreRollbackActionType::RestoreGameMode,
            ),
            registry_dword(
                "HKCU:\\Software\\Microsoft\\GameBar",
                "AllowAutoGameMode",
                1,
                state.allow_auto_game_mode,
                RestoreRollbackActionType::RestoreGameMode,
            ),
        ],
    }
}

fn disable_game_mode_plan(state: &RawAdvancedState) -> AdvancedPlan {
    AdvancedPlan {
        action: action(
            "disable-game-mode",
            "Desativar Game Mode",
            "Desativa as chaves nativas do Windows Game Mode no usuario atual.",
            AdvancedMethod::Registry,
            AdvancedRisk::Low,
            false,
            false,
            true,
            true,
            false,
            format!(
                "AutoGameModeEnabled={}, AllowAutoGameMode={}",
                display_optional(state.auto_game_mode_enabled),
                display_optional(state.allow_auto_game_mode)
            ),
            "Definir ambos como 0",
            "PowerShell New-ItemProperty em HKCU GameBar",
        ),
        operations: vec![
            registry_dword(
                "HKCU:\\Software\\Microsoft\\GameBar",
                "AutoGameModeEnabled",
                0,
                state.auto_game_mode_enabled,
                RestoreRollbackActionType::RestoreGameMode,
            ),
            registry_dword(
                "HKCU:\\Software\\Microsoft\\GameBar",
                "AllowAutoGameMode",
                0,
                state.allow_auto_game_mode,
                RestoreRollbackActionType::RestoreGameMode,
            ),
        ],
    }
}

fn disable_game_dvr_plan(state: &RawAdvancedState) -> AdvancedPlan {
    AdvancedPlan {
        action: action(
            "disable-game-dvr",
            "Desativar captura Game DVR",
            "Desativa captura em segundo plano do Game DVR para reduzir overhead durante jogos.",
            AdvancedMethod::Registry,
            AdvancedRisk::Low,
            false,
            false,
            true,
            true,
            false,
            format!(
                "GameDVR_Enabled={}, AppCaptureEnabled={}",
                display_optional(state.game_dvr_enabled),
                display_optional(state.app_capture_enabled)
            ),
            "Definir ambos como 0",
            "PowerShell New-ItemProperty em HKCU GameConfigStore/GameDVR",
        ),
        operations: vec![
            registry_dword(
                "HKCU:\\System\\GameConfigStore",
                "GameDVR_Enabled",
                0,
                state.game_dvr_enabled,
                RestoreRollbackActionType::RestoreGameMode,
            ),
            registry_dword(
                "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR",
                "AppCaptureEnabled",
                0,
                state.app_capture_enabled,
                RestoreRollbackActionType::RestoreGameMode,
            ),
        ],
    }
}

fn enable_game_dvr_plan(state: &RawAdvancedState) -> AdvancedPlan {
    AdvancedPlan {
        action: action(
            "enable-game-dvr",
            "Ativar captura Game DVR",
            "Restaura a captura nativa do Game DVR no usuario atual.",
            AdvancedMethod::Registry,
            AdvancedRisk::Low,
            false,
            false,
            true,
            true,
            false,
            format!(
                "GameDVR_Enabled={}, AppCaptureEnabled={}",
                display_optional(state.game_dvr_enabled),
                display_optional(state.app_capture_enabled)
            ),
            "Definir ambos como 1",
            "PowerShell New-ItemProperty em HKCU GameConfigStore/GameDVR",
        ),
        operations: vec![
            registry_dword(
                "HKCU:\\System\\GameConfigStore",
                "GameDVR_Enabled",
                1,
                state.game_dvr_enabled,
                RestoreRollbackActionType::RestoreGameMode,
            ),
            registry_dword(
                "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR",
                "AppCaptureEnabled",
                1,
                state.app_capture_enabled,
                RestoreRollbackActionType::RestoreGameMode,
            ),
        ],
    }
}

fn disable_startup_delay_plan(state: &RawAdvancedState) -> AdvancedPlan {
    AdvancedPlan {
        action: action(
            "disable-startup-delay",
            "Reduzir atraso de inicializacao",
            "Define StartupDelayInMSec como 0 para reduzir atraso de apps no logon.",
            AdvancedMethod::Registry,
            AdvancedRisk::Medium,
            false,
            false,
            true,
            true,
            false,
            display_optional(state.startup_delay_in_msec),
            "Definir StartupDelayInMSec como 0",
            "PowerShell New-ItemProperty em HKCU Explorer\\Serialize",
        ),
        operations: vec![registry_dword(
            "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize",
            "StartupDelayInMSec",
            0,
            state.startup_delay_in_msec,
            RestoreRollbackActionType::RestoreRegistryValue,
        )],
    }
}

fn flush_dns_cache_plan() -> AdvancedPlan {
    AdvancedPlan {
        action: action(
            "flush-dns-cache",
            "Limpar cache DNS",
            "Executa ipconfig /flushdns para limpar cache DNS local. Acao transiente, sem ajuste persistente.",
            AdvancedMethod::Cmd,
            AdvancedRisk::Low,
            false,
            false,
            true,
            false,
            false,
            "Cache DNS atual".to_string(),
            "Executar ipconfig /flushdns",
            "cmd: ipconfig /flushdns",
        ),
        operations: vec![AdvancedOperation::Cmd {
            program: "ipconfig".to_string(),
            args: vec!["/flushdns".to_string()],
            transient: true,
        }],
    }
}

fn list_power_plans_plan(state: &RawAdvancedState) -> AdvancedPlan {
    AdvancedPlan {
        action: action(
            "list-power-plans",
            "Listar planos de energia",
            "Executa powercfg /L para registrar localmente os planos de energia disponiveis. Nao altera o sistema.",
            AdvancedMethod::Cmd,
            AdvancedRisk::Low,
            false,
            false,
            true,
            false,
            false,
            current_power_plan(state),
            "Executar leitura powercfg /L",
            "cmd: powercfg /L",
        ),
        operations: vec![AdvancedOperation::Cmd {
            program: "powercfg".to_string(),
            args: vec!["/L".to_string()],
            transient: true,
        }],
    }
}

fn set_power_plan_plan(
    state: &RawAdvancedState,
    id: &str,
    title: &str,
    description: &str,
    guid: &str,
    risk: AdvancedRisk,
) -> AdvancedPlan {
    AdvancedPlan {
        action: action(
            id,
            title,
            description,
            AdvancedMethod::Cmd,
            risk,
            false,
            false,
            state.power_plan_guid.is_some(),
            true,
            false,
            current_power_plan(state),
            "powercfg /S com rollback para plano anterior",
            &format!("cmd: powercfg /S {guid}"),
        ),
        operations: vec![AdvancedOperation::PowerPlan {
            guid: guid.to_string(),
            previous_guid: state.power_plan_guid.clone(),
            previous_name: state.power_plan_name.clone(),
        }],
    }
}

fn graphics_high_performance_plan(
    executable_path: &str,
    previous_value: Option<String>,
) -> AdvancedPlan {
    AdvancedPlan {
        action: action(
            "set-fate-trigger-graphics-high-performance",
            "Priorizar GPU do Fate Trigger",
            "Define o Fate Trigger em Elementos Graficos do Windows como Alto desempenho no usuario atual.",
            AdvancedMethod::Registry,
            AdvancedRisk::Medium,
            false,
            false,
            true,
            true,
            false,
            display_optional_string(previous_value.as_deref()),
            "Definir GpuPreference=2 para o executavel",
            "PowerShell New-ItemProperty em HKCU DirectX\\UserGpuPreferences",
        ),
        operations: vec![registry_string(
            "HKCU:\\Software\\Microsoft\\DirectX\\UserGpuPreferences",
            executable_path,
            "GpuPreference=2;",
            previous_value,
            RestoreRollbackActionType::RestoreRegistryValue,
        )],
    }
}

fn disable_transparency_plan(state: &RawAdvancedState) -> AdvancedPlan {
    AdvancedPlan {
        action: action(
            "disable-transparency",
            "Desativar transparencias",
            "Desativa transparencia visual do Windows para reduzir custo grafico leve.",
            AdvancedMethod::Registry,
            AdvancedRisk::Low,
            false,
            false,
            true,
            true,
            false,
            display_optional(state.enable_transparency),
            "Definir EnableTransparency como 0",
            "PowerShell New-ItemProperty em HKCU Themes\\Personalize",
        ),
        operations: vec![registry_dword(
            "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
            "EnableTransparency",
            0,
            state.enable_transparency,
            RestoreRollbackActionType::RestoreVisualEffects,
        )],
    }
}

fn disable_window_animations_plan(state: &RawAdvancedState) -> AdvancedPlan {
    AdvancedPlan {
        action: action(
            "disable-window-animations",
            "Reduzir animacoes visuais",
            "Desativa animacoes de janela, barra de tarefas e selecao suave do Explorer.",
            AdvancedMethod::Registry,
            AdvancedRisk::Low,
            false,
            false,
            true,
            true,
            false,
            format!(
                "MinAnimate={}, TaskbarAnimations={}, ListviewAlphaSelect={}",
                display_optional_string(state.min_animate.as_deref()),
                display_optional(state.taskbar_animations),
                display_optional(state.listview_alpha_select)
            ),
            "Definir animacoes como 0",
            "PowerShell New-ItemProperty em HKCU Desktop/Explorer",
        ),
        operations: vec![
            registry_string(
                "HKCU:\\Control Panel\\Desktop\\WindowMetrics",
                "MinAnimate",
                "0",
                state.min_animate.clone(),
                RestoreRollbackActionType::RestoreVisualEffects,
            ),
            registry_dword(
                "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
                "TaskbarAnimations",
                0,
                state.taskbar_animations,
                RestoreRollbackActionType::RestoreVisualEffects,
            ),
            registry_dword(
                "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
                "ListviewAlphaSelect",
                0,
                state.listview_alpha_select,
                RestoreRollbackActionType::RestoreVisualEffects,
            ),
        ],
    }
}

fn disable_visual_shadows_plan(state: &RawAdvancedState) -> AdvancedPlan {
    AdvancedPlan {
        action: action(
            "disable-visual-shadows",
            "Reduzir sombras do Explorer",
            "Desativa sombras de lista do Explorer mantendo rollback pelo snapshot.",
            AdvancedMethod::Registry,
            AdvancedRisk::Low,
            false,
            false,
            true,
            true,
            false,
            display_optional(state.listview_shadow),
            "Definir ListviewShadow como 0",
            "PowerShell New-ItemProperty em HKCU Explorer\\Advanced",
        ),
        operations: vec![registry_dword(
            "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
            "ListviewShadow",
            0,
            state.listview_shadow,
            RestoreRollbackActionType::RestoreVisualEffects,
        )],
    }
}

fn set_visual_effects_custom_plan(state: &RawAdvancedState) -> AdvancedPlan {
    AdvancedPlan {
        action: action(
            "set-visual-effects-custom",
            "Marcar efeitos visuais como personalizados",
            "Define VisualFXSetting como personalizado para manter coerencia com ajustes visuais especificos.",
            AdvancedMethod::Registry,
            AdvancedRisk::Low,
            false,
            false,
            true,
            true,
            false,
            display_optional(state.visual_fx_setting),
            "Definir VisualFXSetting como 3",
            "PowerShell New-ItemProperty em HKCU Explorer\\VisualEffects",
        ),
        operations: vec![registry_dword(
            "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects",
            "VisualFXSetting",
            3,
            state.visual_fx_setting,
            RestoreRollbackActionType::RestoreVisualEffects,
        )],
    }
}

fn open_performance_options_plan() -> AdvancedPlan {
    AdvancedPlan {
        action: action(
            "open-performance-options",
            "Abrir Opcoes de desempenho do Windows",
            "Abre a ferramenta nativa de desempenho do Windows. Nao altera configuracoes automaticamente.",
            AdvancedMethod::Cmd,
            AdvancedRisk::Low,
            false,
            false,
            true,
            false,
            false,
            "Ferramenta nativa fechada".to_string(),
            "Abrir sysdm.cpl na aba Avancado",
            "cmd: rundll32 shell32.dll,Control_RunDLL sysdm.cpl,,3",
        ),
        operations: vec![AdvancedOperation::Cmd {
            program: "rundll32.exe".to_string(),
            args: vec![
                "shell32.dll,Control_RunDLL".to_string(),
                "sysdm.cpl,,3".to_string(),
            ],
            transient: true,
        }],
    }
}

fn action(
    id: &str,
    title: &str,
    description: &str,
    method: AdvancedMethod,
    risk: AdvancedRisk,
    requires_admin: bool,
    requires_extreme: bool,
    reversible: bool,
    persistent: bool,
    requires_restart: bool,
    current_value: impl Into<String>,
    planned_change: &str,
    command_preview: &str,
) -> AdvancedAction {
    AdvancedAction {
        id: id.to_string(),
        title: title.to_string(),
        description: description.to_string(),
        method,
        risk,
        requires_admin,
        requires_extreme,
        reversible,
        persistent,
        requires_restart,
        current_value: current_value.into(),
        planned_change: planned_change.to_string(),
        command_preview: command_preview.to_string(),
    }
}

fn registry_dword(
    path: &str,
    name: &str,
    value: i64,
    previous: Option<i64>,
    rollback_type: RestoreRollbackActionType,
) -> AdvancedOperation {
    AdvancedOperation::RegistryDword {
        path: path.to_string(),
        name: name.to_string(),
        value,
        previous_value: Some(
            previous
                .map(|item| item.to_string())
                .unwrap_or_else(|| MISSING_REGISTRY_VALUE.to_string()),
        ),
        rollback_type,
    }
}

fn registry_string(
    path: &str,
    name: &str,
    value: &str,
    previous: Option<String>,
    rollback_type: RestoreRollbackActionType,
) -> AdvancedOperation {
    AdvancedOperation::RegistryString {
        path: path.to_string(),
        name: name.to_string(),
        value: value.to_string(),
        previous_value: Some(previous.unwrap_or_else(|| MISSING_REGISTRY_VALUE.to_string())),
        rollback_type,
    }
}

fn blocked_actions() -> Vec<AdvancedBlockedAction> {
    vec![
        blocked(
            "chkdsk-repair",
            "chkdsk C: /f /r",
            "Bloqueado nesta fase: pode exigir reinicio, travar volume e demorar muito.",
            AdvancedMethod::Cmd,
            AdvancedRisk::High,
            true,
            true,
        ),
        blocked(
            "defrag-optimize",
            "defrag C: /O",
            "Bloqueado nesta fase: Windows ja agenda otimizacao e SSD/NVMe exigem cuidado.",
            AdvancedMethod::Cmd,
            AdvancedRisk::High,
            true,
            true,
        ),
        blocked(
            "winsock-reset",
            "Reset de rede",
            "Bloqueado nesta fase: pode quebrar conectividade e exige reinicio.",
            AdvancedMethod::Cmd,
            AdvancedRisk::High,
            true,
            true,
        ),
        blocked(
            "disable-windows-update",
            "Desabilitar Windows Update permanentemente",
            "Bloqueado: o Hermes nao desativa atualizacoes de seguranca de forma permanente.",
            AdvancedMethod::PowerShell,
            AdvancedRisk::High,
            true,
            true,
        ),
        blocked(
            "disable-defender",
            "Desabilitar Defender permanentemente",
            "Bloqueado: reduzir protecao permanente do Windows fica fora da filosofia segura.",
            AdvancedMethod::PowerShell,
            AdvancedRisk::High,
            true,
            true,
        ),
        blocked(
            "delete-user-files",
            "Apagar arquivos pessoais",
            "Bloqueado: Downloads, Documentos, Desktop, Imagens e Videos nunca entram no Advanced Engine.",
            AdvancedMethod::PowerShell,
            AdvancedRisk::High,
            true,
            true,
        ),
        blocked(
            "remove-programs",
            "Remover programas",
            "Bloqueado: o Hermes pode desabilitar inicializacao em engine propria, mas nao remove softwares.",
            AdvancedMethod::PowerShell,
            AdvancedRisk::High,
            true,
            true,
        ),
        blocked(
            "free-registry-delete",
            "Deletar chaves de Registro fora da allowlist",
            "Bloqueado: nenhuma chave fora da allowlist do Restore/Advanced pode ser removida.",
            AdvancedMethod::Registry,
            AdvancedRisk::High,
            true,
            true,
        ),
        blocked(
            "hklm-multimedia-tweaks",
            "Tweaks HKLM Multimedia/SystemProfile",
            "Bloqueado nesta fase: exige admin, afeta todo o sistema e precisa de backup dedicado.",
            AdvancedMethod::Registry,
            AdvancedRisk::High,
            true,
            true,
        ),
        blocked(
            "sfc-scan-now",
            "SFC /scannow automatico",
            "Fica para Centro de Reparo: exige confirmacao forte e nao deve rodar junto com otimizacoes.",
            AdvancedMethod::Cmd,
            AdvancedRisk::Medium,
            true,
            false,
        ),
        blocked(
            "dism-restore-health",
            "DISM RestoreHealth automatico",
            "Fica para Centro de Reparo: exige admin, pode demorar e nao deve rodar automaticamente.",
            AdvancedMethod::Cmd,
            AdvancedRisk::Medium,
            true,
            false,
        ),
    ]
}

fn blocked(
    id: &str,
    title: &str,
    reason: &str,
    method: AdvancedMethod,
    risk: AdvancedRisk,
    requires_admin: bool,
    requires_extreme: bool,
) -> AdvancedBlockedAction {
    AdvancedBlockedAction {
        id: id.to_string(),
        title: title.to_string(),
        reason: reason.to_string(),
        method,
        risk,
        requires_admin,
        requires_extreme,
    }
}

fn selected_action_ids(action_ids: Option<&[String]>) -> Vec<String> {
    action_ids
        .filter(|items| !items.is_empty())
        .map(|items| {
            items
                .iter()
                .map(|item| item.trim().to_string())
                .filter(|item| allowed_action_ids().contains(item))
                .collect::<Vec<_>>()
        })
        .unwrap_or_else(default_action_ids)
}

fn default_action_ids() -> Vec<String> {
    vec![
        "enable-game-mode".to_string(),
        "disable-game-dvr".to_string(),
        "disable-startup-delay".to_string(),
        "flush-dns-cache".to_string(),
        "list-power-plans".to_string(),
        "set-high-performance-power-plan".to_string(),
        "disable-transparency".to_string(),
        "disable-window-animations".to_string(),
        "disable-visual-shadows".to_string(),
        "set-visual-effects-custom".to_string(),
    ]
}

fn allowed_action_ids() -> Vec<String> {
    vec![
        "enable-game-mode".to_string(),
        "disable-game-mode".to_string(),
        "disable-game-dvr".to_string(),
        "enable-game-dvr".to_string(),
        "disable-startup-delay".to_string(),
        "flush-dns-cache".to_string(),
        "list-power-plans".to_string(),
        "set-high-performance-power-plan".to_string(),
        "set-balanced-power-plan".to_string(),
        "set-power-saver-power-plan".to_string(),
        "disable-transparency".to_string(),
        "disable-window-animations".to_string(),
        "disable-visual-shadows".to_string(),
        "set-visual-effects-custom".to_string(),
        "open-performance-options".to_string(),
    ]
}

fn build_snapshot_request(plans: &[AdvancedPlan], dry_run: bool) -> RestoreCreateSnapshotRequest {
    let mode = if dry_run { "dry-run" } else { "aplicacao real" };
    RestoreCreateSnapshotRequest {
        name: Some("Advanced Engine - Snapshot de seguranca".to_string()),
        description: Some(format!(
            "Snapshot obrigatorio antes da {mode} de comandos avancados allowlistados."
        )),
        planned_actions: Some(plans.iter().map(plan_to_planned_action).collect()),
        rollback_manifest: Some(
            plans
                .iter()
                .flat_map(plan_to_rollback_actions)
                .collect::<Vec<_>>(),
        ),
        previous_state: Some(
            plans
                .iter()
                .flat_map(plan_to_previous_state)
                .collect::<Vec<_>>(),
        ),
    }
}

fn validate_plans_for_apply(plans: &[AdvancedPlan], extreme_mode: bool) -> Result<(), String> {
    for plan in plans {
        if plan.action.requires_admin {
            return Err(format!(
                "{} exige administrador e deve ser executada em fluxo dedicado.",
                plan.action.title
            ));
        }

        if plan.action.requires_extreme && !extreme_mode {
            return Err(format!(
                "{} exige nivel Extremo e confirmacao forte.",
                plan.action.title
            ));
        }

        if plan.action.persistent && !plan.action.reversible {
            return Err(format!(
                "{} e persistente, mas nao possui rollback seguro.",
                plan.action.title
            ));
        }

        if matches!(plan.action.risk, AdvancedRisk::High) && !extreme_mode {
            return Err(format!(
                "{} possui risco alto e permanece bloqueada fora do modo Extremo.",
                plan.action.title
            ));
        }

        for operation in &plan.operations {
            validate_operation(operation)?;
        }
    }

    Ok(())
}

fn validate_operation(operation: &AdvancedOperation) -> Result<(), String> {
    match operation {
        AdvancedOperation::RegistryDword { path, name, .. }
        | AdvancedOperation::RegistryString { path, name, .. } => {
            if !is_advanced_allowed_registry_target(path, name) {
                return Err(format!(
                    "Registro fora da allowlist do Advanced Engine: {path}|{name}"
                ));
            }
            Ok(())
        }
        AdvancedOperation::PowerPlan {
            guid,
            previous_guid,
            ..
        } => {
            if !is_allowed_power_plan_guid(guid) {
                return Err("Plano de energia fora da allowlist Hermes.".to_string());
            }
            if previous_guid.is_none() {
                return Err(
                    "Plano de energia atual indisponivel; rollback nao pode ser garantido."
                        .to_string(),
                );
            }
            Ok(())
        }
        AdvancedOperation::Cmd { program, args, .. } => {
            if is_allowed_native_command(program, args) {
                Ok(())
            } else {
                Err("Comando nativo fora da allowlist Hermes.".to_string())
            }
        }
    }
}

fn is_advanced_allowed_registry_target(path: &str, name: &str) -> bool {
    let normalized = path.replace('/', "\\").to_ascii_lowercase();
    let normalized_name = name.to_ascii_lowercase();
    if normalized == "hkcu:\\software\\microsoft\\directx\\usergpupreferences" {
        return is_allowed_graphics_preference_executable_path(name);
    }

    matches!(
        (normalized.as_str(), normalized_name.as_str()),
        ("hkcu:\\software\\microsoft\\gamebar", "autogamemodeenabled")
            | ("hkcu:\\software\\microsoft\\gamebar", "allowautogamemode")
            | ("hkcu:\\system\\gameconfigstore", "gamedvr_enabled")
            | (
                "hkcu:\\software\\microsoft\\windows\\currentversion\\gamedvr",
                "appcaptureenabled"
            )
            | (
                "hkcu:\\software\\microsoft\\windows\\currentversion\\explorer\\serialize",
                "startupdelayinmsec"
            )
            | (
                "hkcu:\\software\\microsoft\\windows\\currentversion\\themes\\personalize",
                "enabletransparency"
            )
            | ("hkcu:\\control panel\\desktop\\windowmetrics", "minanimate")
            | (
                "hkcu:\\software\\microsoft\\windows\\currentversion\\explorer\\advanced",
                "taskbaranimations"
            )
            | (
                "hkcu:\\software\\microsoft\\windows\\currentversion\\explorer\\advanced",
                "listviewalphaselect"
            )
            | (
                "hkcu:\\software\\microsoft\\windows\\currentversion\\explorer\\advanced",
                "listviewshadow"
            )
            | (
                "hkcu:\\software\\microsoft\\windows\\currentversion\\explorer\\visualeffects",
                "visualfxsetting"
            )
    )
}

fn plan_to_planned_action(plan: &AdvancedPlan) -> RestorePlannedAction {
    RestorePlannedAction {
        id: plan.action.id.clone(),
        engine: "Advanced Engine".to_string(),
        title: plan.action.title.clone(),
        description: plan.action.description.clone(),
        risk: match plan.action.risk {
            AdvancedRisk::Low => RestoreRiskLevel::Low,
            AdvancedRisk::Medium => RestoreRiskLevel::Medium,
            AdvancedRisk::High => RestoreRiskLevel::High,
        },
        will_modify_system: true,
        requires_admin: plan.action.requires_admin,
    }
}

fn plan_to_rollback_actions(plan: &AdvancedPlan) -> Vec<RestoreRollbackAction> {
    plan.operations
        .iter()
        .enumerate()
        .map(|(index, operation)| match operation {
            AdvancedOperation::RegistryDword {
                path,
                name,
                previous_value,
                rollback_type,
                ..
            } => RestoreRollbackAction {
                id: format!("rollback-{}-{}", plan.action.id, index + 1),
                action_type: rollback_type.clone(),
                target: format!("{path}|{name}|DWord"),
                description: format!("Restaurar {name} para o valor anterior."),
                previous_value: previous_value.clone(),
                backup_path: None,
                command_preview: Some(
                    "PowerShell New-ItemProperty -PropertyType DWord".to_string(),
                ),
                status: RestoreRollbackActionStatus::Pending,
            },
            AdvancedOperation::RegistryString {
                path,
                name,
                previous_value,
                rollback_type,
                ..
            } => RestoreRollbackAction {
                id: format!("rollback-{}-{}", plan.action.id, index + 1),
                action_type: rollback_type.clone(),
                target: format!("{path}|{name}|String"),
                description: format!("Restaurar {name} para o valor anterior."),
                previous_value: previous_value.clone(),
                backup_path: None,
                command_preview: Some(
                    "PowerShell New-ItemProperty -PropertyType String".to_string(),
                ),
                status: RestoreRollbackActionStatus::Pending,
            },
            AdvancedOperation::PowerPlan {
                previous_guid,
                previous_name,
                ..
            } => previous_guid
                .as_ref()
                .map(|guid| RestoreRollbackAction {
                    id: format!("rollback-{}-{}", plan.action.id, index + 1),
                    action_type: RestoreRollbackActionType::RestorePowerPlan,
                    target: guid.clone(),
                    description: "Restaurar plano de energia anterior.".to_string(),
                    previous_value: previous_name.clone(),
                    backup_path: None,
                    command_preview: Some(format!("powercfg /S {guid}")),
                    status: RestoreRollbackActionStatus::Pending,
                })
                .unwrap_or_else(|| RestoreRollbackAction {
                    id: format!("rollback-{}-{}", plan.action.id, index + 1),
                    action_type: RestoreRollbackActionType::Noop,
                    target: "power-plan-unavailable".to_string(),
                    description:
                        "Plano de energia anterior indisponivel. Rollback real nao pode ser preparado."
                            .to_string(),
                    previous_value: None,
                    backup_path: None,
                    command_preview: Some("No-op".to_string()),
                    status: RestoreRollbackActionStatus::Pending,
                }),
            AdvancedOperation::Cmd { transient, .. } => RestoreRollbackAction {
                id: format!("rollback-{}-{}", plan.action.id, index + 1),
                action_type: RestoreRollbackActionType::Noop,
                target: if *transient {
                    "transient-command".to_string()
                } else {
                    "cmd-command".to_string()
                },
                description: if *transient {
                    "Comando transiente sem estado persistente. Nenhuma reversao e necessaria."
                        .to_string()
                } else {
                    "Comando CMD allowlistado sem rollback persistente.".to_string()
                },
                previous_value: None,
                backup_path: None,
                command_preview: Some("No-op".to_string()),
                status: RestoreRollbackActionStatus::Pending,
            },
        })
        .collect()
}

fn plan_to_previous_state(plan: &AdvancedPlan) -> Vec<RestorePreviousState> {
    plan.operations
        .iter()
        .enumerate()
        .map(|(index, operation)| match operation {
            AdvancedOperation::RegistryDword {
                path,
                name,
                previous_value,
                ..
            } => RestorePreviousState {
                key: format!("{}:{}:{}", plan.action.id, path, name),
                category: previous_state_category_for_operation(operation),
                value: previous_value
                    .clone()
                    .unwrap_or_else(|| MISSING_REGISTRY_VALUE.to_string()),
                source: "Advanced Engine".to_string(),
                captured: true,
            },
            AdvancedOperation::RegistryString {
                path,
                name,
                previous_value,
                ..
            } => RestorePreviousState {
                key: format!("{}:{}:{}", plan.action.id, path, name),
                category: previous_state_category_for_operation(operation),
                value: previous_value
                    .clone()
                    .unwrap_or_else(|| MISSING_REGISTRY_VALUE.to_string()),
                source: "Advanced Engine".to_string(),
                captured: true,
            },
            AdvancedOperation::PowerPlan {
                previous_guid,
                previous_name,
                ..
            } => RestorePreviousState {
                key: format!("{}:power-plan", plan.action.id),
                category: RestorePreviousStateCategory::PowerPlan,
                value: format!(
                    "{} | {}",
                    previous_name
                        .clone()
                        .unwrap_or_else(|| "Plano desconhecido".to_string()),
                    previous_guid
                        .clone()
                        .unwrap_or_else(|| "GUID indisponivel".to_string())
                ),
                source: "powercfg /GETACTIVESCHEME".to_string(),
                captured: previous_guid.is_some(),
            },
            AdvancedOperation::Cmd { program, args, .. } => RestorePreviousState {
                key: format!("{}:cmd:{}", plan.action.id, index + 1),
                category: RestorePreviousStateCategory::Metadata,
                value: format!("{} {}", program, args.join(" ")),
                source: "Advanced Engine".to_string(),
                captured: true,
            },
        })
        .collect()
}

fn previous_state_category_for_operation(
    operation: &AdvancedOperation,
) -> RestorePreviousStateCategory {
    match operation {
        AdvancedOperation::RegistryDword { rollback_type, .. }
        | AdvancedOperation::RegistryString { rollback_type, .. } => match rollback_type {
            RestoreRollbackActionType::RestoreGameMode => RestorePreviousStateCategory::GameMode,
            RestoreRollbackActionType::RestoreVisualEffects => {
                RestorePreviousStateCategory::VisualEffects
            }
            _ => RestorePreviousStateCategory::Registry,
        },
        AdvancedOperation::PowerPlan { .. } => RestorePreviousStateCategory::PowerPlan,
        AdvancedOperation::Cmd { .. } => RestorePreviousStateCategory::Metadata,
    }
}

fn apply_plans(
    app: &AppHandle,
    snapshot_id: &str,
    plans: &[AdvancedPlan],
) -> Result<Vec<AdvancedActionResult>, String> {
    let mut results = Vec::new();
    for plan in plans {
        let result = apply_plan(plan);
        let failed = matches!(result.status, AdvancedActionStatus::Failed);
        append_advanced_event(
            app,
            if failed {
                AdvancedEventLevel::Error
            } else {
                AdvancedEventLevel::Info
            },
            Some(snapshot_id.to_string()),
            &format!("{}: {}", plan.action.title, result.message),
        )?;
        results.push(result);
        if failed {
            break;
        }
    }
    Ok(results)
}

fn apply_plan(plan: &AdvancedPlan) -> AdvancedActionResult {
    for operation in &plan.operations {
        if let Err(error) = apply_operation(operation) {
            return AdvancedActionResult {
                id: plan.action.id.clone(),
                title: plan.action.title.clone(),
                status: AdvancedActionStatus::Failed,
                message: error,
            };
        }
    }

    AdvancedActionResult {
        id: plan.action.id.clone(),
        title: plan.action.title.clone(),
        status: AdvancedActionStatus::Applied,
        message: if plan_has_persistent_operations(plan) {
            "Acao persistente aplicada com rollback registrado no snapshot.".to_string()
        } else {
            "Acao temporaria executada e registrada. Nenhum estado persistente para reverter."
                .to_string()
        },
    }
}

fn plan_has_persistent_operations(plan: &AdvancedPlan) -> bool {
    plan.operations.iter().any(|operation| {
        !matches!(
            operation,
            AdvancedOperation::Cmd {
                transient: true,
                ..
            }
        )
    })
}

fn apply_operation(operation: &AdvancedOperation) -> Result<(), String> {
    match operation {
        AdvancedOperation::RegistryDword {
            path, name, value, ..
        } => set_registry_dword(path, name, *value),
        AdvancedOperation::RegistryString {
            path, name, value, ..
        } => set_registry_string(path, name, value),
        AdvancedOperation::PowerPlan { guid, .. } => {
            run_native_command("powercfg", &["/S".to_string(), guid.clone()]).map(|_| ())
        }
        AdvancedOperation::Cmd { program, args, .. } => {
            run_native_command(program, args).map(|_| ())
        }
    }
}

fn set_registry_dword(path: &str, name: &str, value: i64) -> Result<(), String> {
    let path_arg = ps_escape(path);
    let name_arg = ps_escape(name);
    let script = format!(
        "$ErrorActionPreference = 'Stop'; New-Item -Path '{path_arg}' -Force | Out-Null; New-ItemProperty -Path '{path_arg}' -Name '{name_arg}' -Value {value} -PropertyType DWord -Force | Out-Null; 'ok'"
    );
    run_powershell(&script, ADVANCED_COMMAND_TIMEOUT_SECONDS).map(|_| ())
}

fn set_registry_string(path: &str, name: &str, value: &str) -> Result<(), String> {
    let path_arg = ps_escape(path);
    let name_arg = ps_escape(name);
    let value_arg = ps_escape(value);
    let script = format!(
        "$ErrorActionPreference = 'Stop'; New-Item -Path '{path_arg}' -Force | Out-Null; New-ItemProperty -Path '{path_arg}' -Name '{name_arg}' -Value '{value_arg}' -PropertyType String -Force | Out-Null; 'ok'"
    );
    run_powershell(&script, ADVANCED_COMMAND_TIMEOUT_SECONDS).map(|_| ())
}

fn read_registry_string(path: &str, name: &str) -> Result<Option<String>, String> {
    let path_arg = ps_escape(path);
    let name_arg = ps_escape(name);
    let script = format!(
        "$ErrorActionPreference = 'Stop'; $path = '{path_arg}'; $name = '{name_arg}'; if (-not (Test-Path $path)) {{ '__HERMES_MISSING__'; exit 0 }}; $item = Get-ItemProperty -Path $path -Name $name -ErrorAction SilentlyContinue; if ($null -eq $item) {{ '__HERMES_MISSING__'; exit 0 }}; $property = $item.PSObject.Properties[$name]; if ($null -eq $property) {{ '__HERMES_MISSING__' }} else {{ [string]$property.Value }}"
    );
    let output = run_powershell(&script, ADVANCED_COMMAND_TIMEOUT_SECONDS)?;
    if output.trim() == MISSING_REGISTRY_VALUE {
        Ok(None)
    } else {
        Ok(Some(output))
    }
}

fn run_native_command(program: &str, args: &[String]) -> Result<String, String> {
    if !is_allowed_native_command(program, args) {
        return Err("Comando CMD bloqueado pela allowlist Hermes.".to_string());
    }

    let mut command = Command::new(program);
    command
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }

    let mut child = command
        .spawn()
        .map_err(|err| format!("Nao foi possivel iniciar {program}: {err}"))?;
    wait_for_process(&mut child, ADVANCED_COMMAND_TIMEOUT_SECONDS)?;
    command_output(child, program)
}

fn is_allowed_native_command(program: &str, args: &[String]) -> bool {
    let normalized_program = program.to_ascii_lowercase();
    let normalized_args = args
        .iter()
        .map(|arg| arg.to_ascii_lowercase())
        .collect::<Vec<_>>();

    match normalized_program.as_str() {
        "ipconfig" => normalized_args == ["/flushdns".to_string()],
        "powercfg" => {
            normalized_args == ["/l".to_string()]
                || normalized_args == ["/list".to_string()]
                || matches!(
                    normalized_args.as_slice(),
                    [switch, guid]
                        if switch == "/s"
                            && is_allowed_power_plan_guid(guid)
                )
        }
        "rundll32.exe" => {
            normalized_args
                == [
                    "shell32.dll,control_rundll".to_string(),
                    "sysdm.cpl,,3".to_string(),
                ]
        }
        _ => false,
    }
}

fn is_allowed_power_plan_guid(guid: &str) -> bool {
    [
        BALANCED_POWER_PLAN_GUID,
        HIGH_PERFORMANCE_POWER_PLAN_GUID,
        POWER_SAVER_POWER_PLAN_GUID,
    ]
    .iter()
    .any(|allowed| guid.eq_ignore_ascii_case(allowed))
}

fn normalize_graphics_preference_path(path: &str) -> Result<String, String> {
    let normalized = path.trim().replace('/', "\\");
    if is_allowed_graphics_preference_executable_path(&normalized) {
        Ok(normalized)
    } else {
        Err("Elementos Graficos aceita apenas executavel local do Fate Trigger.".to_string())
    }
}

fn is_allowed_graphics_preference_executable_path(path: &str) -> bool {
    let normalized = path.replace('/', "\\").to_ascii_lowercase();
    let bytes = normalized.as_bytes();
    normalized.ends_with(".exe")
        && bytes.len() > 6
        && bytes.get(1) == Some(&b':')
        && bytes.get(2) == Some(&b'\\')
        && (normalized.contains("fate trigger")
            || normalized.contains("fatetrigger")
            || normalized.contains("fate_trigger"))
}

fn append_advanced_event(
    app: &AppHandle,
    level: AdvancedEventLevel,
    snapshot_id: Option<String>,
    message: &str,
) -> Result<(), String> {
    let path = advanced_events_path(app)?;
    let mut history = read_advanced_event_history(&path);
    history.events.insert(
        0,
        AdvancedEvent {
            id: format!("advanced-event-{}-{}", now_timestamp(), now_nanos()),
            timestamp: now_timestamp(),
            snapshot_id,
            level,
            message: message.to_string(),
        },
    );
    history.events.truncate(MAX_ADVANCED_EVENTS);
    write_advanced_event_history(&path, &history)
}

fn advanced_events_path(app: &AppHandle) -> Result<PathBuf, String> {
    let mut dir = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("Nao foi possivel localizar AppData: {err}"))?;
    dir.push("history");
    fs::create_dir_all(&dir)
        .map_err(|err| format!("Nao foi possivel criar historico avancado: {err}"))?;
    dir.push("advanced_events.json");
    Ok(dir)
}

fn read_advanced_event_history(path: &PathBuf) -> AdvancedEventHistory {
    let Ok(contents) = fs::read_to_string(path) else {
        return AdvancedEventHistory::default();
    };
    serde_json::from_str(&contents).unwrap_or_default()
}

fn write_advanced_event_history(
    path: &PathBuf,
    history: &AdvancedEventHistory,
) -> Result<(), String> {
    let contents = serde_json::to_string_pretty(history)
        .map_err(|err| format!("Nao foi possivel serializar logs avancados: {err}"))?;
    fs::write(path, contents)
        .map_err(|err| format!("Nao foi possivel gravar logs avancados: {err}"))
}

fn run_powershell(script: &str, timeout_seconds: u64) -> Result<String, String> {
    let mut command = Command::new("powershell.exe");
    command
        .arg("-NoProfile")
        .arg("-NonInteractive")
        .arg("-ExecutionPolicy")
        .arg("Bypass")
        .arg("-Command")
        .arg(script)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }

    let mut child = command
        .spawn()
        .map_err(|err| format!("Nao foi possivel iniciar PowerShell avancado: {err}"))?;
    wait_for_process(&mut child, timeout_seconds)?;
    command_output(child, "PowerShell")
}

fn wait_for_process(child: &mut std::process::Child, timeout_seconds: u64) -> Result<(), String> {
    let started_at = SystemTime::now();
    loop {
        if child
            .try_wait()
            .map_err(|err| format!("Falha ao aguardar processo avancado: {err}"))?
            .is_some()
        {
            return Ok(());
        }

        let elapsed = SystemTime::now()
            .duration_since(started_at)
            .unwrap_or_default()
            .as_secs();
        if elapsed >= timeout_seconds {
            let _ = child.kill();
            return Err("Tempo limite atingido no comando avancado.".to_string());
        }

        thread::sleep(Duration::from_millis(80));
    }
}

fn command_output(child: std::process::Child, label: &str) -> Result<String, String> {
    let output = child
        .wait_with_output()
        .map_err(|err| format!("Nao foi possivel ler saida de {label}: {err}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            format!("{label} retornou erro sem detalhes.")
        } else {
            stderr
        });
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn fallback_state() -> RawAdvancedState {
    RawAdvancedState {
        auto_game_mode_enabled: None,
        allow_auto_game_mode: None,
        game_dvr_enabled: None,
        app_capture_enabled: None,
        startup_delay_in_msec: None,
        enable_transparency: None,
        min_animate: None,
        taskbar_animations: None,
        listview_alpha_select: None,
        listview_shadow: None,
        visual_fx_setting: None,
        power_plan_guid: Some("Indisponivel".to_string()),
        power_plan_name: Some("Indisponivel".to_string()),
    }
}

fn display_optional(value: Option<i64>) -> String {
    value
        .map(|item| item.to_string())
        .unwrap_or_else(|| "Nao definido".to_string())
}

fn display_optional_string(value: Option<&str>) -> String {
    value
        .map(|item| item.to_string())
        .unwrap_or_else(|| "Nao definido".to_string())
}

fn current_power_plan(state: &RawAdvancedState) -> String {
    format!(
        "{} ({})",
        state
            .power_plan_name
            .clone()
            .unwrap_or_else(|| "Plano desconhecido".to_string()),
        state
            .power_plan_guid
            .clone()
            .unwrap_or_else(|| "GUID indisponivel".to_string())
    )
}

fn ps_escape(value: &str) -> String {
    value.replace('\'', "''")
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

const POWERSHELL_ADVANCED_STATE_SCRIPT: &str = r#"
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Get-Dword($path, $name) {
  try {
    $item = Get-ItemProperty -Path $path -Name $name -ErrorAction SilentlyContinue
    if ($null -eq $item) { return $null }
    return [int64]$item.$name
  } catch { return $null }
}

$gameBarPath = 'HKCU:\Software\Microsoft\GameBar'
$gameConfigPath = 'HKCU:\System\GameConfigStore'
$gameDvrPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR'
$serializePath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Serialize'
$personalizePath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize'
$windowMetricsPath = 'HKCU:\Control Panel\Desktop\WindowMetrics'
$advancedPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'
$visualFxPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects'

$powerPlanGuid = $null
$powerPlanName = $null
try {
  $activeScheme = powercfg /GETACTIVESCHEME
  if ($activeScheme -match '([0-9a-fA-F-]{36})\s+\(([^\)]+)\)') {
    $powerPlanGuid = $matches[1]
    $powerPlanName = $matches[2]
  }
} catch {}

$minAnimateValue = $null
try {
  $minAnimateValue = [string](Get-ItemProperty -Path $windowMetricsPath -Name 'MinAnimate' -ErrorAction SilentlyContinue).MinAnimate
} catch {
  $minAnimateValue = $null
}

[pscustomobject]@{
  autoGameModeEnabled = Get-Dword $gameBarPath 'AutoGameModeEnabled'
  allowAutoGameMode = Get-Dword $gameBarPath 'AllowAutoGameMode'
  gameDvrEnabled = Get-Dword $gameConfigPath 'GameDVR_Enabled'
  appCaptureEnabled = Get-Dword $gameDvrPath 'AppCaptureEnabled'
  startupDelayInMsec = Get-Dword $serializePath 'StartupDelayInMSec'
  enableTransparency = Get-Dword $personalizePath 'EnableTransparency'
  minAnimate = $minAnimateValue
  taskbarAnimations = Get-Dword $advancedPath 'TaskbarAnimations'
  listviewAlphaSelect = Get-Dword $advancedPath 'ListviewAlphaSelect'
  listviewShadow = Get-Dword $advancedPath 'ListviewShadow'
  visualFxSetting = Get-Dword $visualFxPath 'VisualFXSetting'
  powerPlanGuid = $powerPlanGuid
  powerPlanName = $powerPlanName
} | ConvertTo-Json -Depth 5 -Compress
"#;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn advanced_allowlist_blocks_windows_theme_values() {
        assert!(is_advanced_allowed_registry_target(
            "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
            "EnableTransparency"
        ));
        assert!(!is_advanced_allowed_registry_target(
            "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
            "AppsUseLightTheme"
        ));
        assert!(!is_advanced_allowed_registry_target(
            "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
            "SystemUsesLightTheme"
        ));
    }

    #[test]
    fn advanced_allowlist_scopes_graphics_preference_to_fate_trigger() {
        assert!(is_advanced_allowed_registry_target(
            "HKCU:\\Software\\Microsoft\\DirectX\\UserGpuPreferences",
            "D:\\Games\\FateTrigger\\FateTrigger.exe"
        ));
        assert!(!is_advanced_allowed_registry_target(
            "HKCU:\\Software\\Microsoft\\DirectX\\UserGpuPreferences",
            "C:\\Windows\\System32\\notepad.exe"
        ));
    }
}
