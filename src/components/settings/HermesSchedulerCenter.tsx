import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  Gauge,
  History,
  ListChecks,
  Loader2,
  LockKeyhole,
  Play,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { loadAdvisorAiReport } from "@/lib/advisor-ai";
import { runBenchmark } from "@/lib/benchmark";
import { loadCleanScanReport } from "@/lib/clean";
import { loadDiagnosticReport } from "@/lib/diagnostic";
import { loadPerformanceReport } from "@/lib/performance";
import { loadStartupReport } from "@/lib/startup";
import { Switch } from "@/components/ui/switch";

type SchedulerTaskType = "benchmark" | "diagnostic" | "cleanScan" | "advisorAi" | "startupCheck" | "performanceCheck" | "report";
type SchedulerFrequency = "manual" | "daily" | "weekly" | "monthly" | "onOpen";
type SchedulerStatus = "success" | "prepared" | "skipped" | "failed";

type SchedulerTask = {
  id: string;
  type: SchedulerTaskType;
  frequency: SchedulerFrequency;
  enabled: boolean;
  createdAt: string;
  lastRunAt?: string;
  nextRunAt?: string;
};

type SchedulerHistoryEntry = {
  id: string;
  startedAt: string;
  taskType: SchedulerTaskType;
  taskTitle: string;
  result: string;
  durationMs: number;
  status: SchedulerStatus;
  notificationPrepared: boolean;
};

type NotificationPreferences = {
  system: boolean;
  aiReports: boolean;
  cleanupDone: boolean;
  snapshotsCreated: boolean;
  performanceAlerts: boolean;
};

const TASKS_KEY = "hermes.scheduler.tasks.v1";
const HISTORY_KEY = "hermes.scheduler.history.v1";
const ADMIN_PREFS_KEY = "hermes.admin.preferences.v1";
const MAX_HISTORY = 30;

const defaultTasks: SchedulerTask[] = [
  defaultTask("diagnostic", "onOpen", true),
  defaultTask("cleanScan", "weekly", true),
  defaultTask("advisorAi", "weekly", true),
  defaultTask("startupCheck", "weekly", true),
  defaultTask("performanceCheck", "weekly", true),
  defaultTask("benchmark", "manual", true),
  defaultTask("report", "monthly", true),
];

const taskOptions: Array<{
  type: SchedulerTaskType;
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  { type: "benchmark", title: "Benchmark automatico", description: "Executa benchmark leve permitido.", icon: BarChart3 },
  { type: "diagnostic", title: "Diagnostico automatico", description: "Le saude, CPU, RAM, disco e seguranca.", icon: ShieldCheck },
  { type: "cleanScan", title: "Limpeza segura", description: "Faz apenas scan de limpeza, sem apagar arquivos.", icon: Sparkles },
  { type: "advisorAi", title: "Relatorio Hermes AI", description: "Gera analise local read-only.", icon: BrainCircuit },
  { type: "startupCheck", title: "Verificacao de inicializacao", description: "Le apps de inicializacao, sem desativar.", icon: Zap },
  { type: "performanceCheck", title: "Verificacao de desempenho", description: "Le plano de energia e ajustes visuais.", icon: Gauge },
  { type: "report", title: "Geracao de relatorio", description: "Agrupa leituras locais conservadoras.", icon: FileText },
];

const frequencyOptions: Array<{ value: SchedulerFrequency; label: string; description: string }> = [
  { value: "manual", label: "Manual", description: "Somente por clique" },
  { value: "daily", label: "Diario", description: "Quando estiver vencido" },
  { value: "weekly", label: "Semanal", description: "A cada 7 dias" },
  { value: "monthly", label: "Mensal", description: "A cada 30 dias" },
  { value: "onOpen", label: "Ao abrir", description: "Uma vez ao dia" },
];

export function HermesSchedulerCenter() {
  const [tasks, setTasks] = useState<SchedulerTask[]>([]);
  const [history, setHistory] = useState<SchedulerHistoryEntry[]>([]);
  const [selectedType, setSelectedType] = useState<SchedulerTaskType>("diagnostic");
  const [selectedFrequency, setSelectedFrequency] = useState<SchedulerFrequency>("weekly");
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const notifications = useMemo(readNotificationPreferences, []);

  useEffect(() => {
    const loadedTasks = readTasks();
    setTasks(loadedTasks);
    setHistory(readHistory());

    const onOpenTasks = loadedTasks.filter((task) => task.enabled && task.frequency === "onOpen" && isTaskDue(task));
    if (onOpenTasks.length > 0) {
      void runTaskQueue(onOpenTasks, "Execucao ao abrir a central");
    }
  }, []);

  const pendingTasks = useMemo(() => tasks.filter((task) => task.enabled && task.frequency !== "manual" && isTaskDue(task)), [tasks]);
  const enabledTasks = tasks.filter((task) => task.enabled).length;
  const latestRun = history[0];

  function addTask() {
    const task = {
      ...defaultTask(selectedType, selectedFrequency, true),
      id: `scheduler-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
    };
    commitTasks([task, ...tasks]);
    setNotice("Tarefa adicionada e salva localmente.");
  }

  function removeTask(taskId: string) {
    const confirmed = window.confirm("Remover esta tarefa programada local? O historico de execucoes sera mantido.");
    if (!confirmed) {
      return;
    }

    commitTasks(tasks.filter((task) => task.id !== taskId));
    setNotice("Tarefa removida localmente.");
  }

  function updateTask(taskId: string, patch: Partial<SchedulerTask>) {
    commitTasks(tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)));
  }

  function commitTasks(nextTasks: SchedulerTask[]) {
    const normalized = nextTasks.map((task) => ({
      ...task,
      nextRunAt: calculateNextRun(task),
    }));
    saveTasks(normalized);
    setTasks(normalized);
  }

  async function runTaskQueue(queue: SchedulerTask[], reason: string) {
    if (runningTaskId) {
      return;
    }

    setNotice(`${reason}: ${queue.length} tarefa(s) conservadora(s) em fila.`);
    for (const task of queue) {
      await runTask(task);
    }
  }

  async function runTask(task: SchedulerTask) {
    setRunningTaskId(task.id);
    setNotice(null);
    setError(null);
    const startedAt = performance.now();

    try {
      const result = await executeTask(task.type);
      const durationMs = Math.max(1, Math.round(performance.now() - startedAt));
      const entry = buildHistoryEntry(task, result.message, durationMs, result.status, shouldPrepareNotification(task.type, notifications));
      commitHistory(entry);
      const updatedTask = {
        ...task,
        lastRunAt: new Date().toISOString(),
      };
      commitTasks(tasks.map((item) => (item.id === task.id ? updatedTask : item)));
      setNotice(result.message);
    } catch (nextError) {
      const durationMs = Math.max(1, Math.round(performance.now() - startedAt));
      const message = errorMessage(nextError);
      const entry = buildHistoryEntry(task, message, durationMs, "failed", false);
      commitHistory(entry);
      setError(message);
    } finally {
      setRunningTaskId(null);
    }
  }

  function commitHistory(entry: SchedulerHistoryEntry) {
    setHistory((current) => {
      const next = [entry, ...current].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
  }

  return (
    <section id="manutencao-programada" className="scroll-mt-5 mt-5 rounded-2xl border border-border/60 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_34px_-20px_rgba(15,23,42,0.16)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <CalendarClock className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-[0.22em] text-primary">SCHEDULER ENGINE</p>
            <h2 className="mt-1 text-lg font-bold text-foreground">Manutencao Programada</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Tarefas locais e conservadoras. O Hermes nao instala servico residente, nao monitora continuamente e nao executa ajustes agressivos automaticamente.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => runTaskQueue(pendingTasks, "Tarefas vencidas")}
          disabled={pendingTasks.length === 0 || Boolean(runningTaskId)}
          className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[0_10px_26px_-14px_rgba(37,99,235,0.85)] transition hover:bg-primary/95 disabled:opacity-60"
        >
          {runningTaskId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Executar pendentes
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
        <div className="flex items-start gap-2 text-sm text-primary">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Sem processo residente. As tarefas rodam manualmente, ao abrir esta central ou quando o Hermes detectar pendencias locais.</span>
        </div>
      </div>

      {notice && <Notice tone="success" text={notice} />}
      {error && <Notice tone="danger" text={error} />}

      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-4">
        <StatusCard icon={ListChecks} label="TAREFAS" value={`${tasks.length}`} sub={`${enabledTasks} ativa(s)`} />
        <StatusCard icon={Clock3} label="PENDENTES" value={`${pendingTasks.length}`} sub="Sem monitoramento continuo" tone={pendingTasks.length > 0 ? "warning" : "success"} />
        <StatusCard icon={History} label="HISTORICO" value={`${history.length}`} sub={`Retencao local: ${MAX_HISTORY}`} />
        <StatusCard
          icon={Bell}
          label="NOTIFICACOES"
          value={notifications.system ? "Preparadas" : "Desligadas"}
          sub="Integrado as preferencias locais"
          tone={notifications.system ? "primary" : "warning"}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-[12px] font-bold tracking-[0.18em] text-primary">CRIAR TAREFA</h3>
                <p className="mt-1 text-[12px] text-muted-foreground">Somente execucoes permitidas: benchmark, diagnostico, scans e relatorios locais.</p>
              </div>
              <button
                type="button"
                onClick={addTask}
                className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                <Plus className="h-4 w-4 text-primary" />
                Adicionar
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <OptionGrid
                label="Tarefa"
                value={selectedType}
                options={taskOptions.map((option) => ({
                  value: option.type,
                  label: option.title,
                  description: option.description,
                }))}
                onChange={setSelectedType}
              />
              <OptionGrid
                label="Frequencia"
                value={selectedFrequency}
                options={frequencyOptions}
                onChange={setSelectedFrequency}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-[12px] font-bold tracking-[0.18em] text-primary">TAREFAS PROGRAMADAS</h3>
                <p className="mt-1 text-[12px] text-muted-foreground">Configurações salvas localmente, sem conta e sem nuvem.</p>
              </div>
              <span className="w-fit rounded-full border border-success/20 bg-success/10 px-3 py-1 text-[10px] font-bold text-success">
                Conservador
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    running={runningTaskId === task.id}
                    onRun={() => runTask(task)}
                    onRemove={() => removeTask(task.id)}
                    onEnabledChange={(enabled) => updateTask(task.id, { enabled })}
                    onFrequencyChange={(frequency) => updateTask(task.id, { frequency })}
                  />
                ))
              ) : (
                <EmptyState icon={CalendarClock} title="Nenhuma tarefa" sub="Adicione uma tarefa conservadora para iniciar a manutencao programada." />
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <h3 className="text-[12px] font-bold tracking-[0.18em] text-primary">ACOES NAO PERMITIDAS AUTOMATICAMENTE</h3>
            <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
              {[
                "Aplicar Perfil Extremo",
                "Desabilitar servicos",
                "Alterar Registro automaticamente",
                "Executar reparos destrutivos",
                "Executar comandos perigosos",
                "Apagar arquivos sem confirmacao",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 rounded-xl border border-warning/25 bg-warning/10 px-3 py-3 text-sm font-semibold text-warning">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <h3 className="text-[12px] font-bold tracking-[0.18em] text-primary">HISTORICO LOCAL</h3>
            <div className="mt-3 space-y-2">
              {history.length > 0 ? (
                history.slice(0, 10).map((entry) => <HistoryRow key={entry.id} entry={entry} />)
              ) : (
                <EmptyState icon={History} title="Sem execucoes" sub="Data, tarefa, resultado, duracao e status aparecerao aqui." />
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <h3 className="text-[12px] font-bold tracking-[0.18em] text-primary">RELATORIOS E NOTIFICACOES</h3>
            <div className="mt-3 space-y-2">
              <InfoRow icon={Bell} title="Benchmark concluido" enabled={notifications.system} />
              <InfoRow icon={Sparkles} title="Limpeza concluida" enabled={notifications.cleanupDone} />
              <InfoRow icon={BrainCircuit} title="Relatorio Hermes gerado" enabled={notifications.aiReports} />
              <InfoRow icon={Gauge} title="Problemas detectados" enabled={notifications.performanceAlerts} />
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

async function executeTask(type: SchedulerTaskType): Promise<{ status: SchedulerStatus; message: string }> {
  if (type === "benchmark") {
    const report = await runBenchmark();
    return { status: "success", message: `Benchmark concluido: score ${report.score}/100. ${report.verdict}` };
  }

  if (type === "diagnostic") {
    const report = await loadDiagnosticReport();
    return { status: "success", message: `Diagnostico concluido: ${report.healthLabel}, score ${Math.round(report.healthScore)}/100.` };
  }

  if (type === "cleanScan") {
    const report = await loadCleanScanReport();
    return { status: "success", message: `Clean Scan concluido: ${formatGb(report.totalGb)} GB candidatos. Nada foi apagado.` };
  }

  if (type === "advisorAi") {
    const report = await loadAdvisorAiReport();
    return {
      status: report.hermesScore.status === "unavailable" ? "prepared" : "success",
      message: `Hermes AI analisou ${report.recommendations.length} recomendacao(oes). Score: ${report.hermesScore.value ?? "indisponivel"}.`,
    };
  }

  if (type === "startupCheck") {
    const report = await loadStartupReport();
    return { status: "success", message: `Inicializacao verificada: ${report.totalItems} item(ns), ${report.highImpactCount} alto impacto.` };
  }

  if (type === "performanceCheck") {
    const report = await loadPerformanceReport();
    return { status: "success", message: `Desempenho verificado: plano ${report.powerPlan.activeSchemeName}, Game Mode ${report.gameMode.status}.` };
  }

  const [diagnostic, clean, startup, performance, ai] = await Promise.all([
    loadDiagnosticReport(),
    loadCleanScanReport(),
    loadStartupReport(),
    loadPerformanceReport(),
    loadAdvisorAiReport(),
  ]);

  return {
    status: "success",
    message: `Relatorio gerado: score ${Math.round(diagnostic.healthScore)}/100, ${formatGb(clean.totalGb)} GB limpeza, ${startup.totalItems} startup, plano ${performance.powerPlan.activeSchemeName}, ${ai.recommendations.length} recomendacao(oes).`,
  };
}

function TaskRow({
  task,
  running,
  onRun,
  onRemove,
  onEnabledChange,
  onFrequencyChange,
}: {
  task: SchedulerTask;
  running: boolean;
  onRun: () => void;
  onRemove: () => void;
  onEnabledChange: (enabled: boolean) => void;
  onFrequencyChange: (frequency: SchedulerFrequency) => void;
}) {
  const config = taskConfig(task.type);
  const Icon = config.icon;
  const due = task.enabled && task.frequency !== "manual" && isTaskDue(task);

  return (
    <div className="rounded-2xl border border-border/70 bg-card px-3 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-foreground">{config.title}</p>
              {due && <span className="rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 text-[10px] font-bold text-warning">Pendente</span>}
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{config.description}</p>
            <p className="mt-1 text-[11px] font-semibold text-muted-foreground">Proxima: {task.nextRunAt ? formatDate(task.nextRunAt) : "Manual"}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Switch checked={task.enabled} onCheckedChange={onEnabledChange} aria-label={`Ativar ${config.title}`} />
          <button
            type="button"
            onClick={onRun}
            disabled={running || !task.enabled}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground transition hover:bg-primary/95 disabled:opacity-60"
          >
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Executar
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:bg-muted"
            aria-label={`Remover ${config.title}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3">
        <OptionGrid label="Frequencia" value={task.frequency} options={frequencyOptions} onChange={onFrequencyChange} compact />
      </div>
    </div>
  );
}

function OptionGrid<T extends string>({
  label,
  value,
  options,
  onChange,
  compact,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; description: string }>;
  onChange: (value: T) => void;
  compact?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card px-3 py-3">
      <p className="text-[11px] font-bold tracking-[0.16em] text-primary">{label}</p>
      <div className={`mt-3 grid grid-cols-1 gap-2 ${compact ? "sm:grid-cols-5" : "md:grid-cols-2 2xl:grid-cols-4"}`}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`min-h-14 rounded-xl border px-3 py-2 text-left transition ${
                active ? "border-primary bg-primary/10 text-primary" : "border-border/70 bg-background/70 text-foreground hover:border-primary/35"
              }`}
            >
              <span className="block text-sm font-bold">{option.label}</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">{option.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "primary",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  tone?: "primary" | "success" | "warning" | "danger";
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClass(tone)}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-wider text-muted-foreground">{label}</p>
          <p className="text-lg font-bold leading-tight text-foreground">{value}</p>
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{sub}</p>
    </div>
  );
}

function HistoryRow({ entry }: { entry: SchedulerHistoryEntry }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">{entry.taskTitle}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{entry.result}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            <span>{formatDate(entry.startedAt)}</span>
            <span>{entry.durationMs} ms</span>
            {entry.notificationPrepared && <span>Notificacao preparada</span>}
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusPillClass(entry.status)}`}>
          {statusLabel(entry.status)}
        </span>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, title, enabled }: { icon: LucideIcon; title: string; enabled: boolean }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-border/70 bg-card px-3 py-3">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${enabled ? "text-primary" : "text-muted-foreground"}`} />
      <div>
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="mt-1 text-[12px] text-muted-foreground">{enabled ? "Preferencia habilitada" : "Preferencia desativada"}</p>
      </div>
    </div>
  );
}

function Notice({ tone, text }: { tone: "success" | "danger"; text: string }) {
  return (
    <div className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${tone === "success" ? "border-success/20 bg-success/10 text-success" : "border-destructive/20 bg-destructive/10 text-destructive"}`}>
      {text}
    </div>
  );
}

function EmptyState({ icon: Icon, title, sub }: { icon: LucideIcon; title: string; sub: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/70 px-4 py-5 text-center">
      <Icon className="mx-auto h-6 w-6 text-muted-foreground" />
      <p className="mt-2 text-sm font-bold text-foreground">{title}</p>
      <p className="mt-1 text-[12px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function defaultTask(type: SchedulerTaskType, frequency: SchedulerFrequency, enabled: boolean): SchedulerTask {
  const task = {
    id: `scheduler-${type}-${frequency}`,
    type,
    frequency,
    enabled,
    createdAt: new Date().toISOString(),
  };

  return {
    ...task,
    nextRunAt: calculateNextRun(task),
  };
}

function taskConfig(type: SchedulerTaskType) {
  return taskOptions.find((option) => option.type === type) ?? taskOptions[0];
}

function calculateNextRun(task: Pick<SchedulerTask, "frequency" | "lastRunAt">) {
  if (task.frequency === "manual") {
    return undefined;
  }

  const base = task.lastRunAt ? new Date(task.lastRunAt) : new Date();
  const next = new Date(base);

  if (task.frequency === "onOpen") {
    next.setDate(next.getDate() + 1);
  } else if (task.frequency === "daily") {
    next.setDate(next.getDate() + 1);
  } else if (task.frequency === "weekly") {
    next.setDate(next.getDate() + 7);
  } else {
    next.setDate(next.getDate() + 30);
  }

  return next.toISOString();
}

function isTaskDue(task: SchedulerTask) {
  if (!task.enabled || task.frequency === "manual") {
    return false;
  }

  if (!task.lastRunAt) {
    return task.frequency === "onOpen";
  }

  const nextRun = task.nextRunAt ? new Date(task.nextRunAt) : new Date(calculateNextRun(task) ?? Date.now());
  return Date.now() >= nextRun.getTime();
}

function buildHistoryEntry(
  task: SchedulerTask,
  result: string,
  durationMs: number,
  status: SchedulerStatus,
  notificationPrepared: boolean,
): SchedulerHistoryEntry {
  return {
    id: `scheduler-history-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    startedAt: new Date().toISOString(),
    taskType: task.type,
    taskTitle: taskConfig(task.type).title,
    result,
    durationMs,
    status,
    notificationPrepared,
  };
}

function readTasks(): SchedulerTask[] {
  if (typeof window === "undefined") {
    return defaultTasks;
  }

  try {
    const raw = window.localStorage.getItem(TASKS_KEY);
    if (!raw) {
      saveTasks(defaultTasks);
      return defaultTasks;
    }

    const parsed = JSON.parse(raw) as SchedulerTask[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed.map((task) => ({ ...task, nextRunAt: calculateNextRun(task) })) : defaultTasks;
  } catch (error) {
    console.warn("Falha ao ler tarefas programadas Hermes.", error);
    return defaultTasks;
  }
}

function saveTasks(tasks: SchedulerTask[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

function readHistory(): SchedulerHistoryEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as SchedulerHistoryEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : [];
  } catch (error) {
    console.warn("Falha ao ler historico do Scheduler Hermes.", error);
    return [];
  }
}

function saveHistory(history: SchedulerHistoryEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function readNotificationPreferences(): NotificationPreferences {
  const fallback: NotificationPreferences = {
    system: false,
    aiReports: false,
    cleanupDone: false,
    snapshotsCreated: false,
    performanceAlerts: false,
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(ADMIN_PREFS_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as { notifications?: Partial<NotificationPreferences> };
    return {
      ...fallback,
      ...parsed.notifications,
    };
  } catch (error) {
    console.warn("Falha ao ler preferencias de notificacao Hermes.", error);
    return fallback;
  }
}

function shouldPrepareNotification(type: SchedulerTaskType, notifications: NotificationPreferences) {
  if (!notifications.system) {
    return false;
  }

  if (type === "advisorAi" || type === "report") return notifications.aiReports;
  if (type === "cleanScan") return notifications.cleanupDone;
  if (type === "benchmark") return notifications.performanceAlerts;
  if (type === "performanceCheck") return notifications.performanceAlerts;
  return true;
}

function statusPillClass(status: SchedulerStatus) {
  if (status === "success") return "border-success/20 bg-success/10 text-success";
  if (status === "prepared") return "border-primary/20 bg-primary/10 text-primary";
  if (status === "skipped") return "border-warning/25 bg-warning/10 text-warning";
  return "border-destructive/20 bg-destructive/10 text-destructive";
}

function statusLabel(status: SchedulerStatus) {
  if (status === "success") return "Concluido";
  if (status === "prepared") return "Preparado";
  if (status === "skipped") return "Pulado";
  return "Falha";
}

function toneClass(tone: "primary" | "success" | "warning" | "danger") {
  if (tone === "success") return "bg-success/10 text-success";
  if (tone === "warning") return "bg-warning/10 text-warning";
  if (tone === "danger") return "bg-destructive/10 text-destructive";
  return "bg-primary-soft text-primary";
}

function formatGb(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Indisponivel";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
