import type {
  BenchmarkResult,
  CleanerCategory,
  DiagnosticResult,
  GamerAppProfile,
  HermesTweak,
  OptimizationLog,
  PerformanceProfile,
  RestoreSnapshot,
  StartupApp,
  SystemOverview,
} from "../types";

export const systemOverview: SystemOverview = {
  status: "good",
  cpuUsage: 28,
  ramUsage: 61,
  diskUsage: 47,
  freeSpaceGb: 238,
  tempFilesEstimateMb: 1840,
  performanceMode: "Hermes Safe",
  lastDiagnostic: "03/06/2026 21:10",
  computerName: "HERMES-MOCK",
  operatingSystem: "Windows (fallback mock)",
  windowsVersion: "Mock build",
  architecture: "x64",
  uptimeSeconds: 172800,
  cpuName: "CPU mockada",
  cpuCores: 8,
  ramTotalGb: 16,
  ramUsedGb: 9.8,
  ramFreeGb: 6.2,
  diskName: "C:",
  diskTotalGb: 512,
  diskUsedGb: 274,
  diskFreeGb: 238,
  gpuDetected: true,
  gpuName: "NVIDIA GeForce RTX Mock",
  gpuMemoryGb: 8,
  healthScore: 88,
  healthLabel: "Bom",
  performanceScore: 86,
  stabilityScore: 92,
  storageScore: 90,
  gamingReadinessScore: 84,
};

export const benchmarkResult: BenchmarkResult = {
  id: "bench-mock-1",
  timestamp: "1717450000",
  cpu: {
    elapsedMs: 92,
    iterations: 2000000,
    score: 88,
    classification: "Excelente",
    details: "Loop matemático controlado em thread única; fallback mock seguro.",
  },
  memory: {
    elapsedMs: 18,
    testedMb: 8,
    throughputMbS: 444.4,
    score: 72,
    classification: "Bom",
    details: "Alocação temporária pequena simulada pelo fallback do frontend.",
  },
  disk: {
    elapsedMs: 38,
    testedMb: 4,
    writeMs: 22,
    readMs: 16,
    writeMbS: 181.8,
    readMbS: 250,
    score: 76,
    classification: "Bom",
    details: "Arquivo temporário pequeno em pasta temp; fallback mock não toca no disco.",
  },
  gpu: {
    detected: true,
    name: systemOverview.gpuName,
    dedicatedMemoryMb: systemOverview.gpuMemoryGb * 1024,
    readinessScore: 70,
    classification: "Bom",
    details: "GPU detectada. Benchmark gráfico real será implementado em fase futura.",
  },
  score: {
    cpuScore: 88,
    memoryScore: 72,
    diskScore: 76,
    gpuReadinessScore: 70,
    overallScore: 78,
    gamingReadinessScore: 77,
    stabilityScore: 79,
    classification: "Bom",
    explanation: "Nota ponderada mock: CPU 30%, RAM 25%, Disco 25% e GPU readiness 20%.",
  },
  recommendations: [
    { id: "disk-light", title: "Disco", severity: "info", message: "Seu disco apresentou leitura/escrita saudável para teste leve." },
    { id: "memory-light", title: "RAM", severity: "info", message: "Sua RAM respondeu bem no teste controlado." },
    { id: "gpu-readiness", title: "GPU", severity: "info", message: "GPU integrada/dedicada detectada; desempenho gamer pode variar conforme o jogo." },
    { id: "professional-tests", title: "Limitação", severity: "info", message: "Este benchmark é leve e não substitui testes profissionais." },
  ],
  summary: "Benchmark leve mock concluído com nota 78/100 (Bom).",
  hardwareSnapshot: {
    cpuName: systemOverview.cpuName,
    cpuThreads: systemOverview.cpuCores,
    memoryTotalGb: systemOverview.ramTotalGb,
    primaryDisk: `${systemOverview.diskName} SSD`,
    gpuName: systemOverview.gpuName,
    gpuDetected: systemOverview.gpuDetected,
    gpuMemoryMb: systemOverview.gpuMemoryGb * 1024,
    dataSource: "Fallback mock do frontend",
  },
  safetyNote: "Fallback local; nenhuma configuração será alterada.",
  dataSource: "Mock local do frontend para uso fora do runtime Tauri.",
};

export const diagnostics: DiagnosticResult[] = [
  { id: "cpu", title: "CPU", status: "ok", value: "28% em uso", description: "Carga atual está dentro do esperado.", recommendation: "Continue monitorando.", penalty: 0 },
  { id: "ram", title: "Memória RAM", status: "attention", value: "61% em uso", description: "Há margem para revisar apps em segundo plano.", recommendation: "Revise apps abertos se houver lentidão.", penalty: 5 },
  { id: "disk", title: "Disco", status: "ok", value: "238 GB livres", description: "Espaço livre saudável para operação normal.", recommendation: "Nenhuma ação necessária.", penalty: 0 },
  { id: "startup", title: "Inicialização", status: "warning", value: "3 apps com impacto", description: "Alguns apps podem atrasar o boot.", recommendation: "Revise os itens de inicialização.", penalty: 4 },
  { id: "background", title: "Processos em segundo plano", status: "attention", value: "18 processos", description: "Revisão manual recomendada antes de qualquer ação.", recommendation: "Aguarde ações futuras com confirmação.", penalty: 3 },
  { id: "power", title: "Energia", status: "ok", value: "Equilibrado", description: "Plano seguro para uso diário.", recommendation: "Nenhuma ação necessária.", penalty: 0 },
  { id: "graphics", title: "Gráficos", status: "ok", value: "Configuração padrão", description: "Perfis por app poderão ser configurados futuramente.", recommendation: "GPU preparada para leitura futura.", penalty: 0 },
  { id: "windows", title: "Integridade do Windows", status: "ok", value: "Sem alertas", description: "Nenhum ajuste de segurança será aplicado nesta versão.", recommendation: "Sem alteração de Defender, Firewall ou Update.", penalty: 0 },
];

export const cleanerCategories: CleanerCategory[] = [
  { id: "user-temp", name: "Arquivos temporários do usuário", description: "Itens temporários seguros, sem incluir Downloads ou documentos.", estimatedSizeMb: 620, selected: true, safeToClean: true, requiresConfirmation: true, reversible: false },
  { id: "system-cache", name: "Cache de sistema", description: "Cache comum do sistema. A limpeza real exigirá confirmação e backend.", estimatedSizeMb: 410, selected: true, safeToClean: true, requiresConfirmation: true, reversible: false },
  { id: "recycle-bin", name: "Lixeira", description: "Conteúdo da lixeira. Nunca será esvaziada automaticamente.", estimatedSizeMb: 320, selected: false, safeToClean: true, requiresConfirmation: true, reversible: false },
  { id: "old-logs", name: "Logs antigos", description: "Logs antigos não críticos de aplicativos e sistema.", estimatedSizeMb: 145, selected: true, safeToClean: true, requiresConfirmation: true, reversible: true },
  { id: "browser-cache", name: "Cache de navegador", description: "Cache temporário de navegadores, preservando senhas e histórico.", estimatedSizeMb: 280, selected: false, safeToClean: true, requiresConfirmation: true, reversible: false },
  { id: "thumbs", name: "Thumbnails", description: "Miniaturas recriáveis pelo Windows quando necessário.", estimatedSizeMb: 55, selected: true, safeToClean: true, requiresConfirmation: true, reversible: false },
  { id: "updates", name: "Arquivos de atualização antigos", description: "Resíduos de updates antigos. A ação real terá validações adicionais.", estimatedSizeMb: 910, selected: false, safeToClean: true, requiresConfirmation: true, reversible: true },
];

export const startupApps: StartupApp[] = [
  { id: "drive", name: "Cloud Drive Sync", publisher: "Fornecedor confiável", path: "C:\\Program Files\\CloudDrive\\drive.exe", impact: "medium", enabled: true, status: "Ativo", origin: "Mock fallback", risk: "low", suggestedAction: "Manter se você depende de sincronização imediata." },
  { id: "chat", name: "Chat Launcher", publisher: "Hermes Mock Labs", path: "C:\\Users\\User\\AppData\\Local\\Chat\\chat.exe", impact: "high", enabled: true, status: "Ativo", origin: "Mock fallback", risk: "medium", suggestedAction: "Avaliar desativação para boot mais rápido." },
  { id: "gpu", name: "GPU Control Panel", publisher: "Fabricante da GPU", path: "C:\\Program Files\\GPU\\panel.exe", impact: "low", enabled: true, status: "Ativo", origin: "Mock fallback", risk: "low", suggestedAction: "Manter ativo para recursos gráficos." },
  { id: "updater", name: "Generic Updater", publisher: "Desconhecido", path: "C:\\Program Files\\Generic\\update.exe", impact: "medium", enabled: false, status: "Desativado", origin: "Mock fallback", risk: "medium", suggestedAction: "Verificar origem antes de reativar." },
];

export const tweaks: HermesTweak[] = [
  { id: "safe-animations", name: "Reduzir animações visuais", description: "Diminui transições visuais para tornar a interface mais responsiva.", category: "Interface", risk: "low", mode: "safe", requiresAdmin: false, reversible: true, enabled: false, recommended: true, benefit: "Sensação de resposta mais rápida.", reversalPlan: "Reverter pelo snapshot lógico/futuro plano de reversão documentado." },
  { id: "safe-transparency", name: "Desativar transparência", description: "Reduz efeitos de transparência em áreas do Windows.", category: "Interface", risk: "low", mode: "safe", requiresAdmin: false, reversible: true, enabled: false, recommended: true, benefit: "Menor uso gráfico em máquinas modestas.", reversalPlan: "Reverter pelo snapshot lógico/futuro plano de reversão documentado." },
  { id: "safe-temp", name: "Limpar temporários", description: "Executa limpeza segura com categorias revisadas e confirmação.", category: "Disco", risk: "low", mode: "safe", requiresAdmin: false, reversible: false, enabled: false, recommended: true, benefit: "Recupera espaço sem tocar em arquivos pessoais.", reversalPlan: "Reverter pelo snapshot lógico/futuro plano de reversão documentado." },
  { id: "safe-startup", name: "Revisar apps de inicialização", description: "Mostra apps de boot para decisão manual do usuário.", category: "Inicialização", risk: "low", mode: "safe", requiresAdmin: false, reversible: true, enabled: false, recommended: true, benefit: "Ajuda a reduzir tempo de inicialização.", reversalPlan: "Reverter pelo snapshot lógico/futuro plano de reversão documentado." },
  { id: "safe-game-mode", name: "Ativar modo jogo", description: "Prepara alternância segura do modo jogo do Windows.", category: "Jogos", risk: "low", mode: "safe", requiresAdmin: false, reversible: true, enabled: false, recommended: true, benefit: "Prioriza estabilidade durante jogos compatíveis.", reversalPlan: "Reverter pelo snapshot lógico/futuro plano de reversão documentado." },
  { id: "safe-power", name: "Plano melhor desempenho", description: "Sugere plano de energia mais performático com explicação de consumo.", category: "Energia", risk: "medium", mode: "safe", requiresAdmin: false, reversible: true, enabled: false, recommended: false, benefit: "Pode reduzir economia agressiva de energia.", reversalPlan: "Reverter pelo snapshot lógico/futuro plano de reversão documentado.", warning: "Pode aumentar consumo e temperatura." },
  { id: "safe-visual-balanced", name: "Efeitos visuais equilibrados", description: "Prepara um preset balanceado de efeitos visuais.", category: "Sistema", risk: "low", mode: "safe", requiresAdmin: false, reversible: true, enabled: false, recommended: true, benefit: "Equilíbrio entre aparência e desempenho.", reversalPlan: "Reverter pelo snapshot lógico/futuro plano de reversão documentado." },
  { id: "gamer-gpu", name: "App/jogo em alto desempenho gráfico", description: "Perfil visual para selecionar um executável e sugerir GPU de alto desempenho.", category: "Gráficos", risk: "medium", mode: "gamer", requiresAdmin: false, reversible: true, enabled: false, recommended: true, benefit: "Ajuda jogos a usarem a GPU correta.", reversalPlan: "Reverter pelo snapshot lógico/futuro plano de reversão documentado." },
  { id: "gamer-power", name: "Alto desempenho de energia", description: "Sugere plano de energia de alto desempenho para sessão de jogo.", category: "Energia", risk: "medium", mode: "gamer", requiresAdmin: false, reversible: true, enabled: false, recommended: true, benefit: "Reduz economia de energia durante jogos.", reversalPlan: "Reverter pelo snapshot lógico/futuro plano de reversão documentado.", warning: "Pode elevar consumo e ruído das ventoinhas." },
  { id: "gamer-close-processes", name: "Fechar processos selecionados", description: "Fecha apenas processos escolhidos antes de jogar, com restauração quando aplicável.", category: "Jogos", risk: "medium", mode: "gamer", requiresAdmin: false, reversible: true, enabled: false, recommended: true, benefit: "Libera recursos sem encerrar serviços críticos.", reversalPlan: "Reverter pelo snapshot lógico/futuro plano de reversão documentado." },
  { id: "gamer-launchers", name: "Suspender launchers inativos", description: "Prepara suspensão temporária de launchers selecionados pelo usuário.", category: "Jogos", risk: "medium", mode: "gamer", requiresAdmin: false, reversible: true, enabled: false, recommended: false, benefit: "Menos processos competindo por RAM/CPU.", reversalPlan: "Reverter pelo snapshot lógico/futuro plano de reversão documentado." },
  { id: "gamer-overlays", name: "Reduzir overlays desnecessários", description: "Lista overlays detectados para decisão manual.", category: "Jogos", risk: "low", mode: "gamer", requiresAdmin: false, reversible: true, enabled: false, recommended: true, benefit: "Pode reduzir conflitos e distrações.", reversalPlan: "Reverter pelo snapshot lógico/futuro plano de reversão documentado." },
  { id: "gamer-priority", name: "Priorizar processo do jogo", description: "Prepara prioridade temporária e reversível para o processo escolhido.", category: "Sistema", risk: "medium", mode: "gamer", requiresAdmin: false, reversible: true, enabled: false, recommended: false, benefit: "Pode ajudar em cenários de CPU limitada.", reversalPlan: "Reverter pelo snapshot lógico/futuro plano de reversão documentado.", warning: "Não garante aumento de FPS." },
  { id: "gamer-restore", name: "Restaurar ao fechar o jogo", description: "Snapshot lógico para reverter mudanças temporárias da sessão gamer.", category: "Jogos", risk: "low", mode: "gamer", requiresAdmin: false, reversible: true, enabled: false, recommended: true, benefit: "Mantém previsibilidade após jogar.", reversalPlan: "Reverter pelo snapshot lógico/futuro plano de reversão documentado." },
  { id: "ext-services", name: "Reduzir serviços não essenciais", description: "Catálogo futuro de serviços opcionais com revisão manual.", category: "Serviços", risk: "high", mode: "extreme", requiresAdmin: true, reversible: true, enabled: false, recommended: false, benefit: "Pode reduzir carga em instalações específicas.", reversalPlan: "Reverter pelo snapshot lógico/futuro plano de reversão documentado.", warning: "Versão inicial não altera serviços reais." },
  { id: "ext-index", name: "Ajustar indexação", description: "Permite revisar locais indexados sem tocar em documentos pessoais automaticamente.", category: "Disco", risk: "medium", mode: "extreme", requiresAdmin: true, reversible: true, enabled: false, recommended: false, benefit: "Menos atividade de disco em alguns cenários.", reversalPlan: "Reverter pelo snapshot lógico/futuro plano de reversão documentado." },
  { id: "ext-background", name: "Limitar apps em segundo plano", description: "Prepara revisão de permissões de apps em segundo plano.", category: "Privacidade", risk: "medium", mode: "extreme", requiresAdmin: false, reversible: true, enabled: false, recommended: false, benefit: "Menos tarefas concorrentes.", reversalPlan: "Reverter pelo snapshot lógico/futuro plano de reversão documentado." },
  { id: "ext-power", name: "Tweaks avançados de energia", description: "Grupo futuro de ajustes avançados com confirmação forte.", category: "Energia", risk: "high", mode: "extreme", requiresAdmin: true, reversible: true, enabled: false, recommended: false, benefit: "Desempenho máximo em cenários controlados.", reversalPlan: "Reverter pelo snapshot lógico/futuro plano de reversão documentado.", warning: "Pode aumentar consumo, temperatura e ruído." },
  { id: "ext-telemetry", name: "Ajustes de telemetria permitidos", description: "Somente opções permitidas e documentadas, sem comprometer segurança.", category: "Privacidade", risk: "medium", mode: "extreme", requiresAdmin: true, reversible: true, enabled: false, recommended: false, benefit: "Mais controle de privacidade onde suportado.", reversalPlan: "Reverter pelo snapshot lógico/futuro plano de reversão documentado." },
  { id: "ext-advanced", name: "Otimizações avançadas com aviso forte", description: "Área reservada para otimizações futuras de alto risco e alta transparência.", category: "Rede", risk: "high", mode: "extreme", requiresAdmin: true, reversible: true, enabled: false, recommended: false, benefit: "Ajustes especializados com reversão planejada.", reversalPlan: "Reverter pelo snapshot lógico/futuro plano de reversão documentado.", warning: "Não executado nesta base inicial." },
];

export const profiles: PerformanceProfile[] = [
  { id: "safe", name: "Hermes Safe", objective: "Segurança e estabilidade", tweakCount: 7, risk: "low", mode: "safe", description: "Perfil recomendado para uso diário, com ações conservadoras e transparentes.", includedTweaks: ["Reduzir animações", "Desativar transparência", "Revisar inicialização"] },
  { id: "gamer", name: "Hermes Gamer", objective: "Jogos, latência e redução de processos", tweakCount: 7, risk: "medium", mode: "gamer", description: "Sessão temporária para jogos, sempre com restauração planejada.", includedTweaks: ["Plano alto desempenho", "Perfil gráfico", "Reduzir overlays"] },
  { id: "workstation", name: "Hermes Workstation", objective: "Edição, renderização e multitarefa", tweakCount: 6, risk: "medium", mode: "safe", description: "Preset para produtividade pesada sem sacrificar segurança do Windows.", includedTweaks: ["Energia equilibrada", "Inicialização revisada", "Cache monitorado"] },
  { id: "extreme", name: "Hermes Extreme", objective: "Desempenho máximo com avisos fortes", tweakCount: 8, risk: "high", mode: "extreme", description: "Perfil avançado reservado para usuários experientes. Nesta versão é apenas simulado.", includedTweaks: ["Serviços opcionais", "Indexação", "Energia avançada"] },
];

export const logs: OptimizationLog[] = [
  { id: "log-1", date: "03/06/2026 21:10", action: "Diagnóstico executado", module: "Diagnóstico", result: "success", risk: "low", details: "Coleta simulada concluída sem ações no sistema." },
  { id: "log-2", date: "03/06/2026 21:12", action: "Perfil Gamer simulado", module: "Perfis", result: "simulated", risk: "medium", details: "Aguardando implementação real via backend Rust/Tauri." },
  { id: "log-3", date: "03/06/2026 21:15", action: "Snapshot criado", module: "Restauração", result: "simulated", risk: "low", details: "Snapshot lógico para futura reversão." },
];

export const snapshots: RestoreSnapshot[] = [
  { id: "snap-1", date: "03/06/2026 21:15", profileApplied: "Hermes Gamer", tweaksApplied: ["Plano alto desempenho", "Reduzir overlays"], status: "simulated", reversible: true },
  { id: "snap-2", date: "03/06/2026 20:50", profileApplied: "Hermes Safe", tweaksApplied: ["Reduzir animações", "Revisar inicialização"], status: "available", reversible: true },
];

export const gamerApps: GamerAppProfile[] = [
  { id: "game-1", name: "Exemplo Arena", executablePath: "C:\\Games\\ExemploArena\\arena.exe", graphicsProfile: "high-performance", powerPlan: "high-performance", processesToClose: ["chat-launcher.exe", "updater.exe"], restoreOnExit: true },
];
