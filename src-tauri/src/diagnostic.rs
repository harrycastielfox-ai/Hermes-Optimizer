use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::PathBuf,
    process::{Command, Stdio},
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};

const MAX_DIAGNOSTIC_REPORTS: usize = 20;
const POWERSHELL_TIMEOUT_SECONDS: u64 = 18;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiagnosticReport {
    pub generated_at: String,
    pub engine_version: String,
    pub read_only: bool,
    pub health_score: u8,
    pub health_label: String,
    pub system: SystemInfo,
    pub cpu: CpuInfo,
    pub ram: MemoryInfo,
    pub disk: DiskInfo,
    pub gpu: GpuInfo,
    pub temperature: TemperatureInfo,
    pub defender: DefenderInfo,
    pub windows_update: WindowsUpdateInfo,
    pub startup: StartupInfo,
    pub power_plan: PowerPlanInfo,
    pub temporary_files: TemporaryFilesInfo,
    pub uptime: UptimeInfo,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    pub computer_name: String,
    pub os_name: String,
    pub os_version: String,
    pub os_build: String,
    pub architecture: String,
    pub manufacturer: String,
    pub model: String,
    pub motherboard_manufacturer: String,
    pub motherboard_model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CpuInfo {
    pub name: String,
    pub usage_percent: f32,
    pub physical_cores: u32,
    pub logical_processors: u32,
    pub current_clock_mhz: u32,
    pub max_clock_mhz: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryInfo {
    pub total_gb: f32,
    pub used_gb: f32,
    pub free_gb: f32,
    pub used_percent: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskInfo {
    pub mount: String,
    pub volume_name: String,
    pub physical_name: String,
    pub media_type: String,
    pub health_status: String,
    pub total_gb: f32,
    pub free_gb: f32,
    pub used_gb: f32,
    pub used_percent: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuInfo {
    pub name: String,
    pub driver_version: String,
    pub adapter_ram_gb: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TemperatureInfo {
    pub available: bool,
    pub celsius: Option<f32>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DefenderInfo {
    pub available: bool,
    pub active: bool,
    pub antivirus_enabled: bool,
    pub antispyware_enabled: bool,
    pub realtime_protection_enabled: bool,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowsUpdateInfo {
    pub service_status: String,
    pub last_hotfix_id: String,
    pub last_installed_on: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartupInfo {
    pub total_items: u32,
    pub high_impact_count: u32,
    pub medium_impact_count: u32,
    pub low_impact_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PowerPlanInfo {
    pub active_scheme_name: String,
    pub active_scheme_guid: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TemporaryFilesInfo {
    pub estimated_gb: f32,
    pub estimated_bytes: u64,
    pub scanned_locations: Vec<String>,
    pub available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UptimeInfo {
    pub seconds: u64,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct DiagnosticHistory {
    reports: Vec<DiagnosticReport>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawDiagnostic {
    computer_name: Option<String>,
    os_name: Option<String>,
    os_version: Option<String>,
    os_build: Option<String>,
    architecture: Option<String>,
    manufacturer: Option<String>,
    model: Option<String>,
    motherboard_manufacturer: Option<String>,
    motherboard_model: Option<String>,
    uptime_seconds: Option<f64>,
    cpu_name: Option<String>,
    cpu_usage_percent: Option<f64>,
    cpu_cores: Option<f64>,
    logical_processors: Option<f64>,
    cpu_current_clock_mhz: Option<f64>,
    cpu_max_clock_mhz: Option<f64>,
    ram_total_kb: Option<f64>,
    ram_free_kb: Option<f64>,
    disk_mount: Option<String>,
    disk_volume_name: Option<String>,
    disk_total_bytes: Option<f64>,
    disk_free_bytes: Option<f64>,
    physical_disk_name: Option<String>,
    physical_disk_media_type: Option<String>,
    physical_disk_health_status: Option<String>,
    gpu_name: Option<String>,
    gpu_driver_version: Option<String>,
    gpu_adapter_ram_bytes: Option<f64>,
    temperature_celsius: Option<f64>,
    defender_available: Option<bool>,
    defender_antivirus_enabled: Option<bool>,
    defender_antispyware_enabled: Option<bool>,
    defender_realtime_protection_enabled: Option<bool>,
    windows_update_service_status: Option<String>,
    last_hotfix_id: Option<String>,
    last_installed_on: Option<String>,
    startup_items_count: Option<f64>,
    startup_high_impact_count: Option<f64>,
    startup_medium_impact_count: Option<f64>,
    startup_low_impact_count: Option<f64>,
    power_plan_name: Option<String>,
    power_plan_guid: Option<String>,
    temporary_files_bytes: Option<f64>,
    temporary_scan_locations: Option<Vec<String>>,
}

#[tauri::command]
pub async fn diagnostic_engine_read(app: AppHandle) -> Result<DiagnosticReport, String> {
    tauri::async_runtime::spawn_blocking(move || diagnostic_engine_read_blocking(app))
        .await
        .map_err(|err| format!("Falha ao executar diagnostico em segundo plano: {err}"))?
}

fn diagnostic_engine_read_blocking(app: AppHandle) -> Result<DiagnosticReport, String> {
    let report = collect_diagnostic_report();
    let history_path = diagnostic_history_path(&app)?;
    let mut history = read_history(&history_path);

    history.reports.insert(0, report.clone());
    history.reports.truncate(MAX_DIAGNOSTIC_REPORTS);
    write_history(&history_path, &history)?;

    Ok(report)
}

pub fn collect_diagnostic_report() -> DiagnosticReport {
    match collect_windows_diagnostic() {
        Ok(raw) => build_report(raw, Vec::new()),
        Err(error) => {
            let mut report = fallback_report();
            report.warnings.push(error);
            report
        }
    }
}

fn collect_windows_diagnostic() -> Result<RawDiagnostic, String> {
    if !cfg!(target_os = "windows") {
        return Err(
            "Diagnostic Engine Real usa APIs do Windows e esta plataforma nao e Windows."
                .to_string(),
        );
    }

    let stdout = run_powershell(POWERSHELL_DIAGNOSTIC_SCRIPT)?;
    serde_json::from_str::<RawDiagnostic>(&stdout)
        .map_err(|err| format!("Nao foi possivel interpretar diagnostico real: {err}"))
}

fn build_report(raw: RawDiagnostic, mut warnings: Vec<String>) -> DiagnosticReport {
    let ram_total_gb = kb_to_gb(raw.ram_total_kb.unwrap_or_default());
    let ram_free_gb = kb_to_gb(raw.ram_free_kb.unwrap_or_default());
    let ram_used_gb = (ram_total_gb - ram_free_gb).max(0.0);
    let ram_used_percent = percent(ram_used_gb, ram_total_gb);

    let disk_total_gb = bytes_to_gb(raw.disk_total_bytes.unwrap_or_default());
    let disk_free_gb = bytes_to_gb(raw.disk_free_bytes.unwrap_or_default());
    let disk_used_gb = (disk_total_gb - disk_free_gb).max(0.0);
    let disk_used_percent = percent(disk_used_gb, disk_total_gb);

    let temperature_celsius = raw.temperature_celsius.map(|value| round1(value as f32));
    if temperature_celsius.is_none() {
        warnings.push("Temperatura nao disponivel neste PC via sensor WMI padrao.".to_string());
    }

    let defender_available = raw.defender_available.unwrap_or(false);
    let defender_antivirus_enabled = raw.defender_antivirus_enabled.unwrap_or(false);
    let defender_antispyware_enabled = raw.defender_antispyware_enabled.unwrap_or(false);
    let defender_realtime_protection_enabled =
        raw.defender_realtime_protection_enabled.unwrap_or(false);
    let defender_active = defender_available
        && defender_antivirus_enabled
        && defender_antispyware_enabled
        && defender_realtime_protection_enabled;

    let windows_update_service_status = value_or(raw.windows_update_service_status, "Desconhecido");
    let startup_total = to_u32(raw.startup_items_count);
    let startup_high = to_u32(raw.startup_high_impact_count);
    let startup_medium = to_u32(raw.startup_medium_impact_count);
    let startup_low = to_u32(raw.startup_low_impact_count);
    let power_plan_name = value_or(raw.power_plan_name, "Desconhecido");
    let power_plan_guid = value_or(raw.power_plan_guid, "Nao identificado");
    let temporary_files_bytes = raw.temporary_files_bytes.unwrap_or_default().max(0.0) as u64;
    let temporary_scan_locations = raw.temporary_scan_locations.unwrap_or_default();
    let uptime_seconds = raw.uptime_seconds.unwrap_or_default().max(0.0) as u64;

    let cpu_usage = round1(raw.cpu_usage_percent.unwrap_or_default() as f32).clamp(0.0, 100.0);
    let health_score = calculate_health_score(
        cpu_usage,
        ram_used_percent,
        disk_used_percent,
        disk_free_gb,
        disk_total_gb,
        defender_active,
        &windows_update_service_status,
        startup_total,
        temperature_celsius,
    );

    DiagnosticReport {
        generated_at: now_timestamp(),
        engine_version: "diagnostic-engine-real-readonly-v1".to_string(),
        read_only: true,
        health_score,
        health_label: health_label(health_score).to_string(),
        system: SystemInfo {
            computer_name: value_or(raw.computer_name, "Desconhecido"),
            os_name: value_or(raw.os_name, "Windows"),
            os_version: value_or(raw.os_version, "Desconhecida"),
            os_build: value_or(raw.os_build, "Desconhecida"),
            architecture: value_or(raw.architecture, "Desconhecida"),
            manufacturer: value_or(raw.manufacturer, "Desconhecido"),
            model: value_or(raw.model, "Desconhecido"),
            motherboard_manufacturer: value_or(raw.motherboard_manufacturer, "Desconhecido"),
            motherboard_model: value_or(raw.motherboard_model, "Desconhecido"),
        },
        cpu: CpuInfo {
            name: value_or(raw.cpu_name, "CPU"),
            usage_percent: cpu_usage,
            physical_cores: to_u32(raw.cpu_cores),
            logical_processors: to_u32(raw.logical_processors),
            current_clock_mhz: to_u32(raw.cpu_current_clock_mhz),
            max_clock_mhz: to_u32(raw.cpu_max_clock_mhz),
        },
        ram: MemoryInfo {
            total_gb: round1(ram_total_gb),
            used_gb: round1(ram_used_gb),
            free_gb: round1(ram_free_gb),
            used_percent: round1(ram_used_percent),
        },
        disk: DiskInfo {
            mount: value_or(raw.disk_mount, "C:"),
            volume_name: value_or(raw.disk_volume_name, "Disco principal"),
            physical_name: value_or(raw.physical_disk_name, "Disco"),
            media_type: normalize_media_type(raw.physical_disk_media_type),
            health_status: normalize_health_status(raw.physical_disk_health_status),
            total_gb: round1(disk_total_gb),
            free_gb: round1(disk_free_gb),
            used_gb: round1(disk_used_gb),
            used_percent: round1(disk_used_percent),
        },
        gpu: GpuInfo {
            name: value_or(raw.gpu_name, "GPU nao identificada"),
            driver_version: value_or(raw.gpu_driver_version, "Driver nao identificado"),
            adapter_ram_gb: raw
                .gpu_adapter_ram_bytes
                .map(|bytes| round1(bytes_to_gb(bytes))),
        },
        temperature: TemperatureInfo {
            available: temperature_celsius.is_some(),
            celsius: temperature_celsius,
            status: temperature_status(temperature_celsius).to_string(),
        },
        defender: DefenderInfo {
            available: defender_available,
            active: defender_active,
            antivirus_enabled: defender_antivirus_enabled,
            antispyware_enabled: defender_antispyware_enabled,
            realtime_protection_enabled: defender_realtime_protection_enabled,
            status: if defender_active { "Ativo" } else { "Atencao" }.to_string(),
        },
        windows_update: WindowsUpdateInfo {
            service_status: windows_update_service_status.clone(),
            last_hotfix_id: value_or(raw.last_hotfix_id, "Nao identificado"),
            last_installed_on: value_or(raw.last_installed_on, "Nao identificado"),
            status: windows_update_status(&windows_update_service_status).to_string(),
        },
        startup: StartupInfo {
            total_items: startup_total,
            high_impact_count: startup_high,
            medium_impact_count: startup_medium,
            low_impact_count: startup_low,
        },
        power_plan: PowerPlanInfo {
            status: power_plan_status(&power_plan_name).to_string(),
            active_scheme_name: power_plan_name,
            active_scheme_guid: power_plan_guid,
        },
        temporary_files: TemporaryFilesInfo {
            estimated_gb: round1(bytes_to_gb(temporary_files_bytes as f64)),
            estimated_bytes: temporary_files_bytes,
            scanned_locations: temporary_scan_locations,
            available: true,
        },
        uptime: UptimeInfo {
            seconds: uptime_seconds,
            label: uptime_label(uptime_seconds),
        },
        warnings,
    }
}

fn fallback_report() -> DiagnosticReport {
    build_report(
        RawDiagnostic {
            computer_name: Some("DRT".to_string()),
            os_name: Some("Windows 11 Home Single Language".to_string()),
            os_version: Some("10.0.26200".to_string()),
            os_build: Some("26200".to_string()),
            architecture: Some("64 bits".to_string()),
            manufacturer: Some("LENOVO".to_string()),
            model: Some("LNVNB161216".to_string()),
            motherboard_manufacturer: Some("LENOVO".to_string()),
            motherboard_model: Some("LNVNB161216".to_string()),
            uptime_seconds: Some(9_240.0),
            cpu_name: Some("Intel Core i5-1235U".to_string()),
            cpu_usage_percent: Some(23.0),
            cpu_cores: Some(10.0),
            logical_processors: Some(12.0),
            cpu_current_clock_mhz: Some(1300.0),
            cpu_max_clock_mhz: Some(1300.0),
            ram_total_kb: Some(15.7 * 1024.0 * 1024.0),
            ram_free_kb: Some(7.4 * 1024.0 * 1024.0),
            disk_mount: Some("C:".to_string()),
            disk_volume_name: Some("Disco principal".to_string()),
            disk_total_bytes: Some(456.0 * 1024.0 * 1024.0 * 1024.0),
            disk_free_bytes: Some(235.0 * 1024.0 * 1024.0 * 1024.0),
            physical_disk_name: Some("NVMe KBG40ZNS512G".to_string()),
            physical_disk_media_type: Some("SSD".to_string()),
            physical_disk_health_status: Some("Healthy".to_string()),
            gpu_name: Some("Intel Iris Xe Graphics".to_string()),
            gpu_driver_version: Some("31.0.101.5445".to_string()),
            gpu_adapter_ram_bytes: None,
            temperature_celsius: None,
            defender_available: Some(true),
            defender_antivirus_enabled: Some(true),
            defender_antispyware_enabled: Some(true),
            defender_realtime_protection_enabled: Some(true),
            windows_update_service_status: Some("Running".to_string()),
            last_hotfix_id: Some("Nao identificado".to_string()),
            last_installed_on: Some("Nao identificado".to_string()),
            startup_items_count: Some(17.0),
            startup_high_impact_count: Some(2.0),
            startup_medium_impact_count: Some(8.0),
            startup_low_impact_count: Some(7.0),
            power_plan_name: Some("Equilibrado".to_string()),
            power_plan_guid: Some("381b4222-f694-41f0-9685-ff5bb260df2e".to_string()),
            temporary_files_bytes: Some(4.2 * 1024.0 * 1024.0 * 1024.0),
            temporary_scan_locations: Some(vec![
                "%TEMP%".to_string(),
                "C:\\Windows\\Temp".to_string(),
            ]),
        },
        vec!["Fallback estatico usado porque a coleta real nao respondeu.".to_string()],
    )
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
        .map_err(|err| format!("Nao foi possivel iniciar PowerShell para diagnostico: {err}"))?;
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
            return Err("Tempo limite atingido ao coletar diagnostico real.".to_string());
        }

        thread::sleep(Duration::from_millis(80));
    }

    let output = child
        .wait_with_output()
        .map_err(|err| format!("Nao foi possivel ler saida do PowerShell: {err}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(format!("PowerShell retornou erro no diagnostico: {stderr}"));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if stdout.is_empty() {
        Err("PowerShell nao retornou dados de diagnostico.".to_string())
    } else {
        Ok(stdout)
    }
}

fn diagnostic_history_path(app: &AppHandle) -> Result<PathBuf, String> {
    let mut dir = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("Nao foi possivel localizar AppData: {err}"))?;
    dir.push("history");
    fs::create_dir_all(&dir)
        .map_err(|err| format!("Nao foi possivel criar historico local: {err}"))?;
    dir.push("diagnostic_reports.json");
    Ok(dir)
}

fn read_history(path: &PathBuf) -> DiagnosticHistory {
    let Ok(contents) = fs::read_to_string(path) else {
        return DiagnosticHistory::default();
    };
    serde_json::from_str(&contents).unwrap_or_default()
}

fn write_history(path: &PathBuf, history: &DiagnosticHistory) -> Result<(), String> {
    let contents = serde_json::to_string_pretty(history)
        .map_err(|err| format!("Nao foi possivel serializar historico de diagnostico: {err}"))?;
    fs::write(path, contents)
        .map_err(|err| format!("Nao foi possivel gravar historico de diagnostico: {err}"))
}

fn calculate_health_score(
    cpu_usage: f32,
    ram_used_percent: f32,
    disk_used_percent: f32,
    disk_free_gb: f32,
    disk_total_gb: f32,
    defender_active: bool,
    windows_update_service_status: &str,
    startup_total: u32,
    temperature_celsius: Option<f32>,
) -> u8 {
    let mut score: i32 = 100;

    if cpu_usage >= 85.0 {
        score -= 12;
    } else if cpu_usage >= 65.0 {
        score -= 6;
    }

    if ram_used_percent >= 85.0 {
        score -= 12;
    } else if ram_used_percent >= 70.0 {
        score -= 6;
    }

    let disk_free_percent = 100.0 - disk_used_percent;
    if disk_total_gb > 0.0 && disk_free_percent < 10.0 {
        score -= 18;
    } else if disk_total_gb > 0.0 && disk_free_percent < 20.0 {
        score -= 8;
    }
    if disk_free_gb < 20.0 && disk_total_gb > 0.0 {
        score -= 6;
    }

    if !defender_active {
        score -= 18;
    }

    if !windows_update_service_status.eq_ignore_ascii_case("running") {
        score -= 5;
    }

    if startup_total >= 30 {
        score -= 10;
    } else if startup_total >= 15 {
        score -= 5;
    }

    if let Some(temp) = temperature_celsius {
        if temp >= 85.0 {
            score -= 12;
        } else if temp >= 75.0 {
            score -= 6;
        }
    }

    score.clamp(0, 100) as u8
}

fn health_label(score: u8) -> &'static str {
    if score >= 90 {
        "Excelente"
    } else if score >= 75 {
        "Bom"
    } else if score >= 55 {
        "Atencao"
    } else {
        "Critico"
    }
}

fn windows_update_status(service_status: &str) -> &'static str {
    if service_status.eq_ignore_ascii_case("running") {
        "Em dia"
    } else {
        "Verificar"
    }
}

fn power_plan_status(plan_name: &str) -> &'static str {
    let normalized = plan_name.to_lowercase();
    if normalized.contains("alto") || normalized.contains("high") || normalized.contains("ultimate")
    {
        "Desempenho"
    } else if normalized.contains("econom") || normalized.contains("power saver") {
        "Economia"
    } else if normalized.contains("equilibr") || normalized.contains("balanced") {
        "Equilibrado"
    } else {
        "Verificar"
    }
}

fn temperature_status(celsius: Option<f32>) -> &'static str {
    match celsius {
        Some(value) if value >= 85.0 => "Alta",
        Some(value) if value >= 75.0 => "Elevada",
        Some(_) => "Normal",
        None => "Indisponivel",
    }
}

fn normalize_media_type(value: Option<String>) -> String {
    let value = value_or(value, "Desconhecido");
    if value.eq_ignore_ascii_case("unspecified") || value == "0" {
        "Desconhecido".to_string()
    } else {
        value
    }
}

fn normalize_health_status(value: Option<String>) -> String {
    let value = value_or(value, "Desconhecido");
    if value.eq_ignore_ascii_case("healthy") {
        "Saudavel".to_string()
    } else {
        value
    }
}

fn uptime_label(seconds: u64) -> String {
    let days = seconds / 86_400;
    let hours = (seconds % 86_400) / 3_600;
    let minutes = (seconds % 3_600) / 60;

    if days > 0 {
        format!("{days}d {hours}h")
    } else {
        format!("{hours}h {minutes}m")
    }
}

fn kb_to_gb(value: f64) -> f32 {
    (value / 1024.0 / 1024.0) as f32
}

fn bytes_to_gb(value: f64) -> f32 {
    (value / 1024.0 / 1024.0 / 1024.0) as f32
}

fn percent(value: f32, total: f32) -> f32 {
    if total <= 0.0 {
        0.0
    } else {
        ((value / total) * 100.0).clamp(0.0, 100.0)
    }
}

fn round1(value: f32) -> f32 {
    (value * 10.0).round() / 10.0
}

fn to_u32(value: Option<f64>) -> u32 {
    value.unwrap_or_default().max(0.0).round() as u32
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

const POWERSHELL_DIAGNOSTIC_SCRIPT: &str = r#"
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$os = Get-CimInstance Win32_OperatingSystem
$computer = Get-CimInstance Win32_ComputerSystem
$baseBoard = Get-CimInstance Win32_BaseBoard
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$logicalDisk = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DeviceID -eq 'C:' } | Select-Object -First 1
$physicalDisk = Get-PhysicalDisk | Select-Object -First 1
$gpu = Get-CimInstance Win32_VideoController | Where-Object { $_.Name } | Select-Object -First 1
$thermal = Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature | Select-Object -First 1
$temperatureCelsius = $null
if ($thermal -and $thermal.CurrentTemperature) {
  $temperatureCelsius = [math]::Round(($thermal.CurrentTemperature - 2732) / 10, 1)
}
$defender = Get-MpComputerStatus
$updateService = Get-Service wuauserv
$hotfix = Get-CimInstance Win32_QuickFixEngineering | Sort-Object InstalledOn -Descending | Select-Object -First 1
$startupItems = @(Get-CimInstance Win32_StartupCommand)
$highPattern = 'steam|discord|teams|spotify|onedrive|adobe|razer|epic|battle|launcher|update|updater'
$highImpact = @($startupItems | Where-Object { ($_.Name + ' ' + $_.Command) -match $highPattern }).Count
$mediumImpact = [math]::Max(0, [math]::Min(($startupItems.Count - $highImpact), [math]::Floor($startupItems.Count / 2)))
$lowImpact = [math]::Max(0, $startupItems.Count - $highImpact - $mediumImpact)
$powerPlanRaw = [string](powercfg /GETACTIVESCHEME)
$powerPlanGuid = $null
$powerPlanName = $null
if ($powerPlanRaw -match '([a-fA-F0-9-]{36})') {
  $powerPlanGuid = $Matches[1]
}
if ($powerPlanRaw -match '\((.*?)\)') {
  $powerPlanName = $Matches[1]
} elseif ($powerPlanRaw) {
  $powerPlanName = $powerPlanRaw.Trim()
}
function Get-HermesFolderSizeBytes($path) {
  if (-not $path -or -not (Test-Path -LiteralPath $path)) { return 0 }
  try {
    $size = (Get-ChildItem -LiteralPath $path -Recurse -Force -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    if ($null -eq $size) { return 0 }
    return [double]$size
  } catch {
    return 0
  }
}
$tempPaths = @($env:TEMP, (Join-Path $env:WINDIR 'Temp')) | Where-Object { $_ } | Sort-Object -Unique
$temporaryFilesBytes = 0
foreach ($tempPath in $tempPaths) {
  $temporaryFilesBytes += [double](Get-HermesFolderSizeBytes $tempPath)
}
$uptimeSeconds = $null
if ($os.LastBootUpTime) {
  $uptimeSeconds = [math]::Round(((Get-Date) - $os.LastBootUpTime).TotalSeconds)
}
[pscustomobject]@{
  computerName = $env:COMPUTERNAME
  osName = $os.Caption
  osVersion = $os.Version
  osBuild = $os.BuildNumber
  architecture = $os.OSArchitecture
  manufacturer = $computer.Manufacturer
  model = $computer.Model
  motherboardManufacturer = $baseBoard.Manufacturer
  motherboardModel = $baseBoard.Product
  uptimeSeconds = $uptimeSeconds
  cpuName = $cpu.Name
  cpuUsagePercent = $cpu.LoadPercentage
  cpuCores = $cpu.NumberOfCores
  logicalProcessors = $cpu.NumberOfLogicalProcessors
  cpuCurrentClockMhz = $cpu.CurrentClockSpeed
  cpuMaxClockMhz = $cpu.MaxClockSpeed
  ramTotalKb = $os.TotalVisibleMemorySize
  ramFreeKb = $os.FreePhysicalMemory
  diskMount = $logicalDisk.DeviceID
  diskVolumeName = $logicalDisk.VolumeName
  diskTotalBytes = $logicalDisk.Size
  diskFreeBytes = $logicalDisk.FreeSpace
  physicalDiskName = $physicalDisk.FriendlyName
  physicalDiskMediaType = [string]$physicalDisk.MediaType
  physicalDiskHealthStatus = [string]$physicalDisk.HealthStatus
  gpuName = $gpu.Name
  gpuDriverVersion = $gpu.DriverVersion
  gpuAdapterRamBytes = $gpu.AdapterRAM
  temperatureCelsius = $temperatureCelsius
  defenderAvailable = [bool]($defender -ne $null)
  defenderAntivirusEnabled = [bool]$defender.AntivirusEnabled
  defenderAntispywareEnabled = [bool]$defender.AntispywareEnabled
  defenderRealtimeProtectionEnabled = [bool]$defender.RealTimeProtectionEnabled
  windowsUpdateServiceStatus = [string]$updateService.Status
  lastHotfixId = $hotfix.HotFixID
  lastInstalledOn = if ($hotfix.InstalledOn) { [string]$hotfix.InstalledOn } else { $null }
  startupItemsCount = $startupItems.Count
  startupHighImpactCount = $highImpact
  startupMediumImpactCount = $mediumImpact
  startupLowImpactCount = $lowImpact
  powerPlanName = $powerPlanName
  powerPlanGuid = $powerPlanGuid
  temporaryFilesBytes = $temporaryFilesBytes
  temporaryScanLocations = @($tempPaths)
} | ConvertTo-Json -Depth 5 -Compress
"#;
