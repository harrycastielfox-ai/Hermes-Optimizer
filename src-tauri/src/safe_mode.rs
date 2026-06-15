pub const HERMES_SAFE_TEST_MODE: bool = true;

pub fn is_enabled() -> bool {
    HERMES_SAFE_TEST_MODE
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
    "Modo Seguro de Teste ativo - nenhuma alteracao real sera aplicada."
}
