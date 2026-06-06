import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileSearch,
  HardDrive,
  History,
  Info,
  ListChecks,
  LockKeyhole,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  TerminalSquare,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fallbackDiagnosticReport, loadDiagnosticReport, type DiagnosticReport } from "@/lib/diagnostic";
import { createRestoreSnapshot, type RestoreSnapshot } from "@/lib/restore";

type RepairActionId = "sfc-scannow" | "dism-scanhealth" | "dism-restorehealth";
type RepairHistoryStatus = "checked" | "prepared" | "blocked" | "failed";

type RepairHistoryEntry = {
  id: string;
  timestamp: string;
  action: string;
  result: string;
  status: RepairHistoryStatus;
  snapshotId?: string;
};

type RepairAction = {
  id: RepairActionId;
  title: string;
  command: string;
  description: string;
  risk: "medium" | "high";
  estimatedTime: string;
  requiresAdmin: boolean;
  notes: string[];
};

const HISTORY_KEY = "hermes.repair.history.v1";
const MAX_HISTORY = 20;

const repairActions: RepairAction[] = [
  {
    id: "sfc-scannow",
    title: "Verificador de Arquivos",
    command: "sfc /scannow",
    description: "Verifica arquivos protegidos do Windows e prepara reparo estrutural quando necessario.",
    risk: "medium",
    estimatedTime: "10 a 30 min",
    requiresAdmin: true,
    notes: [
      "Pode consumir CPU e disco durante a verificacao.",
      "Nao deve ser interrompido apos iniciado em fase futura.",
      "Nesta fase o Hermes apenas prepara snapshot, log e historico.",
    ],
  },
  {
    id: "dism-scanhealth",
    title: "Imagem do Windows",
    command: "DISM /Online /Cleanup-Image /ScanHealth",
    description: "Analisa a imagem do Windows para detectar corrupcao sem aplicar reparo.",
    risk: "medium",
    estimatedTime: "5 a 20 min",
    requiresAdmin: true,
    notes: [
      "Leitura pesada, preparada para execucao confirmada futura.",
      "Nao altera a imagem do sistema nesta etapa visual.",
      "Resultado futuro deve ser registrado no historico local.",
    ],
  },
  {
    id: "dism-restorehealth",
    title: "Restaurar Imagem",
    command: "DISM /Online /Cleanup-Image /RestoreHealth",
    description: "Prepara reparo da imagem do Windows quando uma corrupcao for confirmada.",
    risk: "high",
    estimatedTime: "20 a 60 min",
    requiresAdmin: true,
    notes: [
      "Pode depender de fontes locais ou Windows Update em fase futura.",
      "Sempre exigira confirmacao forte antes de executar.",
      "Nao e executado automaticamente pelo Hermes.",
    ],
  },
];

export function HermesRepairCenter() {
  const [diagnostic, setDiagnostic] = useState<DiagnosticReport>(fallbackDiagnosticReport);
  const [history, setHistory] = useState<RepairHistoryEntry[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [preparingId, setPreparingId] = useState<RepairActionId | null>(null);

  useEffect(() => {
    setHistory(readHistory());
    void runHermesDiagnostic(false);
  }, []);

  const integrity = useMemo(() => buildIntegrityStatus(diagnostic), [diagnostic]);
  const latestHistory = history[0];

  async function runHermesDiagnostic(recordHistory = true) {
    setIsChecking(true);
    setNotice(null);
    setError(null);

    try {
      const nextDiagnostic = await loadDiagnosticReport();
      setDiagnostic(nextDiagnostic);

      if (recordHistory) {
        const snapshot = await createRepairSnapshot({
          title: "Diagnostico Hermes",
          description: "Snapshot local para auditoria antes do diagnostico de reparo somente leitura.",
          command: "diagnostic_engine_read",
          risk: "low",
        });
        const entry = buildHistoryEntry({
          action: "Diagnostico Hermes",
          result: `Diagnostico concluido: ${nextDiagnostic.healthLabel}, Defender ${nextDiagnostic.defender.status}, Windows Update ${nextDiagnostic.windowsUpdate.status}.`,
          status: "checked",
          snapshotId: snapshot?.id,
        });
        commitHistory(entry);
        setNotice(snapshot ? `Diagnostico registrado com snapshot ${snapshot.id}.` : "Diagnostico registrado localmente. Snapshot real exige Tauri.");
      }
    } catch (nextError) {
      const message = errorMessage(nextError);
      setError(message);
      commitHistory(
        buildHistoryEntry({
          action: "Diagnostico Hermes",
          result: message,
          status: "failed",
        }),
      );
    } finally {
      setIsChecking(false);
    }
  }

  async function prepareRepair(action: RepairAction) {
    const confirmed = window.confirm(
      `Preparar ${action.title}?\n\nComando futuro: ${action.command}\nTempo estimado: ${action.estimatedTime}\nRisco: ${riskLabel(action.risk)}\n\nNesta fase o Hermes NAO executara o comando. Sera criado snapshot/log/historico quando possivel.`,
    );
    if (!confirmed) {
      return;
    }

    setPreparingId(action.id);
    setNotice(null);
    setError(null);

    try {
      const snapshot = await createRepairSnapshot({
        title: action.title,
        description: action.description,
        command: action.command,
        risk: action.risk,
      });
      const result = snapshot
        ? `Acao preparada com snapshot ${snapshot.id}. Comando nao executado.`
        : "Acao preparada em historico local. Snapshot real exige Tauri.";

      commitHistory(
        buildHistoryEntry({
          action: action.title,
          result,
          status: "prepared",
          snapshotId: snapshot?.id,
        }),
      );
      setNotice(result);
    } catch (nextError) {
      const message = errorMessage(nextError);
      setError(message);
      commitHistory(
        buildHistoryEntry({
          action: action.title,
          result: message,
          status: "failed",
        }),
      );
    } finally {
      setPreparingId(null);
    }
  }

  function registerBlockedAction(action: string) {
    const entry = buildHistoryEntry({
      action,
      result: "Bloqueado por politica Hermes: reparo destrutivo ou pesado sem executor seguro.",
      status: "blocked",
    });
    commitHistory(entry);
    setNotice(`${action} permanece bloqueado nesta fase.`);
  }

  function commitHistory(entry: RepairHistoryEntry) {
    setHistory((current) => {
      const next = [entry, ...current].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
  }

  return (
    <section className="mt-5 rounded-2xl border border-border/60 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_34px_-20px_rgba(15,23,42,0.16)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Wrench className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-[0.22em] text-primary">REPARO HERMES</p>
            <h2 className="mt-1 text-lg font-bold text-foreground">Centro de Reparo Hermes</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Reparo e separado de otimizacao: aqui ficam integridade do Windows, arquivos do sistema, imagem do sistema e auditoria de reparos.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => runHermesDiagnostic(true)}
          disabled={isChecking}
          className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:bg-muted disabled:opacity-60"
        >
          <RefreshCcw className={`h-4 w-4 text-primary ${isChecking ? "animate-spin" : ""}`} />
          Verificar diagnostico
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
        <div className="flex items-start gap-2 text-sm text-primary">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Otimizar melhora desempenho e rotina. Reparar trata corrupcao, integridade e imagem do Windows. Nenhum reparo e executado automaticamente.</span>
        </div>
      </div>

      {notice && <Notice tone="success" text={notice} />}
      {error && <Notice tone="danger" text={error} />}

      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-4">
        <StatusCard icon={ShieldCheck} label="ESTADO GERAL" value={integrity.label} sub={integrity.description} tone={integrity.tone} />
        <StatusCard
          icon={Clock3}
          label="ULTIMA VERIFICACAO"
          value={latestHistory ? formatDate(latestHistory.timestamp) : "Nao registrada"}
          sub={latestHistory?.action ?? "Aguardando diagnostico Hermes"}
        />
        <StatusCard icon={FileSearch} label="ULTIMA ANALISE" value={diagnostic.healthLabel} sub={`Score ${Math.round(diagnostic.healthScore)}/100`} />
        <StatusCard icon={ShieldAlert} label="INTEGRIDADE" value={repairReadiness(diagnostic)} sub="Baseado em diagnostico local existente" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <TerminalSquare className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Ferramentas de reparo preparadas</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  SFC e DISM aparecem com descricao, risco e tempo estimado. O Hermes apenas prepara snapshot/historico nesta fase.
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 2xl:grid-cols-3">
              {repairActions.map((action) => (
                <RepairActionCard
                  key={action.id}
                  action={action}
                  busy={preparingId === action.id}
                  onPrepare={() => prepareRepair(action)}
                />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-[12px] font-bold tracking-[0.18em] text-primary">DIAGNOSTICO HERMES</h3>
                <p className="mt-1 text-[12px] text-muted-foreground">Usa engines existentes para orientar reparo sem executar comandos.</p>
              </div>
              <span className="w-fit rounded-full border border-success/20 bg-success/10 px-3 py-1 text-[10px] font-bold text-success">
                Somente leitura
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-2">
              <DiagnosticCheck
                icon={FileSearch}
                title="Arquivos corrompidos"
                value="Preparado para SFC"
                description="A confirmacao futura do SFC sera necessaria para resultado real."
                tone="warning"
              />
              <DiagnosticCheck
                icon={RefreshCcw}
                title="Windows Update"
                value={diagnostic.windowsUpdate.status}
                description={`${diagnostic.windowsUpdate.serviceStatus} - ${diagnostic.windowsUpdate.lastHotfixId}`}
                tone={diagnostic.windowsUpdate.status.toLowerCase().includes("dia") ? "success" : "warning"}
              />
              <DiagnosticCheck
                icon={ShieldCheck}
                title="Defender"
                value={diagnostic.defender.status}
                description={diagnostic.defender.active ? "Protecao ativa no diagnostico." : "Revisao recomendada."}
                tone={diagnostic.defender.active ? "success" : "danger"}
              />
              <DiagnosticCheck
                icon={ListChecks}
                title="Servicos importantes"
                value={diagnostic.warnings.length > 0 ? "Atencao" : "Sem alertas"}
                description={diagnostic.warnings[0] ?? "Nenhum aviso critico retornado pela Diagnostic Engine."}
                tone={diagnostic.warnings.length > 0 ? "warning" : "success"}
              />
              <DiagnosticCheck
                icon={Zap}
                title="Plano de energia"
                value={diagnostic.powerPlan.status}
                description={diagnostic.powerPlan.activeSchemeName}
                tone="primary"
              />
              <DiagnosticCheck
                icon={HardDrive}
                title="Problemas detectados"
                value={`${diagnostic.startup.highImpactCount + diagnostic.warnings.length}`}
                description="Soma simples de alertas locais e inicializacao de alto impacto."
                tone={diagnostic.startup.highImpactCount + diagnostic.warnings.length > 0 ? "warning" : "success"}
              />
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <h3 className="text-[12px] font-bold tracking-[0.18em] text-primary">HISTORICO DE REPAROS</h3>
            <div className="mt-3 space-y-2">
              {history.length > 0 ? (
                history.slice(0, 8).map((entry) => <HistoryRow key={entry.id} entry={entry} />)
              ) : (
                <EmptyState icon={History} title="Sem historico ainda" sub="Preparacoes, diagnosticos e bloqueios aparecerao aqui." />
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <h3 className="text-[12px] font-bold tracking-[0.18em] text-primary">ACOES BLOQUEADAS</h3>
            <div className="mt-3 space-y-2">
              {["chkdsk /f /r automatico", "winsock reset automatico", "reset de rede automatico", "reset do Windows"].map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => registerBlockedAction(action)}
                  className="flex w-full items-start gap-2 rounded-xl border border-destructive/15 bg-destructive/5 px-3 py-3 text-left text-sm font-semibold text-destructive transition hover:bg-destructive/10"
                >
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{action}</span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function RepairActionCard({ action, busy, onPrepare }: { action: RepairAction; busy: boolean; onPrepare: () => void }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <TerminalSquare className="h-5 w-5" />
        </div>
        <RiskPill risk={action.risk} />
      </div>
      <h4 className="mt-3 text-sm font-bold text-foreground">{action.title}</h4>
      <p className="mt-1 rounded-lg border border-border/70 bg-background/70 px-2 py-1.5 text-[11px] font-bold text-primary">{action.command}</p>
      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{action.description}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <MiniFact label="Tempo" value={action.estimatedTime} />
        <MiniFact label="Admin" value={action.requiresAdmin ? "Obrigatorio" : "Nao"} />
      </div>
      <div className="mt-3 space-y-1.5">
        {action.notes.slice(0, 2).map((note) => (
          <div key={note} className="flex items-start gap-2 text-[11px] text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{note}</span>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onPrepare}
        disabled={busy}
        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-bold text-primary-foreground shadow-[0_10px_26px_-14px_rgba(37,99,235,0.85)] transition hover:bg-primary/95 disabled:opacity-60"
      >
        <LockKeyhole className="h-4 w-4" />
        {busy ? "Preparando" : "Preparar com snapshot"}
      </button>
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
          <p className="truncate text-lg font-bold leading-tight text-foreground">{value}</p>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{sub}</p>
    </div>
  );
}

function DiagnosticCheck({
  icon: Icon,
  title,
  value,
  description,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  description: string;
  tone: "primary" | "success" | "warning" | "danger";
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card px-3 py-3">
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClass(tone)}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">{title}</p>
          <p className="mt-0.5 text-sm font-semibold text-primary">{value}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

function HistoryRow({ entry }: { entry: RepairHistoryEntry }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">{entry.action}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{entry.result}</p>
          {entry.snapshotId && <p className="mt-1 break-all text-[11px] font-semibold text-primary">Snapshot: {entry.snapshotId}</p>}
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusPillClass(entry.status)}`}>
          {statusLabel(entry.status)}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{formatDate(entry.timestamp)}</p>
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

function RiskPill({ risk }: { risk: RepairAction["risk"] }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${risk === "high" ? "border-destructive/20 bg-destructive/10 text-destructive" : "border-warning/25 bg-warning/10 text-warning"}`}>
      {riskLabel(risk)}
    </span>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/70 px-2 py-2">
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-[12px] font-bold text-foreground">{value}</p>
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

async function createRepairSnapshot({
  title,
  description,
  command,
  risk,
}: {
  title: string;
  description: string;
  command: string;
  risk: "low" | "medium" | "high";
}): Promise<RestoreSnapshot | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  return await createRestoreSnapshot({
    name: `Centro de Reparo - ${title}`,
    description,
    plannedActions: [
      {
        id: `repair-${Date.now()}`,
        engine: "Hermes Repair Center",
        title,
        description: `${description} Comando preparado: ${command}.`,
        risk,
        willModifySystem: false,
        requiresAdmin: command !== "diagnostic_engine_read",
      },
    ],
    rollbackManifest: [],
    previousState: [
      {
        key: "repairCommand",
        category: "metadata",
        value: command,
        source: "Hermes Repair Center",
        captured: true,
      },
    ],
  });
}

function buildIntegrityStatus(report: DiagnosticReport): { label: string; description: string; tone: "primary" | "success" | "warning" | "danger" } {
  if (!report.defender.active) {
    return {
      label: "Atencao",
      description: "Defender inativo ou indisponivel no diagnostico.",
      tone: "warning",
    };
  }

  if (report.warnings.length > 0 || report.healthScore < 70) {
    return {
      label: "Revisar",
      description: report.warnings[0] ?? "Score geral abaixo do ideal.",
      tone: "warning",
    };
  }

  return {
    label: "Saudavel",
    description: "Sem alertas criticos nas engines de leitura atuais.",
    tone: "success",
  };
}

function repairReadiness(report: DiagnosticReport) {
  if (report.warnings.length > 0 || !report.defender.active) {
    return "Revisar";
  }

  return "Preparado";
}

function buildHistoryEntry({
  action,
  result,
  status,
  snapshotId,
}: {
  action: string;
  result: string;
  status: RepairHistoryStatus;
  snapshotId?: string;
}): RepairHistoryEntry {
  return {
    id: `repair-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: new Date().toISOString(),
    action,
    result,
    status,
    snapshotId,
  };
}

function readHistory(): RepairHistoryEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as RepairHistoryEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : [];
  } catch (error) {
    console.warn("Falha ao ler historico local de reparos.", error);
    return [];
  }
}

function saveHistory(history: RepairHistoryEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function toneClass(tone: "primary" | "success" | "warning" | "danger") {
  if (tone === "success") return "bg-success/10 text-success";
  if (tone === "warning") return "bg-warning/10 text-warning";
  if (tone === "danger") return "bg-destructive/10 text-destructive";
  return "bg-primary-soft text-primary";
}

function statusPillClass(status: RepairHistoryStatus) {
  if (status === "checked") return "border-success/20 bg-success/10 text-success";
  if (status === "prepared") return "border-primary/20 bg-primary/10 text-primary";
  if (status === "blocked") return "border-warning/25 bg-warning/10 text-warning";
  return "border-destructive/20 bg-destructive/10 text-destructive";
}

function statusLabel(status: RepairHistoryStatus) {
  if (status === "checked") return "Verificado";
  if (status === "prepared") return "Preparado";
  if (status === "blocked") return "Bloqueado";
  return "Falha";
}

function riskLabel(risk: RepairAction["risk"] | "low") {
  if (risk === "high") return "Risco alto";
  if (risk === "medium") return "Risco medio";
  return "Risco baixo";
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

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
