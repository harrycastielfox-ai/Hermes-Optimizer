use serde::Serialize;
use serde_json::Value;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

use super::startup::read_startup_apps;

#[derive(Clone, Serialize)]
pub struct OsInfo {
    computer_name: String,
    name: String,
    version: String,
    build: String,
    architecture: String,
    uptime_seconds: u64,
}

#[derive(Clone, Serialize)]
pub struct CpuInfo {
    name: String,
    frequency_mhz: u64,
    cores: u32,
    threads: u32,
    usage_percent: u8,
}

#[derive(Clone, Serialize)]
pub struct MemoryInfo {
    total_bytes: u64,
    used_bytes: u64,
    free_bytes: u64,
    usage_percent: u8,
}

#[derive(Clone, Serialize)]
pub struct DiskInfo {
    name: String,
    model: String,
    total_bytes: u64,
    used_bytes: u64,
    free_bytes: u64,
    usage_percent: u8,
    is_primary: bool,
}

#[derive(Clone, Serialize)]
pub struct HardwareInfo {
    os: OsInfo,
    cpu: CpuInfo,
    memory: MemoryInfo,
    disks: Vec<DiskInfo>,
    gpu_ready: bool,
    data_source: String,
}

#[derive(Serialize)]
pub struct SystemOverview {
    status: String,
    cpu_usage: u8,
    ram_usage: u8,
    disk_usage: u8,
    free_space_gb: u64,
    temp_files_estimate_mb: u32,
    performance_mode: String,
    last_diagnostic: String,
    computer_name: String,
    operating_system: String,
    windows_version: String,
    architecture: String,
    uptime_seconds: u64,
    cpu_name: String,
    cpu_cores: u32,
    ram_total_gb: f64,
    ram_used_gb: f64,
    ram_free_gb: f64,
    disk_name: String,
    disk_total_gb: f64,
    disk_used_gb: f64,
    disk_free_gb: f64,
    health_score: u8,
    health_label: String,
}

#[derive(Clone, Serialize)]
pub struct DiagnosticResult {
    id: String,
    title: String,
    status: String,
    value: String,
    description: String,
    recommendation: String,
    penalty: u8,
}

#[derive(Serialize)]
pub struct HealthScore {
    score: u8,
    label: String,
    reasons: Vec<String>,
}

#[derive(Serialize)]
pub struct DiagnosticReport {
    summary: String,
    health: HealthScore,
    problems: Vec<DiagnosticResult>,
    recommendations: Vec<String>,
}

#[tauri::command]
pub fn get_system_overview() -> SystemOverview {
    let hardware = collect_hardware_info();
    let startup_count = read_startup_apps().len();
    let diagnostics = build_diagnostics(&hardware, startup_count);
    let health = calculate_health(&hardware, startup_count, &diagnostics);
    let disk = primary_disk(&hardware);

    SystemOverview {
        status: status_from_score(health.score).into(),
        cpu_usage: hardware.cpu.usage_percent,
        ram_usage: hardware.memory.usage_percent,
        disk_usage: disk.usage_percent,
        free_space_gb: bytes_to_gb_u64(disk.free_bytes),
        temp_files_estimate_mb: 0,
        performance_mode: "Somente diagnóstico".into(),
        last_diagnostic: "Agora".into(),
        computer_name: hardware.os.computer_name,
        operating_system: hardware.os.name,
        windows_version: format!("{} (build {})", hardware.os.version, hardware.os.build),
        architecture: hardware.os.architecture,
        uptime_seconds: hardware.os.uptime_seconds,
        cpu_name: hardware.cpu.name,
        cpu_cores: hardware.cpu.cores,
        ram_total_gb: bytes_to_gb(hardware.memory.total_bytes),
        ram_used_gb: bytes_to_gb(hardware.memory.used_bytes),
        ram_free_gb: bytes_to_gb(hardware.memory.free_bytes),
        disk_name: disk.name,
        disk_total_gb: bytes_to_gb(disk.total_bytes),
        disk_used_gb: bytes_to_gb(disk.used_bytes),
        disk_free_gb: bytes_to_gb(disk.free_bytes),
        health_score: health.score,
        health_label: health.label,
    }
}

#[tauri::command]
pub fn run_diagnostics() -> Vec<DiagnosticResult> {
    let hardware = collect_hardware_info();
    let startup_count = read_startup_apps().len();
    build_diagnostics(&hardware, startup_count)
}

#[tauri::command]
pub fn get_hardware_info() -> HardwareInfo {
    collect_hardware_info()
}

#[tauri::command]
pub fn get_diagnostic_report() -> DiagnosticReport {
    let hardware = collect_hardware_info();
    let startup_count = read_startup_apps().len();
    let diagnostics = build_diagnostics(&hardware, startup_count);
    let health = calculate_health(&hardware, startup_count, &diagnostics);
    let problems: Vec<DiagnosticResult> = diagnostics
        .iter()
        .filter(|item| item.status != "ok")
        .cloned()
        .collect();
    let recommendations = if problems.is_empty() {
        vec!["Nenhuma ação é necessária agora. Continue monitorando periodicamente.".into()]
    } else {
        problems
            .iter()
            .map(|item| item.recommendation.clone())
            .collect()
    };
    let summary = if problems.is_empty() {
        "Seu computador apresenta desempenho saudável.".into()
    } else {
        format!(
            "Foram encontrados {} pontos que podem ser melhorados.",
            problems.len()
        )
    };

    DiagnosticReport {
        summary,
        health,
        problems,
        recommendations,
    }
}

fn build_diagnostics(hardware: &HardwareInfo, startup_count: usize) -> Vec<DiagnosticResult> {
    let disk = primary_disk(hardware);
    let free_percent = percent(disk.free_bytes, disk.total_bytes);
    let uptime_days = hardware.os.uptime_seconds / 86_400;
    let mut diagnostics = Vec::new();

    diagnostics.push(DiagnosticResult {
        id: "ram-capacity".into(),
        title: "Capacidade de RAM".into(),
        status: if hardware.memory.total_bytes < 8 * 1024_u64.pow(3) { "attention" } else { "ok" }.into(),
        value: format!("{:.1} GB totais", bytes_to_gb(hardware.memory.total_bytes)),
        description: if hardware.memory.total_bytes < 8 * 1024_u64.pow(3) {
            "A quantidade de RAM está abaixo do ideal para uso moderno do Windows.".into()
        } else {
            "A quantidade de RAM está dentro de uma faixa saudável para diagnóstico geral.".into()
        },
        recommendation: "Considere fechar aplicativos em segundo plano ou avaliar upgrade de memória se houver lentidão.".into(),
        penalty: if hardware.memory.total_bytes < 8 * 1024_u64.pow(3) { 10 } else { 0 },
    });

    diagnostics.push(DiagnosticResult {
        id: "ram-usage".into(),
        title: "Uso de RAM".into(),
        status: if hardware.memory.usage_percent >= 90 {
            "critical"
        } else if hardware.memory.usage_percent >= 80 {
            "attention"
        } else {
            "ok"
        }
        .into(),
        value: format!("{}% em uso", hardware.memory.usage_percent),
        description: format!(
            "{:.1} GB usados de {:.1} GB disponíveis no sistema.",
            bytes_to_gb(hardware.memory.used_bytes),
            bytes_to_gb(hardware.memory.total_bytes)
        ),
        recommendation:
            "Revise aplicativos abertos e itens de inicialização antes de qualquer otimização real."
                .into(),
        penalty: if hardware.memory.usage_percent >= 90 {
            18
        } else if hardware.memory.usage_percent >= 80 {
            10
        } else {
            0
        },
    });

    diagnostics.push(DiagnosticResult {
        id: "disk-space".into(),
        title: "Espaço do disco principal".into(),
        status: if free_percent <= 5 { "critical" } else if free_percent <= 15 { "attention" } else { "ok" }.into(),
        value: format!("{}% livre", free_percent),
        description: format!("Seu disco possui {:.1} GB livres de {:.1} GB totais.", bytes_to_gb(disk.free_bytes), bytes_to_gb(disk.total_bytes)),
        recommendation: format!("Seu disco possui apenas {}% de espaço livre. Avalie remover arquivos manualmente ou mover dados grandes.", free_percent),
        penalty: if free_percent <= 5 { 25 } else if free_percent <= 15 { 14 } else { 0 },
    });

    diagnostics.push(DiagnosticResult {
        id: "startup-count".into(),
        title: "Aplicativos de inicialização".into(),
        status: if startup_count >= 20 {
            "attention"
        } else if startup_count >= 12 {
            "warning"
        } else {
            "ok"
        }
        .into(),
        value: format!("{} aplicativos", startup_count),
        description: format!(
            "Seu Windows possui {} aplicativos iniciando junto com o sistema.",
            startup_count
        ),
        recommendation:
            "Revise a lista de inicialização no Hermes. Esta fase apenas exibe os itens detectados."
                .into(),
        penalty: if startup_count >= 20 {
            12
        } else if startup_count >= 12 {
            6
        } else {
            0
        },
    });

    diagnostics.push(DiagnosticResult {
        id: "uptime".into(),
        title: "Tempo ligado".into(),
        status: if uptime_days >= 14 { "attention" } else if uptime_days >= 7 { "warning" } else { "ok" }.into(),
        value: format_uptime(hardware.os.uptime_seconds),
        description: "Uptime alto pode indicar acúmulo de processos, atualizações pendentes ou sessões longas demais.".into(),
        recommendation: "Se notar lentidão, reinicie o Windows em um momento conveniente.".into(),
        penalty: if uptime_days >= 14 { 8 } else if uptime_days >= 7 { 4 } else { 0 },
    });

    diagnostics
}

fn calculate_health(
    hardware: &HardwareInfo,
    startup_count: usize,
    diagnostics: &[DiagnosticResult],
) -> HealthScore {
    let mut score = 100_u8;
    let mut reasons = Vec::new();
    for item in diagnostics.iter().filter(|item| item.penalty > 0) {
        score = score.saturating_sub(item.penalty);
        reasons.push(format!("{}: {}", item.title, item.value));
    }
    if hardware.cpu.usage_percent >= 90 {
        score = score.saturating_sub(10);
        reasons.push(format!(
            "CPU em {}% no momento da leitura",
            hardware.cpu.usage_percent
        ));
    }
    if startup_count == 0 {
        reasons.push("Nenhum item de inicialização foi detectado pelas fontes suportadas.".into());
    }
    if reasons.is_empty() {
        reasons.push("Nenhum ponto crítico foi detectado na leitura atual.".into());
    }

    HealthScore {
        score,
        label: health_label(score).into(),
        reasons,
    }
}

fn collect_hardware_info() -> HardwareInfo {
    #[cfg(target_os = "windows")]
    {
        if let Some(info) = collect_windows_hardware_info() {
            return info;
        }
    }
    collect_portable_hardware_info()
}

#[cfg(target_os = "windows")]
fn collect_windows_hardware_info() -> Option<HardwareInfo> {
    let script = r#"
$os = Get-CimInstance Win32_OperatingSystem
$cs = Get-CimInstance Win32_ComputerSystem
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$logicalDisks = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Sort-Object DeviceID
$diskDrives = Get-CimInstance Win32_DiskDrive | Sort-Object Index
$primaryModel = if ($diskDrives) { [string]$diskDrives[0].Model } else { "Não informado" }
$disks = @()
foreach ($d in $logicalDisks) {
  $size = [UInt64]($d.Size)
  $free = [UInt64]($d.FreeSpace)
  $disks += [pscustomobject]@{ name=[string]$d.DeviceID; model=$primaryModel; total_bytes=$size; free_bytes=$free; is_primary=($d.DeviceID -eq $env:SystemDrive) }
}
[pscustomobject]@{
  os = [pscustomobject]@{ computer_name=$env:COMPUTERNAME; name=[string]$os.Caption; version=[string]$os.Version; build=[string]$os.BuildNumber; architecture=[string]$os.OSArchitecture; uptime_seconds=[UInt64]((Get-Date) - $os.LastBootUpTime).TotalSeconds }
  cpu = [pscustomobject]@{ name=[string]$cpu.Name; frequency_mhz=[UInt64]$cpu.MaxClockSpeed; cores=[UInt32]$cpu.NumberOfCores; threads=[UInt32]$cpu.NumberOfLogicalProcessors; usage_percent=[UInt32]$cpu.LoadPercentage }
  memory = [pscustomobject]@{ total_bytes=[UInt64]($cs.TotalPhysicalMemory); free_bytes=[UInt64]($os.FreePhysicalMemory * 1KB) }
  disks = $disks
} | ConvertTo-Json -Depth 6 -Compress
"#;
    let value = powershell_json(script)?;
    Some(hardware_from_json(value, "Windows CIM somente leitura"))
}

fn collect_portable_hardware_info() -> HardwareInfo {
    let total_memory = read_linux_memory("MemTotal:").unwrap_or(0) * 1024;
    let free_memory =
        (read_linux_memory("MemAvailable:").or_else(|| read_linux_memory("MemFree:"))).unwrap_or(0)
            * 1024;
    let uptime_seconds = std::fs::read_to_string("/proc/uptime")
        .ok()
        .and_then(|text| {
            text.split_whitespace()
                .next()
                .and_then(|value| value.parse::<f64>().ok())
        })
        .map(|value| value as u64)
        .unwrap_or(0);
    let cpu_name = std::fs::read_to_string("/proc/cpuinfo")
        .ok()
        .and_then(|text| {
            text.lines()
                .find(|line| line.starts_with("model name"))
                .map(|line| line.split(':').nth(1).unwrap_or("CPU").trim().to_string())
        })
        .unwrap_or_else(|| "CPU não identificado".into());
    let threads = std::thread::available_parallelism()
        .map(|value| value.get() as u32)
        .unwrap_or(1);
    let disk = statvfs_root();

    HardwareInfo {
        os: OsInfo {
            computer_name: std::env::var("COMPUTERNAME")
                .or_else(|_| std::env::var("HOSTNAME"))
                .unwrap_or_else(|_| "Computador local".into()),
            name: std::env::consts::OS.into(),
            version: "Não disponível fora do Windows".into(),
            build: "N/A".into(),
            architecture: std::env::consts::ARCH.into(),
            uptime_seconds,
        },
        cpu: CpuInfo {
            name: cpu_name,
            frequency_mhz: 0,
            cores: threads,
            threads,
            usage_percent: 0,
        },
        memory: MemoryInfo {
            total_bytes: total_memory,
            used_bytes: total_memory.saturating_sub(free_memory),
            free_bytes: free_memory,
            usage_percent: percent(total_memory.saturating_sub(free_memory), total_memory) as u8,
        },
        disks: vec![disk],
        gpu_ready: true,
        data_source: "Leitura local portátil; no Windows usa CIM/PowerShell somente leitura".into(),
    }
}

fn hardware_from_json(value: Value, data_source: &str) -> HardwareInfo {
    let os = &value["os"];
    let cpu = &value["cpu"];
    let memory = &value["memory"];
    let total_memory = json_u64(memory, "total_bytes");
    let free_memory = json_u64(memory, "free_bytes");
    let disks_value = value["disks"].clone();
    let disk_values = if disks_value.is_array() {
        disks_value.as_array().cloned().unwrap_or_default()
    } else {
        vec![disks_value]
    };
    let disks: Vec<DiskInfo> = disk_values
        .into_iter()
        .filter(|disk| json_u64(disk, "total_bytes") > 0)
        .map(|disk| {
            let total = json_u64(&disk, "total_bytes");
            let free = json_u64(&disk, "free_bytes");
            DiskInfo {
                name: json_string(&disk, "name", "Disco"),
                model: json_string(&disk, "model", "Modelo não informado"),
                total_bytes: total,
                used_bytes: total.saturating_sub(free),
                free_bytes: free,
                usage_percent: percent(total.saturating_sub(free), total) as u8,
                is_primary: disk["is_primary"].as_bool().unwrap_or(false),
            }
        })
        .collect();

    HardwareInfo {
        os: OsInfo {
            computer_name: json_string(os, "computer_name", "Computador local"),
            name: json_string(os, "name", "Windows"),
            version: json_string(os, "version", "Não informado"),
            build: json_string(os, "build", "Não informado"),
            architecture: json_string(os, "architecture", "Não informado"),
            uptime_seconds: json_u64(os, "uptime_seconds"),
        },
        cpu: CpuInfo {
            name: json_string(cpu, "name", "CPU não identificada"),
            frequency_mhz: json_u64(cpu, "frequency_mhz"),
            cores: json_u64(cpu, "cores") as u32,
            threads: json_u64(cpu, "threads") as u32,
            usage_percent: json_u64(cpu, "usage_percent").min(100) as u8,
        },
        memory: MemoryInfo {
            total_bytes: total_memory,
            used_bytes: total_memory.saturating_sub(free_memory),
            free_bytes: free_memory,
            usage_percent: percent(total_memory.saturating_sub(free_memory), total_memory) as u8,
        },
        disks: if disks.is_empty() {
            vec![empty_disk()]
        } else {
            disks
        },
        gpu_ready: true,
        data_source: data_source.into(),
    }
}

#[cfg(target_os = "windows")]
fn powershell_json(script: &str) -> Option<Value> {
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
    serde_json::from_slice(&output.stdout).ok()
}

fn primary_disk(hardware: &HardwareInfo) -> DiskInfo {
    hardware
        .disks
        .iter()
        .find(|disk| disk.is_primary)
        .or_else(|| hardware.disks.first())
        .cloned()
        .unwrap_or_else(empty_disk)
}

fn empty_disk() -> DiskInfo {
    DiskInfo {
        name: "Disco não identificado".into(),
        model: "Não informado".into(),
        total_bytes: 0,
        used_bytes: 0,
        free_bytes: 0,
        usage_percent: 0,
        is_primary: true,
    }
}

fn statvfs_root() -> DiskInfo {
    let output = Command::new("df").args(["-B1", "/"]).output().ok();
    let (total, free) = output
        .and_then(|output| String::from_utf8(output.stdout).ok())
        .and_then(|text| {
            text.lines().nth(1).and_then(|line| {
                let parts: Vec<&str> = line.split_whitespace().collect();
                Some((
                    parts.get(1)?.parse::<u64>().ok()?,
                    parts.get(3)?.parse::<u64>().ok()?,
                ))
            })
        })
        .unwrap_or((0, 0));
    DiskInfo {
        name: "/".into(),
        model: "Disco principal".into(),
        total_bytes: total,
        used_bytes: total.saturating_sub(free),
        free_bytes: free,
        usage_percent: percent(total.saturating_sub(free), total) as u8,
        is_primary: true,
    }
}

fn read_linux_memory(label: &str) -> Option<u64> {
    let text = std::fs::read_to_string("/proc/meminfo").ok()?;
    text.lines()
        .find(|line| line.starts_with(label))
        .and_then(|line| line.split_whitespace().nth(1)?.parse::<u64>().ok())
}

fn json_string(value: &Value, key: &str, fallback: &str) -> String {
    value[key].as_str().unwrap_or(fallback).trim().to_string()
}

fn json_u64(value: &Value, key: &str) -> u64 {
    value[key]
        .as_u64()
        .or_else(|| value[key].as_f64().map(|number| number as u64))
        .unwrap_or(0)
}

fn percent(used: u64, total: u64) -> u64 {
    if total == 0 {
        0
    } else {
        ((used as f64 / total as f64) * 100.0).round() as u64
    }
}

fn bytes_to_gb(bytes: u64) -> f64 {
    ((bytes as f64 / 1024_f64.powi(3)) * 10.0).round() / 10.0
}

fn bytes_to_gb_u64(bytes: u64) -> u64 {
    (bytes as f64 / 1024_f64.powi(3)).round() as u64
}

fn format_uptime(seconds: u64) -> String {
    let days = seconds / 86_400;
    let hours = (seconds % 86_400) / 3_600;
    if days > 0 {
        format!("{}d {}h", days, hours)
    } else {
        format!("{}h", hours)
    }
}

fn health_label(score: u8) -> &'static str {
    match score {
        90..=100 => "Excelente",
        75..=89 => "Bom",
        55..=74 => "Atenção",
        _ => "Crítico",
    }
}

fn status_from_score(score: u8) -> &'static str {
    match score {
        75..=100 => "good",
        55..=74 => "attention",
        _ => "critical",
    }
}

#[allow(dead_code)]
fn unix_now_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_secs())
        .unwrap_or(0)
}
