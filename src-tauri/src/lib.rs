mod commands;

use commands::{cleaner, diagnostics, logs, restore, startup, tweaks};

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            diagnostics::get_system_overview,
            diagnostics::run_diagnostics,
            cleaner::scan_temp_files,
            startup::list_startup_apps,
            tweaks::list_available_tweaks,
            tweaks::list_performance_profiles,
            tweaks::simulate_apply_tweak,
            tweaks::simulate_apply_profile,
            logs::list_logs,
            restore::create_restore_snapshot,
            restore::simulate_restore_snapshot,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Hermes Optimizer");
}
