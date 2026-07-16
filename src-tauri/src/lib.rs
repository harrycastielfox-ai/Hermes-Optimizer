mod advanced;
mod advisor;
mod advisor_ai_engine;
mod anti_cheat;
mod benchmark;
mod clean;
mod diagnostic;
mod gamer;
mod gamer_dependencies;
mod licensing;
mod optimizer;
mod performance;
mod profiles;
mod restore;
mod safe_mode;
mod startup;
mod system;

use tauri::Manager;

#[cfg(windows)]
fn colorref(red: u8, green: u8, blue: u8) -> u32 {
    (red as u32) | ((green as u32) << 8) | ((blue as u32) << 16)
}

#[cfg(windows)]
fn apply_nex_window_frame(window: &tauri::WebviewWindow) {
    use windows::Win32::Graphics::Dwm::{
        DwmSetWindowAttribute, DWMWA_BORDER_COLOR, DWMWA_CAPTION_COLOR, DWMWA_TEXT_COLOR,
        DWMWA_USE_IMMERSIVE_DARK_MODE,
    };

    let Ok(hwnd) = window.hwnd() else {
        return;
    };

    let dark_mode = 1i32;
    let caption_color = colorref(10, 3, 18);
    let border_color = colorref(32, 12, 52);
    let text_color = colorref(248, 244, 255);

    unsafe {
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWA_USE_IMMERSIVE_DARK_MODE,
            &dark_mode as *const _ as _,
            std::mem::size_of_val(&dark_mode) as u32,
        );
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWA_CAPTION_COLOR,
            &caption_color as *const _ as _,
            std::mem::size_of_val(&caption_color) as u32,
        );
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWA_BORDER_COLOR,
            &border_color as *const _ as _,
            std::mem::size_of_val(&border_color) as u32,
        );
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWA_TEXT_COLOR,
            &text_color as *const _ as _,
            std::mem::size_of_val(&text_color) as u32,
        );
    }
}

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
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init());

    builder
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            #[cfg(windows)]
            if let Some(window) = app.get_webview_window("main") {
                apply_nex_window_frame(&window);
            }
            #[cfg(all(debug_assertions, windows))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
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
            gamer_dependencies::gamer_dependency_audit_official_manifest,
            gamer_dependencies::gamer_dependency_download_official_installers,
            gamer_dependencies::gamer_dependency_install_verified,
            gamer_dependencies::gamer_dependency_open_cache_dir,
            gamer_dependencies::gamer_dependency_verify_installers,
            licensing::nex_device_identity,
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
            system::system_boot_context_read,
            system::system_cancel_restart,
            system::system_open_windows_security,
            system::system_restart_computer,
            system::system_security_context_read,
            hermes_window_minimize
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
