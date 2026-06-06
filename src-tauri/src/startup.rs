use serde::{Deserialize, Serialize};
use std::{
    process::{Command, Stdio},
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

const POWERSHELL_TIMEOUT_SECONDS: u64 = 10;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartupReport {
    pub generated_at: String,
    pub engine_version: String,
    pub read_only: bool,
    pub total_items: usize,
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
    Unknown,
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

pub fn collect_startup_report() -> StartupReport {
    match collect_windows_startup() {
        Ok(raw) => build_report(raw, Vec::new()),
        Err(error) => {
            let mut report = fallback_report();
            report.warnings.push(error);
            report
        }
    }
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

fn build_report(raw: RawStartupReport, warnings: Vec<String>) -> StartupReport {
    let mut items = raw
        .items
        .unwrap_or_default()
        .into_iter()
        .enumerate()
        .map(|(index, item)| build_item(index, item))
        .collect::<Vec<_>>();

    items.sort_by(|a, b| {
        impact_rank(&a.impact)
            .cmp(&impact_rank(&b.impact))
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

    StartupReport {
        generated_at: now_timestamp(),
        engine_version: "startup-engine-readonly-v1".to_string(),
        read_only: true,
        total_items: items.len(),
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

    StartupItem {
        id: format!("startup-{}-{}", index, sanitize_id(&name)),
        name,
        command,
        location,
        user,
        impact,
        status: StartupStatus::Active,
        can_disable_later: true,
    }
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

fn fallback_report() -> StartupReport {
    build_report(
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
        },
        vec!["Fallback local usado porque a leitura real nao respondeu.".to_string()],
    )
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
