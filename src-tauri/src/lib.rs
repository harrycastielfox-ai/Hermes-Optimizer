mod advanced;
mod advisor;
mod advisor_ai_engine;
mod anti_cheat;
mod benchmark;
mod clean;
mod diagnostic;
mod gamer;
mod optimizer;
mod performance;
mod profiles;
mod restore;
mod safe_mode;
mod startup;

use tauri::Manager;

#[tauri::command]
fn hermes_window_minimize(app: tauri::AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Janela principal nao encontrada.".to_string())?;

    if window.is_fullscreen().unwrap_or(false) {
        window.set_fullscreen(false).map_err(|error| {
            format!("Nao foi possivel sair da tela cheia antes de minimizar: {error}")
        })?;
    }

    window
        .minimize()
        .map_err(|error| format!("Nao foi possivel minimizar a janela: {error}"))
}

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
            advanced::advanced_engine_apply_optimize_now,
            advanced::advanced_engine_catalog,
            advanced::advanced_set_graphics_high_performance_optimize_now,
            anti_cheat::anti_cheat_engine_read,
            advisor_ai_engine::advisor_ai_engine_analyze,
            advisor::advisor_pro_analyze,
            benchmark::benchmark_engine_read_cached,
            benchmark::benchmark_engine_run,
            clean::clean_engine_apply,
            clean::clean_engine_apply_optimize_now,
            clean::clean_engine_scan,
            clean::clean_quarantine_purge_expired,
            diagnostic::diagnostic_engine_read_cached,
            diagnostic::diagnostic_engine_refresh_live,
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
            startup::startup_engine_read,
            hermes_window_minimize
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
