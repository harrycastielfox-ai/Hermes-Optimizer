use serde::Serialize;
use serde_json::Value;
use std::collections::HashSet;
use std::process::Command;

#[derive(Clone, Serialize)]
pub struct StartupApp {
    id: String,
    name: String,
    publisher: String,
    path: String,
    impact: String,
    enabled: bool,
    status: String,
    origin: String,
    risk: String,
    suggested_action: String,
}

#[tauri::command]
pub fn list_startup_apps() -> Vec<StartupApp> {
    read_startup_apps()
}

pub fn read_startup_apps() -> Vec<StartupApp> {
    #[cfg(target_os = "windows")]
    {
        if let Some(items) = read_windows_startup_apps() {
            return items;
        }
    }
    Vec::new()
}

#[cfg(target_os = "windows")]
fn read_windows_startup_apps() -> Option<Vec<StartupApp>> {
    let script = r#"
$items = @()
$runKeys = @(
  @{ path='HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'; origin='Registro HKCU Run' },
  @{ path='HKLM:\Software\Microsoft\Windows\CurrentVersion\Run'; origin='Registro HKLM Run' },
  @{ path='HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Run'; origin='Registro HKLM WOW6432 Run' }
)
foreach ($key in $runKeys) {
  if (Test-Path $key.path) {
    $props = Get-ItemProperty -Path $key.path
    foreach ($prop in $props.PSObject.Properties) {
      if ($prop.Name -notmatch '^PS') {
        $items += [pscustomobject]@{ name=[string]$prop.Name; path=[string]$prop.Value; status='Ativo'; origin=$key.origin; enabled=$true }
      }
    }
  }
}
$startupFolders = @(
  @{ path=[Environment]::GetFolderPath('Startup'); origin='Pasta Inicializar do usuário' },
  @{ path=[Environment]::GetFolderPath('CommonStartup'); origin='Pasta Inicializar pública' }
)
foreach ($folder in $startupFolders) {
  if ($folder.path -and (Test-Path $folder.path)) {
    Get-ChildItem -Path $folder.path -File -ErrorAction SilentlyContinue | ForEach-Object {
      $items += [pscustomobject]@{ name=[string]$_.BaseName; path=[string]$_.FullName; status='Ativo'; origin=$folder.origin; enabled=$true }
    }
  }
}
$items | Sort-Object origin,name | ConvertTo-Json -Depth 4 -Compress
"#;
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            script,
        ])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let value: Value = serde_json::from_slice(&output.stdout).ok()?;
    let values = if value.is_array() {
        value.as_array().cloned().unwrap_or_default()
    } else if value.is_null() {
        Vec::new()
    } else {
        vec![value]
    };
    Some(startup_from_json(values))
}

#[cfg(target_os = "windows")]
fn startup_from_json(values: Vec<Value>) -> Vec<StartupApp> {
    let mut seen = HashSet::new();
    values
        .into_iter()
        .filter_map(|value| {
            let name = json_string(&value, "name", "Item sem nome");
            let path = json_string(&value, "path", "Caminho não informado");
            let origin = json_string(&value, "origin", "Origem não informada");
            let key = format!("{}|{}|{}", name.to_lowercase(), path.to_lowercase(), origin.to_lowercase());
            if !seen.insert(key) {
                return None;
            }
            let impact = classify_impact(&path);
            Some(StartupApp {
                id: stable_id(&name, &origin),
                name,
                publisher: "Detectado pelo Windows".into(),
                path,
                impact: impact.into(),
                enabled: value["enabled"].as_bool().unwrap_or(true),
                status: json_string(&value, "status", "Ativo"),
                origin,
                risk: if impact == "high" { "medium" } else { "low" }.into(),
                suggested_action: "Somente leitura nesta fase: revise manualmente antes de qualquer alteração futura.".into(),
            })
        })
        .collect()
}

#[cfg(target_os = "windows")]
fn json_string(value: &Value, key: &str, fallback: &str) -> String {
    value[key].as_str().unwrap_or(fallback).trim().to_string()
}

#[cfg(target_os = "windows")]
fn stable_id(name: &str, origin: &str) -> String {
    format!("{}-{}", sanitize(name), sanitize(origin))
}

#[cfg(target_os = "windows")]
fn sanitize(value: &str) -> String {
    value
        .chars()
        .filter_map(|char| {
            if char.is_ascii_alphanumeric() {
                Some(char.to_ascii_lowercase())
            } else if char.is_whitespace() || char == '-' || char == '_' {
                Some('-')
            } else {
                None
            }
        })
        .collect::<String>()
        .trim_matches('-')
        .to_string()
}

#[cfg(target_os = "windows")]
fn classify_impact(path: &str) -> &'static str {
    let lowered = path.to_lowercase();
    if lowered.contains("update") || lowered.contains("sync") || lowered.contains("launcher") {
        "medium"
    } else {
        "low"
    }
}
