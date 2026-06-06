use crate::{
    advisor::{
        self, AdvisorInput, AdvisorReport, BenchmarkSnapshot, DiagnosticSnapshot,
        RecommendationSeverity,
    },
    diagnostic,
};
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};

const MAX_OPTIMIZE_NOW_PLANS: usize = 20;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OptimizeNowPlan {
    pub generated_at: String,
    pub engine_version: String,
    pub read_only: bool,
    pub will_modify_system: bool,
    pub requires_confirmation_before_changes: bool,
    pub telemetry: bool,
    pub resident_process: bool,
    pub summary: OptimizeNowSummary,
    pub stages: Vec<OptimizeNowStage>,
    pub safeguards: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OptimizeNowSummary {
    pub total_stages: usize,
    pub read_only_stages: usize,
    pub confirmation_gates: usize,
    pub advisor_recommendations: usize,
    pub advisor_warnings: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OptimizeNowStage {
    pub id: String,
    pub engine: String,
    pub title: String,
    pub description: String,
    pub status: OptimizeStageStatus,
    pub read_only: bool,
    pub will_modify_system: bool,
    pub requires_confirmation_before_changes: bool,
    pub outputs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OptimizeStageStatus {
    Ready,
    Completed,
    WaitingForConfirmation,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct OptimizeNowHistory {
    plans: Vec<OptimizeNowPlan>,
}

#[tauri::command]
pub fn optimize_now_plan(app: AppHandle) -> Result<OptimizeNowPlan, String> {
    let diagnostic_report = diagnostic::collect_diagnostic_report();
    let advisor_report = advisor::advisor_pro_analyze(
        app.clone(),
        Some(advisor_input_from_diagnostic(&diagnostic_report)),
    )?;
    let history_path = optimize_now_history_path(&app)?;
    let mut history = read_history(&history_path);
    let plan = build_plan(&advisor_report);

    history.plans.insert(0, plan.clone());
    history.plans.truncate(MAX_OPTIMIZE_NOW_PLANS);
    write_history(&history_path, &history)?;

    Ok(plan)
}

fn advisor_input_from_diagnostic(report: &diagnostic::DiagnosticReport) -> AdvisorInput {
    AdvisorInput {
        diagnostic: DiagnosticSnapshot {
            health_score: report.health_score,
            cpu_usage_percent: report.cpu.usage_percent,
            ram_used_gb: report.ram.used_gb,
            ram_total_gb: report.ram.total_gb,
            disk_free_gb: report.disk.free_gb,
            disk_total_gb: report.disk.total_gb,
            startup_items_count: report.startup.total_items,
            startup_high_impact_count: report.startup.high_impact_count,
            boot_time_seconds: Some(report.uptime.seconds.min(u32::MAX as u64) as u32),
            security_active: report.defender.active,
            temporary_files_gb: Some(report.temporary_files.estimated_gb),
            power_plan_name: Some(report.power_plan.active_scheme_name.clone()),
        },
        benchmark: Some(BenchmarkSnapshot {
            score: report.health_score as u32 * 10,
            previous_score: None,
        }),
    }
}

fn build_plan(advisor_report: &AdvisorReport) -> OptimizeNowPlan {
    let advisor_warnings = advisor_report
        .recommendations
        .iter()
        .filter(|recommendation| {
            matches!(&recommendation.severity, RecommendationSeverity::Warning)
        })
        .count();

    let stages = vec![
        stage(
            "analysis-quick",
            "analysis-security",
            "Analise rapida",
            "Coleta local do estado atual do PC para orientar o fluxo.",
            OptimizeStageStatus::Completed,
            false,
            vec![
                "Somente leitura.".to_string(),
                "Nenhuma otimizacao real aplicada nesta etapa.".to_string(),
            ],
        ),
        stage(
            "advisor-pro",
            "advisor-pro",
            "Advisor Pro",
            "Regras locais geram recomendacoes sem IA, internet ou telemetria.",
            OptimizeStageStatus::Completed,
            false,
            vec![
                format!(
                    "{} recomendacao(oes) geradas.",
                    advisor_report.recommendations.len()
                ),
                format!("{} alerta(s) exigem atencao.", advisor_warnings),
            ],
        ),
        stage(
            "clean-scan",
            "clean-engine",
            "Scan de limpeza segura",
            "Prepara a busca por temporarios, caches e logs permitidos.",
            OptimizeStageStatus::Ready,
            true,
            vec![
                "Downloads, Documentos, Desktop, Imagens e Videos permanecem fora do escopo."
                    .to_string(),
                "Limpeza real exigira confirmacao antes de remover arquivos.".to_string(),
            ],
        ),
        stage(
            "startup-scan",
            "startup-engine",
            "Scan de inicializacao",
            "Prepara a classificacao de programas que iniciam com o Windows.",
            OptimizeStageStatus::Ready,
            true,
            vec![
                "Programas nunca serao removidos.".to_string(),
                "Desativar inicializacao exigira confirmacao e registro para reversao.".to_string(),
            ],
        ),
        stage(
            "performance-check",
            "performance-engine",
            "Validacao de desempenho",
            "Prepara verificacoes de energia, modo jogo e processos secundarios.",
            OptimizeStageStatus::Ready,
            true,
            vec![
                "Sem overclock, BIOS ou drivers.".to_string(),
                "Tweaks reais exigirao confirmacao e caminho de rollback.".to_string(),
            ],
        ),
        stage(
            "restore-check",
            "restore-engine",
            "Garantia de reversao",
            "Valida que alteracoes futuras tenham snapshot ou log de reversao.",
            OptimizeStageStatus::Ready,
            true,
            vec![
                "Toda alteracao importante deve poder ser revertida.".to_string(),
                "Snapshots reais serao criados antes de acoes de risco.".to_string(),
            ],
        ),
    ];

    let summary = OptimizeNowSummary {
        total_stages: stages.len(),
        read_only_stages: stages.iter().filter(|stage| stage.read_only).count(),
        confirmation_gates: stages
            .iter()
            .filter(|stage| stage.requires_confirmation_before_changes)
            .count(),
        advisor_recommendations: advisor_report.recommendations.len(),
        advisor_warnings,
    };

    OptimizeNowPlan {
        generated_at: now_timestamp(),
        engine_version: "optimize-now-orchestrator-v1".to_string(),
        read_only: true,
        will_modify_system: false,
        requires_confirmation_before_changes: true,
        telemetry: false,
        resident_process: false,
        summary,
        stages,
        safeguards: vec![
            "Sem telemetria, nuvem ou login.".to_string(),
            "Sem servico residente ou monitoramento permanente.".to_string(),
            "Sem alteracao no Windows durante o plano inicial.".to_string(),
            "Acoes reais so depois de mostrar impacto e pedir confirmacao.".to_string(),
        ],
    }
}

fn stage(
    id: impl Into<String>,
    engine: impl Into<String>,
    title: impl Into<String>,
    description: impl Into<String>,
    status: OptimizeStageStatus,
    requires_confirmation_before_changes: bool,
    outputs: Vec<String>,
) -> OptimizeNowStage {
    OptimizeNowStage {
        id: id.into(),
        engine: engine.into(),
        title: title.into(),
        description: description.into(),
        status,
        read_only: true,
        will_modify_system: false,
        requires_confirmation_before_changes,
        outputs,
    }
}

fn optimize_now_history_path(app: &AppHandle) -> Result<PathBuf, String> {
    let mut dir = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("Nao foi possivel localizar AppData: {err}"))?;
    dir.push("history");
    fs::create_dir_all(&dir)
        .map_err(|err| format!("Nao foi possivel criar historico local: {err}"))?;
    dir.push("optimize_now_plans.json");
    Ok(dir)
}

fn read_history(path: &PathBuf) -> OptimizeNowHistory {
    let Ok(contents) = fs::read_to_string(path) else {
        return OptimizeNowHistory::default();
    };
    serde_json::from_str(&contents).unwrap_or_default()
}

fn write_history(path: &PathBuf, history: &OptimizeNowHistory) -> Result<(), String> {
    let contents = serde_json::to_string_pretty(history)
        .map_err(|err| format!("Nao foi possivel serializar historico local: {err}"))?;
    fs::write(path, contents)
        .map_err(|err| format!("Nao foi possivel gravar historico local: {err}"))
}

fn now_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default();
    seconds.to_string()
}
