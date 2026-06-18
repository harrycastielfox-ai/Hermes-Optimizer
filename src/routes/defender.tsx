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
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { applyAdvancedActions } from "@/lib/advanced";
import { HERMES_SAFE_TEST_MODE } from "@/lib/safe-mode";
import {
  fallbackSystemSecurityContext,
  openWindowsSecurity,
  readSystemSecurityContext,
  type SystemSecurityContext,
} from "@/lib/system";

type ActionStatus = "idle" | "running" | "done" | "failed";

export const Route = createFileRoute("/defender")({
  head: () => ({
    meta: [
      { title: "Hermes Optimizer - Windows Defender" },
      {
        name: "description",
        content: "Liberação especifica do Hermes no Windows Defender sem desativar a proteção.",
      },
    ],
  }),
  component: DefenderPage,
});

function DefenderPage() {
  const [systemContext, setSystemContext] = useState<SystemSecurityContext>(
    fallbackSystemSecurityContext,
  );
  const [actionStatus, setActionStatus] = useState<ActionStatus>("idle");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [securityStatus, setSecurityStatus] = useState<ActionStatus>("idle");
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    readSystemSecurityContext().then((context) => {
      if (mounted) {
        setSystemContext(context);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const modeLabel = HERMES_SAFE_TEST_MODE ? "Modo teste" : "Modo real";
  const adminLabel = systemContext.isElevated ? "Administrador ativo" : "Administrador pendente";

  const handleAllowDefender = useCallback(async () => {
    if (actionStatus === "running") {
      return;
    }

    if (!HERMES_SAFE_TEST_MODE) {
      const confirmed = window.confirm(
        "O Hermes vai adicionar somente o executavel hermes-optimizer.exe as exclusoes do Windows Defender. Continuar?",
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
        actionIds: ["allow-hermes-defender-exclusion"],
        extremeMode: false,
      });
      const firstAction = result.appliedActions[0];
      setActionStatus("done");
      setActionMessage(firstAction?.message ?? result.message);
    } catch (error) {
      setActionStatus("failed");
      setActionMessage(error instanceof Error ? error.message : String(error));
    }
  }, [actionStatus]);

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

  const actionButtonLabel = useMemo(() => {
    if (actionStatus === "running") {
      return HERMES_SAFE_TEST_MODE ? "Validando..." : "Liberando...";
    }

    return HERMES_SAFE_TEST_MODE ? "Validar liberação" : "Liberar no Defender agora";
  }, [actionStatus]);

  return (
    <div className="lightning-bg flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-auto px-5 pb-6 pt-6 xl:px-8 xl:pt-7">
          <div className="max-w-6xl">
            <Link
              to="/otimizar"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 text-sm font-bold text-primary transition hover:border-primary/40 hover:bg-primary/15"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>

            <header className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <p className="mb-2 text-xs font-bold tracking-[0.22em] text-primary">
                  PERMISSAO WINDOWS
                </p>
                <h1 className="text-[clamp(28px,2.6vw,42px)] font-bold leading-tight tracking-tight text-foreground">
                  Liberar no Windows Defender
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  Quando o Windows bloquear o Hermes por reputacao de app novo, esta pagina prepara
                  uma exclusao especifica do executavel sem desligar o Defender.
                </p>
              </div>

              <div className="grid min-w-[260px] grid-cols-2 gap-2">
                <StatusPill label="Windows" value={systemContext.isWindows ? "Sim" : "Não"} />
                <StatusPill label="Modo" value={modeLabel} />
                <StatusPill label="Permissao" value={adminLabel} span />
              </div>
            </header>

            <section className="mt-6 rounded-2xl border border-primary/25 bg-card p-5 shadow-[0_24px_60px_-36px_rgba(37,99,235,0.55)]">
              <div className="rounded-2xl border border-primary/20 bg-background/70 p-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-foreground">Proteção continua ativa</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      O Hermes não desativa o Windows Defender. Ele adiciona somente o caminho do
                      proprio executavel a lista de exclusoes quando houver falso positivo.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAllowDefender}
                disabled={actionStatus === "running"}
                className="mt-5 inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-primary px-5 py-4 text-base font-bold text-primary-foreground shadow-[0_0_26px_rgba(37,99,235,0.38),0_18px_34px_-18px_rgba(37,99,235,0.95)] transition hover:bg-primary/95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionStatus === "running" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-5 w-5" />
                )}
                {actionButtonLabel}
              </button>

              {actionMessage && (
                <ActionMessage status={actionStatus} message={actionMessage} className="mt-4" />
              )}

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                <TrustCard
                  icon={FileCheck2}
                  title="Executavel Hermes"
                  text="A permissao mira hermes-optimizer.exe, não pastas inteiras do sistema."
                />
                <TrustCard
                  icon={LockKeyhole}
                  title="Exclusao especifica"
                  text="Feita apenas quando o usuário confirmar no modo real."
                />
                <TrustCard
                  icon={CheckCircle2}
                  title="Defender mantido"
                  text="A proteção do Windows segue ativa para o restante da maquina."
                />
              </div>
            </section>

            <section className="mt-5 rounded-2xl border border-border/70 bg-card p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    Liberar na mao se o botao não resolver
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Use este caminho se o Windows bloquear o app antes da permissao automática.
                  </p>
                </div>
              </div>

              <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                <ManualStep text="Abra Segurança do Windows -> Proteção contra vírus e ameaças." />
                <ManualStep text="Entre em Configurações de proteção contra vírus e ameaças -> Gerenciar configurações." />
                <ManualStep text="Role até Exclusoes -> Adicionar ou remover exclusoes." />
                <ManualStep text="Escolha Adicionar uma exclusao -> Arquivo." />
                <ManualStep text="Selecione hermes-optimizer.exe e confirme." />
              </ol>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleOpenSecurity}
                  disabled={securityStatus === "running"}
                  className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 text-sm font-bold text-primary transition hover:border-primary/70 hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {securityStatus === "running" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  Abrir Segurança do Windows
                </button>
                {securityMessage && (
                  <ActionMessage status={securityStatus} message={securityMessage} compact />
                )}
              </div>
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
      <p className="mt-1 text-base font-bold text-foreground">{value}</p>
    </div>
  );
}

function TrustCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 text-sm font-bold text-foreground">{title}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function ManualStep({ text }: { text: string }) {
  return (
    <li className="flex gap-3">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>{text}</span>
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
