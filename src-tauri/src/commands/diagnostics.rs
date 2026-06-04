use serde::Serialize;
use serde_json::Value;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

use super::{history, startup::read_startup_apps};

const GIB: u64 = 1024_u64.pow(3);

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
    manufacturer: String,
    frequency_mhz: u64,
    base_frequency_mhz: u64,
    max_frequency_mhz: u64,
    cores: u32,
    physical_cores: u32,
    threads: u32,
    logical_processors: u32,
    architecture: String,
    usage_percent: u8,
}

#[derive(Clone, Serialize)]
pub struct MemoryInfo {
    total_bytes: u64,
    used_bytes: u64,
    free_bytes: u64,
    available_bytes: u64,
    usage_percent: u8,
    module_count: u32,
    slot_count: u32,
    speed_mhz: u64,
}

#[derive(Clone, Serialize)]
pub struct DiskInfo {
    name: String,
    drive_letter: String,
    model: String,
    media_type: String,
    total_bytes: u64,
    used_bytes: u64,
    free_bytes: u64,
    usage_percent: u8,
    is_primary: bool,
}

#[derive(Clone, Serialize)]
pub struct GpuInfo {
    name: String,
    manufacturer: String,
    dedicated_memory_bytes: u64,
    driver_version: String,
    status: String,
    detected: bool,
}

#[derive(Clone, Serialize)]
pub struct HardwareInfo {
    os: OsInfo,
    cpu: CpuInfo,
    memory: MemoryInfo,
    disks: Vec<DiskInfo>,
    gpu: Option<GpuInfo>,
    gpu_ready: bool,
    data_source: String,
    safety_note: String,
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
    gpu_detected: bool,
    gpu_name: String,
    gpu_memory_gb: f64,
    health_score: u8,
    health_label: String,
    performance_score: u8,
    stability_score: u8,
    storage_score: u8,
    gaming_readiness_score: u8,
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
    performance_score: u8,
    stability_score: u8,
    storage_score: u8,
    gaming_readiness_score: u8,
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
    let gpu = hardware.gpu.clone().unwrap_or_else(empty_gpu);

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
        cpu_cores: hardware.cpu.physical_cores,
        ram_total_gb: bytes_to_gb(hardware.memory.total_bytes),
        ram_used_gb: bytes_to_gb(hardware.memory.used_bytes),
        ram_free_gb: bytes_to_gb(hardware.memory.free_bytes),
        disk_name: disk.name,
        disk_total_gb: bytes_to_gb(disk.total_bytes),
        disk_used_gb: bytes_to_gb(disk.used_bytes),
        disk_free_gb: bytes_to_gb(disk.free_bytes),
        gpu_detected: gpu.detected,
        gpu_name: if gpu.detected {
            gpu.name
        } else {
            "GPU não detectada nesta leitura.".into()
        },
        gpu_memory_gb: bytes_to_gb(gpu.dedicated_memory_bytes),
        health_score: health.score,
        health_label: health.label,
        performance_score: health.performance_score,
        stability_score: health.stability_score,
        storage_score: health.storage_score,
        gaming_readiness_score: health.gaming_readiness_score,
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
    let recommendations = build_advisor_recommendations(&hardware, startup_count, &diagnostics);
    let summary = if problems.is_empty() {
        "Seu computador apresenta desempenho saudável na leitura atual.".into()
    } else {
        format!(
            "Foram encontrados {} pontos que merecem atenção, sem aplicar qualquer alteração no Windows.",
            problems.len()
        )
    };

    let _ = history::save_diagnostic_history(
        &format!("diag-{}", history::current_timestamp()),
        health.score,
        problems.len() as u32,
        recommendations.len() as u32,
        &summary,
    );

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
    let gpu = hardware.gpu.clone().unwrap_or_else(empty_gpu);
    let mut diagnostics = Vec::new();

    diagnostics.push(DiagnosticResult {
        id: "system".into(),
        title: "Sistema".into(),
        status: if uptime_days >= 14 { "attention" } else { "ok" }.into(),
        value: format!("{} • build {}", hardware.os.name, hardware.os.build),
        description: format!(
            "Arquitetura {} e uptime de {}.",
            hardware.os.architecture,
            format_uptime(hardware.os.uptime_seconds)
        ),
        recommendation: if uptime_days >= 14 {
            "Uptime elevado; se notar lentidão, reinicie em um momento conveniente.".into()
        } else {
            "Sistema lido em modo somente leitura, sem alterações de configuração.".into()
        },
        penalty: if uptime_days >= 14 { 8 } else { 0 },
    });

    diagnostics.push(DiagnosticResult {
        id: "cpu".into(),
        title: "CPU".into(),
        status: if hardware.cpu.usage_percent >= 90 { "critical" } else if hardware.cpu.usage_percent >= 75 { "attention" } else { "ok" }.into(),
        value: format!("{} núcleos / {} threads", hardware.cpu.physical_cores, hardware.cpu.logical_processors),
        description: format!(
            "{} ({}) • base {} MHz • máxima {} MHz.",
            hardware.cpu.name,
            hardware.cpu.manufacturer,
            unknown_mhz(hardware.cpu.base_frequency_mhz),
            unknown_mhz(hardware.cpu.max_frequency_mhz)
        ),
        recommendation: "O Hermes apenas observa a carga e não altera energia, boost, serviços ou afinidade de CPU nesta fase.".into(),
        penalty: if hardware.cpu.usage_percent >= 90 { 10 } else if hardware.cpu.usage_percent >= 75 { 4 } else { 0 },
    });

    diagnostics.push(DiagnosticResult {
        id: "memory".into(),
        title: "Memória".into(),
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
            "{:.1} GB usados de {:.1} GB; {} pente(s)/{} slot(s); velocidade {} MHz.",
            bytes_to_gb(hardware.memory.used_bytes),
            bytes_to_gb(hardware.memory.total_bytes),
            hardware.memory.module_count,
            hardware.memory.slot_count,
            unknown_mhz(hardware.memory.speed_mhz)
        ),
        recommendation: if hardware.memory.usage_percent >= 80 {
            "Sua RAM está com uso elevado; feche aplicativos pesados antes de jogar.".into()
        } else {
            "A memória está em faixa saudável na leitura atual.".into()
        },
        penalty: if hardware.memory.usage_percent >= 90 {
            18
        } else if hardware.memory.usage_percent >= 80 {
            10
        } else {
            0
        },
    });

    diagnostics.push(DiagnosticResult {
        id: "disk".into(),
        title: "Disco".into(),
        status: if free_percent <= 5 { "critical" } else if free_percent <= 15 { "attention" } else { "ok" }.into(),
        value: format!("{}% usado • {}", disk.usage_percent, disk.media_type),
        description: format!(
            "{} {} possui {:.1} GB livres de {:.1} GB totais.",
            disk.drive_letter,
            disk.model,
            bytes_to_gb(disk.free_bytes),
            bytes_to_gb(disk.total_bytes)
        ),
        recommendation: if free_percent > 20 {
            "Seu disco principal está saudável, com mais de 20% de espaço livre.".into()
        } else {
            format!("Seu disco possui {}% de espaço livre. Avalie mover dados grandes manualmente; o Hermes não limpa arquivos nesta fase.", free_percent)
        },
        penalty: if free_percent <= 5 { 25 } else if free_percent <= 15 { 14 } else { 0 },
    });

    diagnostics.push(DiagnosticResult {
        id: "gpu".into(),
        title: "GPU".into(),
        status: if gpu.detected { "ok" } else { "warning" }.into(),
        value: if gpu.detected { gpu.name.clone() } else { "Não detectada".into() },
        description: if gpu.detected {
            format!(
                "{} • VRAM {} • driver {} • status {}.",
                gpu.manufacturer,
                if gpu.dedicated_memory_bytes > 0 { format!("{:.1} GB", bytes_to_gb(gpu.dedicated_memory_bytes)) } else { "não informada".into() },
                gpu.driver_version,
                gpu.status
            )
        } else {
            "GPU não detectada nesta leitura. CIM/WMI pode não expor adaptadores em alguns ambientes.".into()
        },
        recommendation: if gpu.detected {
            "GPU dedicada detectada; futuramente o Hermes poderá sugerir perfil gamer por aplicativo.".into()
        } else {
            "Conecte/atualize drivers apenas pelos canais oficiais se a GPU existir; o Hermes não altera drivers.".into()
        },
        penalty: 0,
    });

    diagnostics.push(DiagnosticResult {
        id: "startup".into(),
        title: "Inicialização".into(),
        status: if startup_count >= 20 { "attention" } else if startup_count >= 12 { "warning" } else { "ok" }.into(),
        value: format!("{} aplicativos", startup_count),
        description: format!("Seu Windows possui {} aplicativos iniciando junto com o sistema.", startup_count),
        recommendation: if startup_count >= 12 {
            "Foram detectados muitos itens de inicialização. Revise a lista; esta fase apenas exibe itens detectados.".into()
        } else {
            "Quantidade de itens de inicialização dentro de uma faixa saudável.".into()
        },
        penalty: if startup_count >= 20 { 12 } else if startup_count >= 12 { 6 } else { 0 },
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

    let disk = primary_disk(hardware);
    let free_percent = percent(disk.free_bytes, disk.total_bytes);
    let uptime_days = hardware.os.uptime_seconds / 86_400;
    let gpu_detected = hardware.gpu.as_ref().is_some_and(|gpu| gpu.detected);

    let performance_score = clamp_score(
        100_i16
            - if hardware.memory.usage_percent >= 90 {
                18
            } else if hardware.memory.usage_percent >= 80 {
                10
            } else {
                0
            }
            - if startup_count >= 20 {
                8
            } else if startup_count >= 12 {
                4
            } else {
                0
            }
            - if hardware.cpu.usage_percent >= 90 {
                10
            } else {
                0
            },
    );
    let stability_score = clamp_score(
        100_i16
            - if uptime_days >= 14 {
                12
            } else if uptime_days >= 7 {
                6
            } else {
                0
            }
            - if startup_count >= 20 { 6 } else { 0 },
    );
    let storage_score = clamp_score(
        100_i16
            - if free_percent <= 5 {
                30
            } else if free_percent <= 15 {
                16
            } else if free_percent <= 20 {
                6
            } else {
                0
            },
    );
    let gaming_readiness_score = clamp_score(
        100_i16
            - if !gpu_detected { 18 } else { 0 }
            - if hardware.memory.total_bytes < 8 * GIB {
                16
            } else if hardware.memory.total_bytes < 16 * GIB {
                6
            } else {
                0
            }
            - if hardware.memory.usage_percent >= 85 {
                10
            } else {
                0
            }
            - if startup_count >= 20 {
                8
            } else if startup_count >= 12 {
                4
            } else {
                0
            }
            - if free_percent <= 15 { 8 } else { 0 },
    );

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
        performance_score,
        stability_score,
        storage_score,
        gaming_readiness_score,
    }
}

fn build_advisor_recommendations(
    hardware: &HardwareInfo,
    startup_count: usize,
    diagnostics: &[DiagnosticResult],
) -> Vec<String> {
    let disk = primary_disk(hardware);
    let free_percent = percent(disk.free_bytes, disk.total_bytes);
    let mut recommendations = Vec::new();

    if free_percent > 20 {
        recommendations
            .push("Seu disco principal está saudável, com mais de 20% de espaço livre.".into());
    }
    if hardware.memory.usage_percent >= 80 {
        recommendations
            .push("Sua RAM está com uso elevado; feche aplicativos pesados antes de jogar.".into());
    } else {
        recommendations.push("A RAM tem folga suficiente para uso normal nesta leitura.".into());
    }
    if startup_count >= 12 {
        recommendations.push("Foram detectados muitos itens de inicialização; revise-os manualmente antes de qualquer ação futura.".into());
    }
    if hardware.gpu.as_ref().is_some_and(|gpu| gpu.detected) {
        recommendations.push("GPU dedicada detectada; futuramente o Hermes poderá sugerir perfil gamer por aplicativo.".into());
    } else {
        recommendations.push("GPU não detectada nesta leitura; o Dashboard exibirá um estado amigável sem assumir erro no sistema.".into());
    }

    recommendations.extend(
        diagnostics
            .iter()
            .filter(|item| item.status != "ok")
            .map(|item| item.recommendation.clone()),
    );
    recommendations.push("Confirmação de segurança: esta fase coleta dados locais somente leitura, não envia dados para internet e não altera Windows, Registro, serviços, Defender, Firewall, Update, drivers, energia ou arquivos.".into());
    recommendations
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
    // Fase Hardware Intelligence é estritamente somente leitura: Get-CimInstance/Get-PSDrive
    // não altera Registro, serviços, drivers, energia, Defender, Firewall, Windows Update ou arquivos.
    let script = r#"
$os = Get-CimInstance Win32_OperatingSystem
$cs = Get-CimInstance Win32_ComputerSystem
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$mem = @(Get-CimInstance Win32_PhysicalMemory)
$memArray = Get-CimInstance Win32_PhysicalMemoryArray | Select-Object -First 1
$logicalDisks = @(Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Sort-Object DeviceID)
$diskDrives = @(Get-CimInstance Win32_DiskDrive | Sort-Object Index)
$physicalDisks = @(Get-PhysicalDisk -ErrorAction SilentlyContinue)
$gpus = @(Get-CimInstance Win32_VideoController | Sort-Object Name)
$disks = @()
foreach ($d in $logicalDisks) {
  $size = [UInt64]($d.Size)
  $free = [UInt64]($d.FreeSpace)
  $driveLetter = [string]$d.DeviceID
  $model = "Modelo não informado"
  $media = "Desconhecido"
  if ($diskDrives.Count -gt 0) { $model = [string]$diskDrives[0].Model }
  if ($physicalDisks.Count -gt 0) {
    $mediaRaw = [string]$physicalDisks[0].MediaType
    $bus = [string]$physicalDisks[0].BusType
    if ($bus -eq "NVMe") { $media = "NVMe" }
    elseif ($mediaRaw -match "SSD") { $media = "SSD" }
    elseif ($mediaRaw -match "HDD") { $media = "HDD" }
    elseif ($mediaRaw) { $media = $mediaRaw }
  }
  $disks += [pscustomobject]@{ name=$driveLetter; drive_letter=$driveLetter; model=$model; media_type=$media; total_bytes=$size; free_bytes=$free; is_primary=($driveLetter -eq $env:SystemDrive) }
}
$gpuObjects = @()
foreach ($gpu in $gpus) {
  $memory = 0
  if ($gpu.AdapterRAM -ne $null -and [UInt64]$gpu.AdapterRAM -gt 0) { $memory = [UInt64]$gpu.AdapterRAM }
  $gpuObjects += [pscustomobject]@{ name=[string]$gpu.Name; manufacturer=[string]$gpu.AdapterCompatibility; dedicated_memory_bytes=$memory; driver_version=[string]$gpu.DriverVersion; status=[string]$gpu.Status; detected=$true }
}
$maxMemSpeed = 0
if ($mem.Count -gt 0) { $maxMemSpeed = [UInt64](($mem | Measure-Object -Property Speed -Maximum).Maximum) }
[pscustomobject]@{
  os = [pscustomobject]@{ computer_name=$env:COMPUTERNAME; name=[string]$os.Caption; version=[string]$os.Version; build=[string]$os.BuildNumber; architecture=[string]$os.OSArchitecture; uptime_seconds=[UInt64]((Get-Date) - $os.LastBootUpTime).TotalSeconds }
  cpu = [pscustomobject]@{ name=[string]$cpu.Name; manufacturer=[string]$cpu.Manufacturer; frequency_mhz=[UInt64]$cpu.CurrentClockSpeed; base_frequency_mhz=[UInt64]$cpu.CurrentClockSpeed; max_frequency_mhz=[UInt64]$cpu.MaxClockSpeed; cores=[UInt32]$cpu.NumberOfCores; physical_cores=[UInt32]$cpu.NumberOfCores; threads=[UInt32]$cpu.NumberOfLogicalProcessors; logical_processors=[UInt32]$cpu.NumberOfLogicalProcessors; architecture=[string]$cpu.AddressWidth; usage_percent=[UInt32]$cpu.LoadPercentage }
  memory = [pscustomobject]@{ total_bytes=[UInt64]($cs.TotalPhysicalMemory); free_bytes=[UInt64]($os.FreePhysicalMemory * 1KB); available_bytes=[UInt64]($os.FreePhysicalMemory * 1KB); module_count=[UInt32]$mem.Count; slot_count=[UInt32]$memArray.MemoryDevices; speed_mhz=$maxMemSpeed }
  disks = $disks
  gpus = $gpuObjects
} | ConvertTo-Json -Depth 8 -Compress
"#;
    let value = powershell_json(script)?;
    Some(hardware_from_json(
        value,
        "Windows CIM/PowerShell somente leitura",
    ))
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
            manufacturer: "Não informado".into(),
            frequency_mhz: 0,
            base_frequency_mhz: 0,
            max_frequency_mhz: 0,
            cores: threads,
            physical_cores: threads,
            threads,
            logical_processors: threads,
            architecture: std::env::consts::ARCH.into(),
            usage_percent: 0,
        },
        memory: MemoryInfo {
            total_bytes: total_memory,
            used_bytes: total_memory.saturating_sub(free_memory),
            free_bytes: free_memory,
            available_bytes: free_memory,
            usage_percent: percent(total_memory.saturating_sub(free_memory), total_memory) as u8,
            module_count: 0,
            slot_count: 0,
            speed_mhz: 0,
        },
        disks: vec![disk],
        gpu: None,
        gpu_ready: false,
        data_source: "Leitura local portátil; no Windows usa CIM/PowerShell somente leitura".into(),
        safety_note: safety_note(),
    }
}

fn hardware_from_json(value: Value, data_source: &str) -> HardwareInfo {
    let os = &value["os"];
    let cpu = &value["cpu"];
    let memory = &value["memory"];
    let total_memory = json_u64(memory, "total_bytes");
    let free_memory = json_u64(memory, "free_bytes");
    let disks = json_array(value["disks"].clone())
        .into_iter()
        .filter(|disk| json_u64(disk, "total_bytes") > 0)
        .map(|disk| {
            let total = json_u64(&disk, "total_bytes");
            let free = json_u64(&disk, "free_bytes");
            DiskInfo {
                name: json_string(&disk, "name", "Disco"),
                drive_letter: json_string(&disk, "drive_letter", "Disco"),
                model: json_string(&disk, "model", "Modelo não informado"),
                media_type: normalize_media_type(&json_string(&disk, "media_type", "Desconhecido")),
                total_bytes: total,
                used_bytes: total.saturating_sub(free),
                free_bytes: free,
                usage_percent: percent(total.saturating_sub(free), total) as u8,
                is_primary: disk["is_primary"].as_bool().unwrap_or(false),
            }
        })
        .collect::<Vec<_>>();
    let gpus = json_array(value["gpus"].clone());
    let gpu = gpus
        .into_iter()
        .find(|gpu| json_bool(gpu, "detected") && !json_string(gpu, "name", "").is_empty())
        .map(|gpu| GpuInfo {
            name: json_string(&gpu, "name", "GPU não identificada"),
            manufacturer: json_string(&gpu, "manufacturer", "Fabricante não informado"),
            dedicated_memory_bytes: json_u64(&gpu, "dedicated_memory_bytes"),
            driver_version: json_string(&gpu, "driver_version", "Não informado"),
            status: json_string(&gpu, "status", "Não informado"),
            detected: true,
        });

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
            manufacturer: json_string(cpu, "manufacturer", "Não informado"),
            frequency_mhz: json_u64(cpu, "frequency_mhz"),
            base_frequency_mhz: json_u64(cpu, "base_frequency_mhz"),
            max_frequency_mhz: json_u64(cpu, "max_frequency_mhz"),
            cores: json_u64(cpu, "cores") as u32,
            physical_cores: json_u64(cpu, "physical_cores") as u32,
            threads: json_u64(cpu, "threads") as u32,
            logical_processors: json_u64(cpu, "logical_processors") as u32,
            architecture: json_string(cpu, "architecture", "Não informado"),
            usage_percent: json_u64(cpu, "usage_percent").min(100) as u8,
        },
        memory: MemoryInfo {
            total_bytes: total_memory,
            used_bytes: total_memory.saturating_sub(free_memory),
            free_bytes: free_memory,
            available_bytes: json_u64(memory, "available_bytes").max(free_memory),
            usage_percent: percent(total_memory.saturating_sub(free_memory), total_memory) as u8,
            module_count: json_u64(memory, "module_count") as u32,
            slot_count: json_u64(memory, "slot_count") as u32,
            speed_mhz: json_u64(memory, "speed_mhz"),
        },
        disks: if disks.is_empty() {
            vec![empty_disk()]
        } else {
            disks
        },
        gpu_ready: gpu.as_ref().is_some_and(|gpu| gpu.detected),
        gpu,
        data_source: data_source.into(),
        safety_note: safety_note(),
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
        drive_letter: "N/A".into(),
        model: "Não informado".into(),
        media_type: "Desconhecido".into(),
        total_bytes: 0,
        used_bytes: 0,
        free_bytes: 0,
        usage_percent: 0,
        is_primary: true,
    }
}

fn empty_gpu() -> GpuInfo {
    GpuInfo {
        name: "GPU não detectada nesta leitura.".into(),
        manufacturer: "Não informado".into(),
        dedicated_memory_bytes: 0,
        driver_version: "Não informado".into(),
        status: "Não detectada".into(),
        detected: false,
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
        drive_letter: "/".into(),
        model: "Disco principal".into(),
        media_type: "Desconhecido".into(),
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

fn json_array(value: Value) -> Vec<Value> {
    if value.is_array() {
        value.as_array().cloned().unwrap_or_default()
    } else if value.is_null() {
        Vec::new()
    } else {
        vec![value]
    }
}

fn json_string(value: &Value, key: &str, fallback: &str) -> String {
    value[key].as_str().unwrap_or(fallback).trim().to_string()
}

fn json_u64(value: &Value, key: &str) -> u64 {
    value[key]
        .as_u64()
        .or_else(|| value[key].as_f64().map(|number| number as u64))
        .or_else(|| {
            value[key]
                .as_str()
                .and_then(|text| text.parse::<u64>().ok())
        })
        .unwrap_or(0)
}

fn json_bool(value: &Value, key: &str) -> bool {
    value[key].as_bool().unwrap_or(false)
}

fn percent(used: u64, total: u64) -> u64 {
    if total == 0 {
        0
    } else {
        ((used as f64 / total as f64) * 100.0).round() as u64
    }
}

fn clamp_score(score: i16) -> u8 {
    score.clamp(0, 100) as u8
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

fn unknown_mhz(value: u64) -> String {
    if value == 0 {
        "não informado".into()
    } else {
        value.to_string()
    }
}

fn normalize_media_type(value: &str) -> String {
    let upper = value.to_uppercase();
    if upper.contains("NVME") {
        "NVMe".into()
    } else if upper.contains("SSD") {
        "SSD".into()
    } else if upper.contains("HDD") {
        "HDD".into()
    } else {
        "Desconhecido".into()
    }
}

fn safety_note() -> String {
    "Coleta local somente leitura; nenhum dado é enviado para internet e nenhuma alteração é aplicada no Windows.".into()
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
