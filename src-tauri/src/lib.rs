mod advanced;
mod advisor;
mod advisor_ai_engine;
mod benchmark;
mod clean;
mod diagnostic;
mod gamer;
mod optimizer;
mod performance;
mod profiles;
mod restore;
mod startup;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            advanced::advanced_engine_apply,
            advanced::advanced_engine_catalog,
            advisor_ai_engine::advisor_ai_engine_analyze,
            advisor::advisor_pro_analyze,
            benchmark::benchmark_engine_run,
            clean::clean_engine_apply,
            clean::clean_engine_scan,
            clean::clean_quarantine_purge_expired,
            diagnostic::diagnostic_engine_read,
            gamer::gamer_engine_apply,
            gamer::gamer_engine_read,
            gamer::gamer_profile_delete,
            gamer::gamer_profile_save,
            gamer::gamer_profiles_list,
            gamer::gamer_restore_session,
            optimizer::optimize_now_plan,
            performance::performance_apply_controlled,
            performance::performance_engine_read,
            profiles::profiles_apply,
            profiles::profiles_list,
            restore::restore_apply_snapshot,
            restore::restore_create_snapshot,
            restore::restore_engine_status,
            restore::restore_list_snapshots,
            restore::restore_list_events,
            restore::restore_validate_snapshot,
            startup::startup_engine_apply,
            startup::startup_engine_read
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
