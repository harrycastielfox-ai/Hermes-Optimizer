mod commands;

use commands::{benchmark, cleaner, diagnostics, logs, restore, startup, tweaks};

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            benchmark::run_light_benchmark,
            benchmark::get_last_benchmark_result,
            diagnostics::get_system_overview,
            diagnostics::run_diagnostics,
            diagnostics::get_hardware_info,
            diagnostics::get_diagnostic_report,
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
