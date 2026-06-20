const DEFAULT_SAFE_TEST_MODE: bool = true;

pub fn is_enabled() -> bool {
    parse_safe_mode_flag(option_env!("HERMES_SAFE_TEST_MODE")).unwrap_or(DEFAULT_SAFE_TEST_MODE)
}

pub fn force_dry_run(requested_dry_run: bool) -> bool {
    is_enabled() || requested_dry_run
}

pub fn mode_prefix(dry_run: bool) -> &'static str {
    if is_enabled() {
        "DRY-RUN | Modo Seguro de Teste ativo"
    } else if dry_run {
        "DRY-RUN"
    } else {
        "REAL"
    }
}

pub fn notice() -> &'static str {
    if is_enabled() {
        "Modo Seguro de Teste ativo - nenhuma alteracao real sera aplicada."
    } else {
        "Modo real liberado por configuracao de build."
    }
}

fn parse_safe_mode_flag(value: Option<&'static str>) -> Option<bool> {
    let normalized = value?.trim().to_ascii_lowercase();
    match normalized.as_str() {
        "0" | "false" | "off" | "real" | "release" => Some(false),
        "1" | "true" | "on" | "test" | "safe" | "dry-run" => Some(true),
        _ => None,
    }
}
