import { createFileRoute, Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Info,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  ShieldPlus,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import {
  applyAdvancedActions,
  loadAdvancedCatalog,
  refreshAdvancedCatalog,
  type AdvancedAction,
} from "@/lib/advanced";
import { HERMES_SAFE_TEST_MODE } from "@/lib/safe-mode";
import {
  fallbackSystemSecurityContext,
  openWindowsSecurity,
  readSystemSecurityContext,
  type SystemSecurityContext,
} from "@/lib/system";

type ActionStatus = "idle" | "running" | "done" | "failed";

const DEFENDER_ACTION_ID = "allow-hermes-defender-exclusion";

export const Route = createFileRoute("/defender")({
  head: () => ({
    meta: [
      { title: "NEX Optimizer - Windows Defender" },
      {
        name: "description",
        content: "Liberacao especifica do NEX no Windows Defender sem desativar a protecao.",
      },
    ],
  }),
  component: DefenderPage,
});

function DefenderPage() {
  const [systemContext, setSystemContext] = useState<SystemSecurityContext>(
    fallbackSystemSecurityContext,
  );
  const [defenderAction, setDefenderAction] = useState<AdvancedAction | null>(null);
  const [loadingState, setLoadingState] = useState(false);
  const [actionStatus, setActionStatus] = useState<ActionStatus>("idle");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [securityStatus, setSecurityStatus] = useState<ActionStatus>("idle");
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);

  const refreshState = useCallback(async (preferCache = false) => {
    setLoadingState(true);
    try {
      const [context, catalog] = await Promise.all([
        readSystemSecurityContext(),
        preferCache ? loadAdvancedCatalog() : refreshAdvancedCatalog(),
      ]);

      setSystemContext(context);
      setDefenderAction(catalog.actions.find((item) => item.id === DEFENDER_ACTION_ID) ?? null);
    } finally {
      setLoadingState(false);
    }
  }, []);

  useEffect(() => {
    void refreshState(true);
  }, [refreshState]);

  const isAlreadyAllowed = useMemo(() => {
    const value = defenderAction?.currentValue.toLowerCase() ?? "";
    return (
      value.includes("já está") ||
      value.includes("ja esta") ||
      value.includes("já aparece") ||
      value.includes("ja aparece")
    );
  }, [defenderAction]);

  const modeLabel = HERMES_SAFE_TEST_MODE ? "Teste" : "Real";
  const adminLabel = systemContext.isElevated ? "Administrador ativo" : "Administrador pendente";
  const statusLabel = isAlreadyAllowed
    ? "NEX liberado"
    : loadingState
      ? "Verificando permissão"
      : "Liberação recomendada";
  const statusText = isAlreadyAllowed
    ? "O executável atual já aparece nas exclusões do Defender."
    : HERMES_SAFE_TEST_MODE
      ? "Modo teste ativo: o NEX valida o comando, mas ainda não altera o Windows Defender."
      : "Ao confirmar, o NEX adiciona apenas o executável atual nas exclusões do Defender.";
  const actionUnavailable =
    !systemContext.isWindows || (!HERMES_SAFE_TEST_MODE && !systemContext.isElevated);

  const actionButtonLabel = useMemo(() => {
    if (actionStatus === "running") {
      return HERMES_SAFE_TEST_MODE ? "Validando..." : "Liberando...";
    }
    if (!systemContext.isWindows) {
      return "Disponível apenas no Windows";
    }
    if (!HERMES_SAFE_TEST_MODE && !systemContext.isElevated) {
      return "Abra como administrador";
    }
    if (isAlreadyAllowed) {
      return HERMES_SAFE_TEST_MODE ? "Validar novamente" : "NEX já liberado";
    }

    return HERMES_SAFE_TEST_MODE ? "Validar liberação" : "Liberar no Defender";
  }, [actionStatus, isAlreadyAllowed, systemContext.isElevated, systemContext.isWindows]);

  const handleAllowDefender = useCallback(async () => {
    if (actionStatus === "running" || actionUnavailable) {
      return;
    }

    if (!HERMES_SAFE_TEST_MODE) {
      const confirmed = window.confirm(
        "O NEX vai adicionar somente o executável atual às exclusões do Windows Defender. Continuar?",
      );
      if (!confirmed) {
        return;
      }
    }

    setActionStatus("running");
    setActionMessage(null);

    try {
      const result = await applyAdvancedActions({
        confirmed: !HERMES_SAFE_TEST_MODE,
        dryRun: HERMES_SAFE_TEST_MODE,
        actionIds: [DEFENDER_ACTION_ID],
        extremeMode: false,
      });

      const firstAction = result.appliedActions[0];
      setActionStatus("done");
      setActionMessage(firstAction?.message ?? result.message);
      await refreshState();
    } catch (error) {
      setActionStatus("failed");
      setActionMessage(error instanceof Error ? error.message : String(error));
    }
  }, [actionStatus, actionUnavailable, refreshState]);

  const handleOpenSecurity = useCallback(async () => {
    if (securityStatus === "running") {
      return;
    }

    setSecurityStatus("running");
    setSecurityMessage(null);

    try {
      await openWindowsSecurity();
      setSecurityStatus("done");
      setSecurityMessage("Segurança do Windows aberta.");
    } catch (error) {
      setSecurityStatus("failed");
      setSecurityMessage(error instanceof Error ? error.message : String(error));
    }
  }, [securityStatus]);

  return (
    <div className="lightning-bg flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-hidden px-5 py-5 xl:px-7">
          <div className="max-w-7xl">
            <Link
              to="/otimizar"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-bold text-primary transition hover:border-primary/60 hover:bg-primary/15"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>

            <header className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px] lg:items-end">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-primary">
                  Permissão Windows
                </p>
                <h1 className="text-[clamp(28px,2.5vw,40px)] font-black leading-tight text-foreground">
                  Liberar no Windows Defender
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  Use esta área quando o Windows bloquear o NEX por reputação de aplicativo novo. A
                  proteção continua ativa e a permissão mira somente o executável do NEX.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <StatusPill label="Windows" value={systemContext.isWindows ? "Sim" : "Não"} />
                <StatusPill label="Modo" value={modeLabel} />
                <StatusPill label="Permissão" value={adminLabel} span />
              </div>
            </header>

            <section className="mt-5 rounded-[26px] border border-primary/25 bg-card/90 p-5 shadow-[0_26px_70px_-42px_rgba(196,94,255,0.75)]">
              <div className="grid items-start gap-4 xl:grid-cols-[1fr_420px]">
                <div className="rounded-3xl border border-primary/20 bg-background/70 p-5">
                  <div className="flex items-start gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
                      {loadingState ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <ShieldPlus className="h-6 w-6" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                        {statusLabel}
                      </p>
                      <h2 className="mt-1 text-xl font-black text-foreground">
                        Proteção continua ativa
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {statusText}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAllowDefender}
                    disabled={actionStatus === "running" || actionUnavailable}
                    className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-primary px-5 py-3.5 text-base font-black text-primary-foreground shadow-[0_0_30px_rgba(196,94,255,0.36),0_22px_38px_-22px_rgba(196,94,255,0.9)] transition hover:bg-primary/95 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {actionStatus === "running" ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-5 w-5" />
                    )}
                    {actionButtonLabel}
                  </button>

                  {loadingState && actionStatus !== "running" && (
                    <p className="mt-3 text-center text-xs font-semibold text-muted-foreground">
                      Verificando estado atual em segundo plano.
                    </p>
                  )}

                  {actionMessage && (
                    <ActionMessage status={actionStatus} message={actionMessage} className="mt-4" />
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <TrustCard
                    icon={FileCheck2}
                    title="Executável atual"
                    text="A ação permite somente o arquivo do NEX que está rodando agora."
                  />
                  <TrustCard
                    icon={LockKeyhole}
                    title="Sem pasta inteira"
                    text="O motor bloqueia alvos fora da allowlist do executável NEX."
                  />
                  <TrustCard
                    icon={CheckCircle2}
                    title="Defender mantido"
                    text="Não desativa proteção em tempo real, firewall, UAC ou SmartScreen."
                  />
                </div>
              </div>
            </section>

            <section className="mt-4 rounded-2xl border border-border/70 bg-card/80 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-foreground">
                      Caminho manual se o Windows bloquear antes
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                      Abra a Segurança do Windows e adicione uma exclusão do tipo Arquivo para o
                      executável atual{" "}
                      <code className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                        nex-optimizer.exe
                      </code>
                      .
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenSecurity}
                  disabled={securityStatus === "running"}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 text-sm font-black text-primary transition hover:border-primary/70 hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
                >
                  {securityStatus === "running" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  Abrir Segurança do Windows
                </button>
              </div>

              {securityMessage && (
                <ActionMessage
                  status={securityStatus}
                  message={securityMessage}
                  compact
                  className="mt-4"
                />
              )}

              <details className="mt-3 rounded-2xl border border-border/60 bg-background/50 p-3">
                <summary className="cursor-pointer text-sm font-black text-foreground">
                  Ver passo a passo manual
                </summary>
                <ol className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                  <ManualStep index={1} text="Abra Proteção contra vírus e ameaças." />
                  <ManualStep
                    index={2}
                    text="Em Configurações de proteção contra vírus e ameaças, entre em Gerenciar configurações."
                  />
                  <ManualStep
                    index={3}
                    text="Role até Exclusões e clique em Adicionar ou remover exclusões."
                  />
                  <ManualStep index={4} text="Clique em Adicionar uma exclusão." />
                  <ManualStep index={5} text="Selecione Arquivo." />
                  <ManualStep
                    index={6}
                    text="Escolha o nex-optimizer.exe da instalação do NEX e confirme."
                  />
                </ol>
              </details>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatusPill({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div
      className={`rounded-2xl border border-border/70 bg-card px-4 py-3 ${span ? "col-span-2" : ""}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-base font-black text-foreground">{value}</p>
    </div>
  );
}

function TrustCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 text-sm font-black text-foreground">{title}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function ManualStep({ index, text }: { index: number; text: string }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/55 px-3 py-2.5">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-black text-primary">
        {index}
      </span>
      <span className="leading-relaxed">{text}</span>
    </li>
  );
}

function ActionMessage({
  status,
  message,
  compact,
  className,
}: {
  status: ActionStatus;
  message: string;
  compact?: boolean;
  className?: string;
}) {
  const failed = status === "failed";

  return (
    <p
      className={`${compact ? "text-[12px]" : "text-sm"} rounded-xl border px-3 py-2 font-semibold ${
        failed
          ? "border-destructive/20 bg-destructive/10 text-destructive"
          : "border-success/20 bg-success/10 text-success"
      } ${className ?? ""}`}
    >
      {message}
    </p>
  );
}
