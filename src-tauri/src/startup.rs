use crate::restore::{
    self, RestoreCreateSnapshotRequest, RestorePlannedAction, RestorePreviousState,
    RestorePreviousStateCategory, RestoreRiskLevel, RestoreRollbackAction,
    RestoreRollbackActionStatus, RestoreRollbackActionType,
};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashSet,
    fs,
    path::PathBuf,
    process::{Command, Stdio},
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};

const POWERSHELL_TIMEOUT_SECONDS: u64 = 10;
const MAX_STARTUP_EVENTS: usize = 100;
const MISSING_STARTUP_VALUE: &str = "__HERMES_MISSING__";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartupReport {
    pub generated_at: String,
    pub engine_version: String,
    pub read_only: bool,
    pub total_items: usize,
    pub disabled_items: usize,
    pub high_impact_count: usize,
    pub medium_impact_count: usize,
    pub low_impact_count: usize,
    pub items: Vec<StartupItem>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartupItem {
    pub id: String,
    pub name: String,
    pub command: String,
    pub location: String,
    pub user: String,
    pub impact: StartupImpact,
    pub status: StartupStatus,
    pub can_disable_later: bool,
    pub can_enable_later: bool,
    pub controllable: bool,
    pub control_reason: String,
    pub registry_path: Option<String>,
    pub registry_value_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum StartupImpact {
    High,
    Medium,
    Low,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum StartupStatus {
    Active,
    Disabled,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct StartupApplyRequest {
    pub confirmed: bool,
    pub dry_run: Option<bool>,
    pub action: StartupApplyAction,
    pub item_ids: Option<Vec<String>>,
    pub impacts: Option<Vec<StartupImpact>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum StartupApplyAction {
    Disable,
    Enable,
}

impl Default for StartupApplyAction {
    fn default() -> Self {
        Self::Disable
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartupApplyResult {
    pub generated_at: String,
    pub engine_version: String,
    pub dry_run: bool,
    pub action: StartupApplyAction,
    pub snapshot_id: String,
    pub rollback_available: bool,
    pub selected_items: usize,
    pub changed_items: usize,
    pub skipped_items: usize,
    pub failed_items: usize,
    pub message: String,
    pub actions: Vec<StartupApplyActionResult>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartupApplyActionResult {
    pub item_id: String,
    pub name: String,
    pub status: StartupApplyActionStatus,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum StartupApplyActionStatus {
    DryRun,
    Disabled,
    Enabled,
    Skipped,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StartupEvent {
    id: String,
    timestamp: String,
    snapshot_id: Option<String>,
    level: StartupEventLevel,
    message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
enum StartupEventLevel {
    Info,
    Warning,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct StartupEventHistory {
    events: Vec<StartupEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct DisabledStartupStore {
    items: Vec<DisabledStartupItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DisabledStartupItem {
    id: String,
    name: String,
    command: String,
    registry_path: String,
    registry_value_name: String,
    user: String,
    impact: StartupImpact,
    disabled_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawStartupReport {
    items: Option<Vec<RawStartupItem>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawStartupItem {
    name: Option<String>,
    command: Option<String>,
    location: Option<String>,
    user: Option<String>,
}

#[derive(Debug, Clone)]
struct StartupRegistryTarget {
    path: String,
    name: String,
}

#[tauri::command]
pub async fn startup_engine_read() -> StartupReport {
    tauri::async_runtime::spawn_blocking(collect_startup_report)
        .await
        .unwrap_or_else(|err| {
            let mut report = fallback_report();
            report.warnings.push(format!(
                "Falha ao ler inicializacao em segundo plano: {err}"
            ));
            report
        })
}

#[tauri::command]
pub async fn startup_engine_apply(
    app: AppHandle,
    request: Option<StartupApplyRequest>,
) -> Result<StartupApplyResult, String> {
    tauri::async_runtime::spawn_blocking(move || startup_engine_apply_blocking(app, request))
        .await
        .map_err(|err| format!("Falha ao aplicar Startup Engine em segundo plano: {err}"))?
}

pub fn collect_startup_report() -> StartupReport {
    collect_startup_report_with_app(None)
}

fn collect_startup_report_with_app(app: Option<&AppHandle>) -> StartupReport {
    match collect_windows_startup() {
        Ok(raw) => build_report(raw, disabled_items_for_report(app), Vec::new()),
        Err(error) => {
            let mut report = build_report(
                fallback_raw_report(),
                disabled_items_for_report(app),
                vec!["Fallback local usado porque a leitura real nao respondeu.".to_string()],
            );
            report.warnings.push(error);
            report
        }
    }
}

pub(crate) fn startup_engine_apply_blocking(
    app: AppHandle,
    request: Option<StartupApplyRequest>,
) -> Result<StartupApplyResult, String> {
    let request = request.unwrap_or_default();
    let dry_run = request.dry_run.unwrap_or(!request.confirmed);
    if !dry_run && !request.confirmed {
        return Err("Confirmacao obrigatoria antes de alterar inicializacao.".to_string());
    }

    let report = collect_startup_report_with_app(Some(&app));
    if has_fallback_warning(&report.warnings) {
        return Err(
            "Startup Engine nao aplicou alteracoes: leitura real indisponivel, fallback ignorado."
                .to_string(),
        );
    }

    let selected_items = selected_startup_items(&report, &request);
    if selected_items.is_empty() {
        return Err("Nenhum item seguro de inicializacao foi selecionado.".to_string());
    }

    let snapshot = restore::restore_create_snapshot(
        app.clone(),
        Some(build_startup_snapshot_request(
            &request.action,
            &selected_items,
            dry_run,
        )),
    )?;
    append_startup_event(
        &app,
        StartupEventLevel::Info,
        Some(snapshot.id.clone()),
        if dry_run {
            "Startup Engine iniciou dry-run com snapshot obrigatorio."
        } else {
            "Startup Engine iniciou aplicacao apos confirmacao."
        },
    )?;

    let actions = if dry_run {
        selected_items
            .iter()
            .map(|item| StartupApplyActionResult {
                item_id: item.id.clone(),
                name: item.name.clone(),
                status: StartupApplyActionStatus::DryRun,
                message: "Dry-run validado. Nenhuma entrada de inicializacao foi alterada."
                    .to_string(),
            })
            .collect::<Vec<_>>()
    } else {
        apply_startup_items(&app, &request.action, &selected_items, &snapshot.id)?
    };

    let failed_items = actions
        .iter()
        .filter(|item| matches!(item.status, StartupApplyActionStatus::Failed))
        .count();
    let skipped_items = actions
        .iter()
        .filter(|item| matches!(item.status, StartupApplyActionStatus::Skipped))
        .count();
    let changed_items = actions
        .iter()
        .filter(|item| {
            matches!(
                item.status,
                StartupApplyActionStatus::Disabled | StartupApplyActionStatus::Enabled
            )
        })
        .count();
    let message = if failed_items > 0 {
        append_startup_event(
            &app,
            StartupEventLevel::Warning,
            Some(snapshot.id.clone()),
            "Falha detectada. Rollback automatico acionado.",
        )?;
        match restore::restore_apply_snapshot(app.clone(), snapshot.id.clone(), Some(false)) {
            Ok(result) if result.applied => {
                "Falha durante Startup Engine. Rollback automatico concluido.".to_string()
            }
            Ok(result) => format!(
                "Falha durante Startup Engine. Rollback parcial: {}",
                result.message
            ),
            Err(error) => format!("Falha durante Startup Engine e rollback falhou: {error}"),
        }
    } else if dry_run {
        "Startup Engine validada em dry-run com snapshot e rollback preparados.".to_string()
    } else {
        "Startup Engine aplicada com snapshot, log e rollback disponiveis.".to_string()
    };

    append_startup_event(
        &app,
        if failed_items > 0 {
            StartupEventLevel::Warning
        } else {
            StartupEventLevel::Info
        },
        Some(snapshot.id.clone()),
        &message,
    )?;

    Ok(StartupApplyResult {
        generated_at: now_timestamp(),
        engine_version: "startup-engine-control-v1".to_string(),
        dry_run,
        action: request.action,
        snapshot_id: snapshot.id,
        rollback_available: true,
        selected_items: selected_items.len(),
        changed_items,
        skipped_items,
        failed_items,
        message,
        actions,
        warnings: report.warnings,
    })
}

fn collect_windows_startup() -> Result<RawStartupReport, String> {
    if !cfg!(target_os = "windows") {
        return Err(
            "Startup Engine usa leitura local do Windows e esta plataforma nao e Windows."
                .to_string(),
        );
    }

    let stdout = run_powershell(POWERSHELL_STARTUP_SCRIPT)?;
    serde_json::from_str::<RawStartupReport>(&stdout)
        .map_err(|err| format!("Nao foi possivel interpretar inicializacao: {err}"))
}

fn build_report(
    raw: RawStartupReport,
    disabled_items: Vec<DisabledStartupItem>,
    warnings: Vec<String>,
) -> StartupReport {
    let mut items = raw
        .items
        .unwrap_or_default()
        .into_iter()
        .enumerate()
        .map(|(index, item)| build_item(index, item))
        .collect::<Vec<_>>();
    items.extend(
        disabled_items
            .into_iter()
            .enumerate()
            .map(|(index, item)| disabled_item_to_startup_item(index, item)),
    );

    items.sort_by(|a, b| {
        impact_rank(&a.impact)
            .cmp(&impact_rank(&b.impact))
            .then_with(|| status_rank(&a.status).cmp(&status_rank(&b.status)))
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    let high_impact_count = items
        .iter()
        .filter(|item| item.impact == StartupImpact::High)
        .count();
    let medium_impact_count = items
        .iter()
        .filter(|item| item.impact == StartupImpact::Medium)
        .count();
    let low_impact_count = items
        .iter()
        .filter(|item| item.impact == StartupImpact::Low)
        .count();
    let disabled_items = items
        .iter()
        .filter(|item| matches!(item.status, StartupStatus::Disabled))
        .count();

    StartupReport {
        generated_at: now_timestamp(),
        engine_version: "startup-engine-control-v1".to_string(),
        read_only: true,
        total_items: items.len(),
        disabled_items,
        high_impact_count,
        medium_impact_count,
        low_impact_count,
        items,
        warnings,
    }
}

fn build_item(index: usize, raw: RawStartupItem) -> StartupItem {
    let name = value_or(raw.name, "Item sem nome");
    let command = value_or(raw.command, "Comando nao identificado");
    let location = value_or(raw.location, "Local nao identificado");
    let user = value_or(raw.user, "Usuario nao identificado");
    let impact = classify_impact(&name, &command);
    let registry_target = registry_target_from_location(&location, &name);
    let control_reason = control_reason_for_target(registry_target.as_ref());
    let controllable = registry_target
        .as_ref()
        .map(|target| is_current_user_startup_path(&target.path))
        .unwrap_or(false);

    StartupItem {
        id: startup_item_id(&location, &name, index),
        name,
        command,
        location,
        user,
        impact,
        status: StartupStatus::Active,
        can_disable_later: controllable,
        can_enable_later: false,
        controllable,
        control_reason,
        registry_path: registry_target.as_ref().map(|target| target.path.clone()),
        registry_value_name: registry_target.map(|target| target.name),
    }
}

fn disabled_item_to_startup_item(_index: usize, item: DisabledStartupItem) -> StartupItem {
    StartupItem {
        id: item.id,
        name: item.name,
        command: item.command,
        location: item.registry_path.clone(),
        user: item.user,
        impact: item.impact,
        status: StartupStatus::Disabled,
        can_disable_later: false,
        can_enable_later: true,
        controllable: is_current_user_startup_path(&item.registry_path),
        control_reason: "Item desabilitado pelo Hermes; pode ser reativado com rollback."
            .to_string(),
        registry_path: Some(item.registry_path),
        registry_value_name: Some(item.registry_value_name),
    }
}

fn selected_startup_items(
    report: &StartupReport,
    request: &StartupApplyRequest,
) -> Vec<StartupItem> {
    let selected_ids = request
        .item_ids
        .as_ref()
        .map(|items| items.iter().cloned().collect::<HashSet<_>>())
        .unwrap_or_default();
    let impact_filter = request.impacts.as_deref().unwrap_or_default();
    let explicit_selection = !selected_ids.is_empty();
    let explicit_impacts = !impact_filter.is_empty();

    report
        .items
        .iter()
        .filter(|item| {
            if explicit_selection && !selected_ids.contains(&item.id) {
                return false;
            }
            if explicit_impacts && !impact_filter.contains(&item.impact) {
                return false;
            }

            match request.action {
                StartupApplyAction::Disable => {
                    matches!(item.status, StartupStatus::Active)
                        && if explicit_selection || explicit_impacts {
                            true
                        } else {
                            item.impact == StartupImpact::High
                        }
                }
                StartupApplyAction::Enable => matches!(item.status, StartupStatus::Disabled),
            }
        })
        .cloned()
        .collect()
}

fn build_startup_snapshot_request(
    action: &StartupApplyAction,
    items: &[StartupItem],
    dry_run: bool,
) -> RestoreCreateSnapshotRequest {
    let mode = if dry_run { "dry-run" } else { "aplicacao real" };
    RestoreCreateSnapshotRequest {
        name: Some("Startup Engine - Snapshot de seguranca".to_string()),
        description: Some(format!(
            "Snapshot obrigatorio antes da {mode} de controle seguro de inicializacao."
        )),
        planned_actions: Some(
            items
                .iter()
                .map(|item| startup_planned_action(action, item))
                .collect(),
        ),
        rollback_manifest: Some(
            items
                .iter()
                .filter_map(|item| startup_rollback_action(action, item))
                .collect(),
        ),
        previous_state: Some(
            items
                .iter()
                .map(|item| startup_previous_state(action, item))
                .collect(),
        ),
    }
}

fn startup_planned_action(action: &StartupApplyAction, item: &StartupItem) -> RestorePlannedAction {
    RestorePlannedAction {
        id: format!("startup-{}-{}", action_slug(action), item.id),
        engine: "Startup Engine".to_string(),
        title: format!("{} {}", action_title(action), item.name),
        description: format!(
            "Controle seguro de inicializacao em chave Run/RunOnce. {}",
            item.control_reason
        ),
        risk: RestoreRiskLevel::Medium,
        will_modify_system: true,
        requires_admin: item
            .registry_path
            .as_deref()
            .map(is_machine_startup_path)
            .unwrap_or(false),
    }
}

fn startup_rollback_action(
    action: &StartupApplyAction,
    item: &StartupItem,
) -> Option<RestoreRollbackAction> {
    let path = item.registry_path.clone()?;
    let name = item.registry_value_name.clone()?;
    let previous_value = match action {
        StartupApplyAction::Disable => item.command.clone(),
        StartupApplyAction::Enable => current_registry_value(&path, &name)
            .unwrap_or_else(|| MISSING_STARTUP_VALUE.to_string()),
    };

    Some(RestoreRollbackAction {
        id: format!("rollback-startup-{}-{}", action_slug(action), item.id),
        action_type: RestoreRollbackActionType::RestoreStartupEntry,
        target: format!("{path}|{name}|String"),
        description: format!("Restaurar entrada de inicializacao {}.", item.name),
        previous_value: Some(previous_value),
        backup_path: None,
        command_preview: Some("PowerShell New-ItemProperty -PropertyType String".to_string()),
        status: RestoreRollbackActionStatus::Pending,
    })
}

fn startup_previous_state(action: &StartupApplyAction, item: &StartupItem) -> RestorePreviousState {
    RestorePreviousState {
        key: format!("startup-{}-{}", action_slug(action), item.id),
        category: RestorePreviousStateCategory::Startup,
        value: format!(
            "{} | {} | {}",
            item.name,
            item.command,
            item.registry_path
                .clone()
                .unwrap_or_else(|| "Registro indisponivel".to_string())
        ),
        source: "Win32_StartupCommand/Hermes disabled store".to_string(),
        captured: item.registry_path.is_some() && item.registry_value_name.is_some(),
    }
}

fn apply_startup_items(
    app: &AppHandle,
    action: &StartupApplyAction,
    items: &[StartupItem],
    snapshot_id: &str,
) -> Result<Vec<StartupApplyActionResult>, String> {
    let mut results = Vec::new();
    for item in items {
        let result = apply_startup_item(app, action, item);
        append_startup_event(
            app,
            if matches!(result.status, StartupApplyActionStatus::Failed) {
                StartupEventLevel::Error
            } else {
                StartupEventLevel::Info
            },
            Some(snapshot_id.to_string()),
            &format!("{}: {}", item.name, result.message),
        )?;
        results.push(result);
    }

    Ok(results)
}

fn apply_startup_item(
    app: &AppHandle,
    action: &StartupApplyAction,
    item: &StartupItem,
) -> StartupApplyActionResult {
    let Some(path) = item.registry_path.as_deref() else {
        return startup_result(
            item,
            StartupApplyActionStatus::Skipped,
            "Item sem caminho de Registro controlavel.",
        );
    };
    let Some(name) = item.registry_value_name.as_deref() else {
        return startup_result(
            item,
            StartupApplyActionStatus::Skipped,
            "Item sem nome de valor de Registro controlavel.",
        );
    };

    if !is_current_user_startup_path(path) {
        return startup_result(
            item,
            StartupApplyActionStatus::Skipped,
            "Item fora da allowlist HKCU Run/RunOnce ou exige administrador.",
        );
    }

    match action {
        StartupApplyAction::Disable => {
            if !matches!(item.status, StartupStatus::Active) {
                return startup_result(
                    item,
                    StartupApplyActionStatus::Skipped,
                    "Apenas itens ativos podem ser desabilitados.",
                );
            }

            if let Err(error) = remove_registry_value(path, name) {
                return startup_result(
                    item,
                    StartupApplyActionStatus::Failed,
                    &format!("Falha ao desabilitar entrada: {error}"),
                );
            }
            if let Err(error) = save_disabled_startup_item(app, item) {
                return startup_result(
                    item,
                    StartupApplyActionStatus::Failed,
                    &format!("Entrada removida, mas falhou ao salvar manifesto local: {error}"),
                );
            }
            startup_result(
                item,
                StartupApplyActionStatus::Disabled,
                "Entrada de inicializacao desabilitada. Programa nao foi removido.",
            )
        }
        StartupApplyAction::Enable => {
            if !matches!(item.status, StartupStatus::Disabled) {
                return startup_result(
                    item,
                    StartupApplyActionStatus::Skipped,
                    "Apenas itens desabilitados pelo Hermes podem ser reativados.",
                );
            }

            if let Err(error) = set_registry_string(path, name, &item.command) {
                return startup_result(
                    item,
                    StartupApplyActionStatus::Failed,
                    &format!("Falha ao reativar entrada: {error}"),
                );
            }
            if let Err(error) = remove_disabled_startup_item(app, &item.id) {
                return startup_result(
                    item,
                    StartupApplyActionStatus::Failed,
                    &format!("Entrada reativada, mas falhou ao limpar manifesto local: {error}"),
                );
            }
            startup_result(
                item,
                StartupApplyActionStatus::Enabled,
                "Entrada de inicializacao reativada no Registro allowlistado.",
            )
        }
    }
}

fn startup_result(
    item: &StartupItem,
    status: StartupApplyActionStatus,
    message: &str,
) -> StartupApplyActionResult {
    StartupApplyActionResult {
        item_id: item.id.clone(),
        name: item.name.clone(),
        status,
        message: message.to_string(),
    }
}

fn registry_target_from_location(location: &str, name: &str) -> Option<StartupRegistryTarget> {
    let path = normalize_startup_registry_path(location)?;
    Some(StartupRegistryTarget {
        path,
        name: name.trim().to_string(),
    })
}

fn normalize_startup_registry_path(location: &str) -> Option<String> {
    let mut normalized = location.trim().replace('/', "\\");
    if normalized.is_empty() {
        return None;
    }

    let lower = normalized.to_ascii_lowercase();
    if lower.starts_with("hkey_current_user\\") {
        normalized = format!("HKCU:\\{}", &normalized["HKEY_CURRENT_USER\\".len()..]);
    } else if lower.starts_with("hkcu\\") {
        normalized = format!("HKCU:\\{}", &normalized["HKCU\\".len()..]);
    } else if lower.starts_with("hkey_local_machine\\") {
        normalized = format!("HKLM:\\{}", &normalized["HKEY_LOCAL_MACHINE\\".len()..]);
    } else if lower.starts_with("hklm\\") {
        normalized = format!("HKLM:\\{}", &normalized["HKLM\\".len()..]);
    }

    let lower = normalized.to_ascii_lowercase();
    if is_startup_registry_path(&lower) {
        Some(normalized)
    } else {
        None
    }
}

fn is_startup_registry_path(path: &str) -> bool {
    is_current_user_startup_path(path) || is_machine_startup_path(path)
}

fn is_current_user_startup_path(path: &str) -> bool {
    let normalized = path.replace('/', "\\").to_ascii_lowercase();
    matches!(
        normalized.as_str(),
        "hkcu:\\software\\microsoft\\windows\\currentversion\\run"
            | "hkcu:\\software\\microsoft\\windows\\currentversion\\runonce"
            | "hkcu:\\software\\wow6432node\\microsoft\\windows\\currentversion\\run"
            | "hkcu:\\software\\wow6432node\\microsoft\\windows\\currentversion\\runonce"
    )
}

fn is_machine_startup_path(path: &str) -> bool {
    let normalized = path.replace('/', "\\").to_ascii_lowercase();
    matches!(
        normalized.as_str(),
        "hklm:\\software\\microsoft\\windows\\currentversion\\run"
            | "hklm:\\software\\microsoft\\windows\\currentversion\\runonce"
            | "hklm:\\software\\wow6432node\\microsoft\\windows\\currentversion\\run"
            | "hklm:\\software\\wow6432node\\microsoft\\windows\\currentversion\\runonce"
    )
}

fn control_reason_for_target(target: Option<&StartupRegistryTarget>) -> String {
    match target {
        Some(target) if is_current_user_startup_path(&target.path) => {
            "Controlavel com seguranca via HKCU Run/RunOnce.".to_string()
        }
        Some(target) if is_machine_startup_path(&target.path) => {
            "Detectado em HKLM; exige administrador e fica bloqueado nesta fase.".to_string()
        }
        _ => "Local de inicializacao nao controlavel com seguranca nesta fase.".to_string(),
    }
}

fn startup_item_id(location: &str, name: &str, index: usize) -> String {
    format!(
        "startup-{}-{}-{}",
        index,
        sanitize_id(location),
        sanitize_id(name)
    )
}

fn action_slug(action: &StartupApplyAction) -> &'static str {
    match action {
        StartupApplyAction::Disable => "disable",
        StartupApplyAction::Enable => "enable",
    }
}

fn action_title(action: &StartupApplyAction) -> &'static str {
    match action {
        StartupApplyAction::Disable => "Desabilitar",
        StartupApplyAction::Enable => "Habilitar",
    }
}

fn current_registry_value(path: &str, name: &str) -> Option<String> {
    let path_arg = ps_escape(path);
    let name_arg = ps_escape(name);
    let script = format!(
        "$ErrorActionPreference = 'Stop'; $item = Get-ItemProperty -Path '{path_arg}' -Name '{name_arg}' -ErrorAction SilentlyContinue; if ($null -eq $item) {{ '__HERMES_MISSING__' }} else {{ [string]$item.'{name_arg}' }}"
    );
    match run_powershell(&script) {
        Ok(value) if !value.trim().is_empty() => Some(value.trim().to_string()),
        _ => None,
    }
}

fn remove_registry_value(path: &str, name: &str) -> Result<(), String> {
    let path_arg = ps_escape(path);
    let name_arg = ps_escape(name);
    let script = format!(
        "$ErrorActionPreference = 'Stop'; if (!(Test-Path '{path_arg}')) {{ throw 'Chave de Registro nao encontrada' }}; Remove-ItemProperty -Path '{path_arg}' -Name '{name_arg}' -ErrorAction Stop; 'ok'"
    );
    run_powershell(&script).map(|_| ())
}

fn set_registry_string(path: &str, name: &str, value: &str) -> Result<(), String> {
    let path_arg = ps_escape(path);
    let name_arg = ps_escape(name);
    let value_arg = ps_escape(value);
    let script = format!(
        "$ErrorActionPreference = 'Stop'; New-Item -Path '{path_arg}' -Force | Out-Null; New-ItemProperty -Path '{path_arg}' -Name '{name_arg}' -Value '{value_arg}' -PropertyType String -Force | Out-Null; 'ok'"
    );
    run_powershell(&script).map(|_| ())
}

fn ps_escape(value: &str) -> String {
    value.replace('\'', "''")
}

fn disabled_items_for_report(app: Option<&AppHandle>) -> Vec<DisabledStartupItem> {
    app.and_then(|handle| read_disabled_store(handle).ok())
        .map(|store| store.items)
        .unwrap_or_default()
}

fn save_disabled_startup_item(app: &AppHandle, item: &StartupItem) -> Result<(), String> {
    let path = item
        .registry_path
        .clone()
        .ok_or_else(|| "Caminho de Registro ausente.".to_string())?;
    let value_name = item
        .registry_value_name
        .clone()
        .ok_or_else(|| "Nome do valor de Registro ausente.".to_string())?;
    let mut store = read_disabled_store(app)?;
    let disabled = DisabledStartupItem {
        id: item.id.clone(),
        name: item.name.clone(),
        command: item.command.clone(),
        registry_path: path,
        registry_value_name: value_name,
        user: item.user.clone(),
        impact: item.impact.clone(),
        disabled_at: now_timestamp(),
    };

    if let Some(index) = store.items.iter().position(|entry| entry.id == disabled.id) {
        store.items[index] = disabled;
    } else {
        store.items.insert(0, disabled);
    }
    write_disabled_store(app, &store)
}

fn remove_disabled_startup_item(app: &AppHandle, item_id: &str) -> Result<(), String> {
    let mut store = read_disabled_store(app)?;
    store.items.retain(|item| item.id != item_id);
    write_disabled_store(app, &store)
}

fn read_disabled_store(app: &AppHandle) -> Result<DisabledStartupStore, String> {
    let path = disabled_store_path(app)?;
    let Ok(contents) = fs::read_to_string(&path) else {
        return Ok(DisabledStartupStore::default());
    };
    serde_json::from_str(&contents)
        .map_err(|err| format!("Nao foi possivel ler inicializacao desabilitada: {err}"))
}

fn write_disabled_store(app: &AppHandle, store: &DisabledStartupStore) -> Result<(), String> {
    let path = disabled_store_path(app)?;
    let contents = serde_json::to_string_pretty(store)
        .map_err(|err| format!("Nao foi possivel serializar inicializacao desabilitada: {err}"))?;
    fs::write(path, contents)
        .map_err(|err| format!("Nao foi possivel gravar inicializacao desabilitada: {err}"))
}

fn disabled_store_path(app: &AppHandle) -> Result<PathBuf, String> {
    let mut dir = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("Nao foi possivel localizar AppData: {err}"))?;
    dir.push("history");
    fs::create_dir_all(&dir)
        .map_err(|err| format!("Nao foi possivel criar historico de inicializacao: {err}"))?;
    dir.push("startup_disabled.json");
    Ok(dir)
}

fn append_startup_event(
    app: &AppHandle,
    level: StartupEventLevel,
    snapshot_id: Option<String>,
    message: &str,
) -> Result<(), String> {
    let path = startup_events_path(app)?;
    let mut history = read_startup_event_history(&path);
    history.events.insert(
        0,
        StartupEvent {
            id: format!("startup-event-{}-{}", now_timestamp(), now_nanos()),
            timestamp: now_timestamp(),
            snapshot_id,
            level,
            message: message.to_string(),
        },
    );
    history.events.truncate(MAX_STARTUP_EVENTS);
    write_startup_event_history(&path, &history)
}

fn startup_events_path(app: &AppHandle) -> Result<PathBuf, String> {
    let mut dir = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("Nao foi possivel localizar AppData: {err}"))?;
    dir.push("history");
    fs::create_dir_all(&dir)
        .map_err(|err| format!("Nao foi possivel criar logs de inicializacao: {err}"))?;
    dir.push("startup_events.json");
    Ok(dir)
}

fn read_startup_event_history(path: &PathBuf) -> StartupEventHistory {
    let Ok(contents) = fs::read_to_string(path) else {
        return StartupEventHistory::default();
    };
    serde_json::from_str(&contents).unwrap_or_default()
}

fn write_startup_event_history(
    path: &PathBuf,
    history: &StartupEventHistory,
) -> Result<(), String> {
    let contents = serde_json::to_string_pretty(history)
        .map_err(|err| format!("Nao foi possivel serializar logs de inicializacao: {err}"))?;
    fs::write(path, contents)
        .map_err(|err| format!("Nao foi possivel gravar logs de inicializacao: {err}"))
}

fn has_fallback_warning(warnings: &[String]) -> bool {
    warnings
        .iter()
        .any(|warning| warning.to_ascii_lowercase().contains("fallback"))
}

fn classify_impact(name: &str, command: &str) -> StartupImpact {
    let haystack = format!("{name} {command}").to_lowercase();

    if contains_any(
        &haystack,
        &[
            "steam",
            "discord",
            "epic",
            "battle.net",
            "battlenet",
            "razer",
            "adobe",
            "teams",
            "launcher",
        ],
    ) {
        StartupImpact::High
    } else if contains_any(
        &haystack,
        &[
            "spotify", "onedrive", "dropbox", "drive", "update", "updater", "office",
        ],
    ) {
        StartupImpact::Medium
    } else {
        StartupImpact::Low
    }
}

fn contains_any(value: &str, patterns: &[&str]) -> bool {
    patterns.iter().any(|pattern| value.contains(pattern))
}

fn impact_rank(impact: &StartupImpact) -> u8 {
    match impact {
        StartupImpact::High => 0,
        StartupImpact::Medium => 1,
        StartupImpact::Low => 2,
    }
}

fn status_rank(status: &StartupStatus) -> u8 {
    match status {
        StartupStatus::Active => 0,
        StartupStatus::Unknown => 1,
        StartupStatus::Disabled => 2,
    }
}

fn fallback_report() -> StartupReport {
    build_report(
        fallback_raw_report(),
        Vec::new(),
        vec!["Fallback local usado porque a leitura real nao respondeu.".to_string()],
    )
}

fn fallback_raw_report() -> RawStartupReport {
    RawStartupReport {
        items: Some(vec![
            fallback_item(
                "Discord",
                "AppData\\Local\\Discord\\Update.exe --processStart Discord.exe",
            ),
            fallback_item("Steam", "C:\\Program Files (x86)\\Steam\\steam.exe"),
            fallback_item("Spotify", "AppData\\Roaming\\Spotify\\Spotify.exe"),
            fallback_item(
                "OneDrive",
                "C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe",
            ),
        ]),
    }
}

fn fallback_item(name: &str, command: &str) -> RawStartupItem {
    RawStartupItem {
        name: Some(name.to_string()),
        command: Some(command.to_string()),
        location: Some("Startup demo somente leitura".to_string()),
        user: Some("Usuario atual".to_string()),
    }
}

fn run_powershell(script: &str) -> Result<String, String> {
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
        .map_err(|err| format!("Nao foi possivel iniciar PowerShell para inicializacao: {err}"))?;
    let started_at = SystemTime::now();

    loop {
        if child
            .try_wait()
            .map_err(|err| format!("Falha ao aguardar PowerShell: {err}"))?
            .is_some()
        {
            break;
        }

        let elapsed = SystemTime::now()
            .duration_since(started_at)
            .unwrap_or_default()
            .as_secs();
        if elapsed >= POWERSHELL_TIMEOUT_SECONDS {
            let _ = child.kill();
            return Err("Tempo limite atingido ao ler programas de inicializacao.".to_string());
        }

        thread::sleep(Duration::from_millis(80));
    }

    let output = child
        .wait_with_output()
        .map_err(|err| format!("Nao foi possivel ler saida do PowerShell: {err}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(format!(
            "PowerShell retornou erro na inicializacao: {stderr}"
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if stdout.is_empty() {
        Err("PowerShell nao retornou dados de inicializacao.".to_string())
    } else {
        Ok(stdout)
    }
}

fn sanitize_id(value: &str) -> String {
    value
        .chars()
        .map(|item| {
            if item.is_ascii_alphanumeric() {
                item.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect::<String>()
        .trim_matches('-')
        .to_string()
}

fn value_or(value: Option<String>, fallback: &str) -> String {
    value
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
        .unwrap_or_else(|| fallback.to_string())
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

const POWERSHELL_STARTUP_SCRIPT: &str = r#"
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$startupItems = @(Get-CimInstance Win32_StartupCommand | Where-Object { $_.Name })
[pscustomobject]@{
  items = @(
    $startupItems | ForEach-Object {
      [pscustomobject]@{
        name = $_.Name
        command = $_.Command
        location = $_.Location
        user = $_.User
      }
    }
  )
} | ConvertTo-Json -Depth 5 -Compress
"#;
