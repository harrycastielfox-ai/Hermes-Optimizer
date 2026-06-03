use serde::Serialize;

#[derive(Serialize)]
pub struct CleanerCategory {
    id: String,
    name: String,
    description: String,
    estimated_size_mb: u32,
    safe_to_clean: bool,
    requires_confirmation: bool,
    reversible: bool,
}

#[tauri::command]
pub fn scan_temp_files() -> Vec<CleanerCategory> {
    vec![
        CleanerCategory {
            id: "user-temp".into(),
            name: "Arquivos temporários do usuário".into(),
            description: "Mock seguro sem Downloads ou documentos pessoais.".into(),
            estimated_size_mb: 620,
            safe_to_clean: true,
            requires_confirmation: true,
            reversible: false,
        },
        CleanerCategory {
            id: "system-cache".into(),
            name: "Cache de sistema".into(),
            description: "Somente estimativa simulada.".into(),
            estimated_size_mb: 410,
            safe_to_clean: true,
            requires_confirmation: true,
            reversible: false,
        },
    ]
}
