use serde::Serialize;
use std::{
    path::PathBuf,
    process::{Command, Stdio},
};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemSecurityContext {
    pub is_windows: bool,
    pub is_elevated: bool,
    pub username: Option<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemAdminRelaunchResult {
    pub attempted: bool,
    pub already_elevated: bool,
    pub executable_path: Option<String>,
    pub message: String,
}

#[tauri::command]
pub fn system_security_context_read() -> SystemSecurityContext {
    if !cfg!(target_os = "windows") {
        return SystemSecurityContext {
            is_windows: false,
            is_elevated: false,
            username: None,
            warnings: vec!["Contexto de administrador disponivel apenas no Windows.".to_string()],
        };
    }

    match read_windows_security_context() {
        Ok(context) => context,
        Err(error) => SystemSecurityContext {
            is_windows: true,
            is_elevated: false,
            username: None,
            warnings: vec![error],
        },
    }
}

#[tauri::command]
pub fn system_relaunch_as_admin() -> SystemAdminRelaunchResult {
    if !cfg!(target_os = "windows") {
        return SystemAdminRelaunchResult {
            attempted: false,
            already_elevated: false,
            executable_path: None,
            message: "Modo administrador real esta disponivel apenas no Windows.".to_string(),
        };
    }

    if read_windows_security_context()
        .map(|context| context.is_elevated)
        .unwrap_or(false)
    {
        return SystemAdminRelaunchResult {
            attempted: false,
            already_elevated: true,
            executable_path: current_executable_string().ok(),
            message: "Hermes ja esta aberto como administrador.".to_string(),
        };
    }

    match relaunch_current_executable_as_admin() {
        Ok(executable_path) => SystemAdminRelaunchResult {
            attempted: true,
            already_elevated: false,
            executable_path: Some(executable_path),
            message: "Pedido de administrador enviado. Confirme o UAC para abrir o Hermes elevado."
                .to_string(),
        },
        Err(error) => SystemAdminRelaunchResult {
            attempted: false,
            already_elevated: false,
            executable_path: current_executable_string().ok(),
            message: error,
        },
    }
}

fn read_windows_security_context() -> Result<SystemSecurityContext, String> {
    let script = r#"
$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
[pscustomobject]@{
  isElevated = $isAdmin
  username = $identity.Name
} | ConvertTo-Json -Compress
"#;

    let mut command = Command::new("powershell");
    command
        .args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            script,
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }

    let child = command
        .spawn()
        .map_err(|error| format!("Nao foi possivel ler contexto do Windows: {error}"))?;
    let output = child
        .wait_with_output()
        .map_err(|error| format!("Falha lendo contexto do Windows: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            "PowerShell retornou erro ao detectar administrador.".to_string()
        } else {
            stderr
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let value = serde_json::from_str::<serde_json::Value>(&stdout)
        .map_err(|error| format!("Contexto do Windows veio em formato invalido: {error}"))?;

    Ok(SystemSecurityContext {
        is_windows: true,
        is_elevated: value
            .get("isElevated")
            .and_then(|item| item.as_bool())
            .unwrap_or(false),
        username: value
            .get("username")
            .and_then(|item| item.as_str())
            .map(|item| item.to_string()),
        warnings: Vec::new(),
    })
}

fn relaunch_current_executable_as_admin() -> Result<String, String> {
    let executable = current_executable_path()?;
    let executable_path = executable.to_string_lossy().replace('/', "\\");
    if !is_allowed_hermes_executable_path(&executable_path) {
        return Err("Relancamento elevado bloqueado: executavel atual nao e o Hermes.".to_string());
    }

    let working_directory = executable
        .parent()
        .map(|path| path.to_string_lossy().replace('/', "\\"))
        .unwrap_or_else(|| ".".to_string());
    let exe_arg = ps_escape(&executable_path);
    let cwd_arg = ps_escape(&working_directory);
    let script = format!(
        "$ErrorActionPreference = 'Stop'; $exe = '{exe_arg}'; $cwd = '{cwd_arg}'; if (!(Test-Path -LiteralPath $exe)) {{ throw 'Executavel Hermes nao encontrado' }}; Start-Process -FilePath $exe -WorkingDirectory $cwd -Verb RunAs; 'ok'"
    );

    run_hidden_powershell(&script).map(|_| executable_path)
}

fn current_executable_path() -> Result<PathBuf, String> {
    std::env::current_exe()
        .map_err(|error| format!("Nao foi possivel localizar o executavel Hermes: {error}"))
}

fn current_executable_string() -> Result<String, String> {
    Ok(current_executable_path()?
        .to_string_lossy()
        .replace('/', "\\"))
}

fn is_allowed_hermes_executable_path(path: &str) -> bool {
    let normalized = path.trim().replace('/', "\\").to_ascii_lowercase();
    let bytes = normalized.as_bytes();
    normalized.ends_with("\\hermes-optimizer.exe")
        && bytes.len() > "\\hermes-optimizer.exe".len() + 3
        && bytes.get(1) == Some(&b':')
        && bytes.get(2) == Some(&b'\\')
}

fn run_hidden_powershell(script: &str) -> Result<String, String> {
    let mut command = Command::new("powershell");
    command
        .args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            script,
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }

    let child = command
        .spawn()
        .map_err(|error| format!("Nao foi possivel iniciar PowerShell administrativo: {error}"))?;
    let output = child
        .wait_with_output()
        .map_err(|error| format!("Falha ao solicitar administrador: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            "Windows recusou ou cancelou o pedido de administrador.".to_string()
        } else {
            stderr
        });
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn ps_escape(value: &str) -> String {
    value.replace('\'', "''")
}
