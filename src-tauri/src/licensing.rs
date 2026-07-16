use serde::Serialize;
use sha2::{Digest, Sha256};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NexDeviceIdentity {
    fingerprint: String,
    label: String,
    source: String,
}

#[cfg(windows)]
fn read_windows_machine_guid() -> Result<String, String> {
    let output = std::process::Command::new("reg.exe")
        .args([
            "query",
            r"HKLM\SOFTWARE\Microsoft\Cryptography",
            "/v",
            "MachineGuid",
        ])
        .output()
        .map_err(|error| format!("Nao foi possivel consultar a identidade do Windows: {error}"))?;

    if !output.status.success() {
        return Err("O Windows nao forneceu uma identidade valida para este computador.".into());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    stdout
        .lines()
        .find_map(|line| {
            let (_, value) = line.split_once("REG_SZ")?;
            let value = value.trim();
            (!value.is_empty()).then(|| value.to_owned())
        })
        .ok_or_else(|| "A identidade deste computador nao foi encontrada no Windows.".into())
}

#[tauri::command]
pub fn nex_device_identity() -> Result<NexDeviceIdentity, String> {
    #[cfg(windows)]
    {
        let machine_guid = read_windows_machine_guid()?;
        let mut hasher = Sha256::new();
        hasher.update(b"nex-optimizer-device-v1:");
        hasher.update(machine_guid.trim().to_ascii_lowercase().as_bytes());
        let fingerprint = format!("{:x}", hasher.finalize());
        let label = std::env::var("COMPUTERNAME")
            .ok()
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| "PC Windows".to_string());

        return Ok(NexDeviceIdentity {
            fingerprint,
            label,
            source: "windows-machine-guid-sha256".to_string(),
        });
    }

    #[cfg(not(windows))]
    Err("A vinculacao de dispositivo do NEX esta disponivel somente no Windows.".into())
}
