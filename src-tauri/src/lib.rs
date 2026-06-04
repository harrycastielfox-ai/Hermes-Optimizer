mod commands;

use commands::{benchmark, cleaner, diagnostics, history, logs, restore, startup, tweaks};

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
            history::get_history_overview,
            history::list_benchmark_history,
            history::list_diagnostic_history,
            history::list_history_logs,
            history::list_snapshot_history,
            history::compare_last_benchmarks,
            history::compare_last_diagnostics,
            history::get_history_advisor_insights,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Hermes Optimizer");
}
