use serde::Serialize;

#[derive(Serialize)]
pub struct StartupApp {
    id: String,
    name: String,
    publisher: String,
    path: String,
    impact: String,
    enabled: bool,
    risk: String,
    suggested_action: String,
}

#[tauri::command]
pub fn list_startup_apps() -> Vec<StartupApp> {
    vec![StartupApp {
        id: "mock-chat".into(),
        name: "Chat Launcher".into(),
        publisher: "Hermes Mock Labs".into(),
        path: "C:\\Users\\User\\AppData\\Local\\Chat\\chat.exe".into(),
        impact: "high".into(),
        enabled: true,
        risk: "medium".into(),
        suggested_action: "Avaliar manualmente antes de alterar.".into(),
    }]
}
