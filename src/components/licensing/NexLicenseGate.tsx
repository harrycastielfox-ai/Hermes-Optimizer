import { Link } from "@tanstack/react-router";
import { KeyRound, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { useNexAuth } from "@/lib/nex-auth";

export function NexLicenseGate({ children }: { children: ReactNode }) {
  const { configured, loading, user, entitlement, deviceAccess } = useNexAuth();
  const internalQaBypass = import.meta.env.VITE_NEX_INTERNAL_QA_BYPASS === "true";

  // Available only in an explicitly generated internal QA build. Public builds keep this false.
  if (internalQaBypass) return children;

  // Local development remains usable before cloud credentials exist. Packaged builds fail closed.
  if (!configured && import.meta.env.DEV) return children;

  const entitlementExpired =
    entitlement?.status === "active" && new Date(entitlement.expiresAt).getTime() <= Date.now();
  const effectiveDeviceAccess = entitlementExpired ? "expired" : deviceAccess;

  const accessConfirmed =
    configured &&
    Boolean(user) &&
    entitlement?.status === "active" &&
    !entitlementExpired &&
    effectiveDeviceAccess === "allowed";
  if (accessConfirmed) return children;

  const checking = configured && (loading || effectiveDeviceAccess === "checking");
  const content = getBlockedContent({
    configured,
    checking,
    signedIn: Boolean(user),
    deviceAccess: effectiveDeviceAccess,
  });

  return (
    <div className="lightning-bg flex min-h-screen">
      <Sidebar />
      <main className="grid min-w-0 flex-1 place-items-center overflow-auto px-5 py-8">
        <section className="w-full max-w-xl rounded-2xl border border-border/70 bg-card/90 p-6 text-center shadow-[0_24px_70px_-42px_rgba(168,85,247,0.95)] backdrop-blur">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary">
            {checking ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : deviceAccess === "blocked" ? (
              <LockKeyhole className="h-7 w-7" />
            ) : (
              <ShieldCheck className="h-7 w-7" />
            )}
          </span>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-primary">
            Proteção de licença NEX
          </p>
          <h1 className="mt-2 text-2xl font-black text-foreground">{content.title}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            {content.description}
          </p>
          {!checking && (
            <Link
              to="/conta"
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground transition hover:brightness-110"
            >
              <KeyRound className="h-4 w-4" /> Abrir Minha conta
            </Link>
          )}
        </section>
      </main>
    </div>
  );
}

function getBlockedContent({
  configured,
  checking,
  signedIn,
  deviceAccess,
}: {
  configured: boolean;
  checking: boolean;
  signedIn: boolean;
  deviceAccess: ReturnType<typeof useNexAuth>["deviceAccess"];
}) {
  if (!configured) {
    return {
      title: "Servidor de licenças não configurado",
      description:
        "Este build não pode executar otimizações até receber a configuração oficial do servidor NEX.",
    };
  }
  if (checking) {
    return {
      title: "Validando seu acesso",
      description: "O NEX está confirmando a licença e a identidade segura deste computador.",
    };
  }
  if (!signedIn) {
    return {
      title: "Entre para otimizar",
      description: "Use seu e-mail e código NEX para liberar as otimizações neste computador.",
    };
  }
  if (deviceAccess === "blocked") {
    return {
      title: "Licença vinculada a outro PC",
      description:
        "Esta conta não pode executar otimizações neste computador. A licença permanece protegida no primeiro dispositivo ativado.",
    };
  }
  if (deviceAccess === "expired") {
    return {
      title: "Seu acesso expirou",
      description: "Resgate um novo código para renovar o período de uso neste computador.",
    };
  }
  if (deviceAccess === "revoked") {
    return {
      title: "Acesso indisponível",
      description: "Esta licença foi revogada e não pode executar otimizações.",
    };
  }
  if (deviceAccess === "unavailable") {
    return {
      title: "Não foi possível validar a licença",
      description:
        "Por segurança, o NEX mantém as otimizações bloqueadas até o servidor confirmar este computador.",
    };
  }
  return {
    title: "Código de acesso necessário",
    description: "Resgate um código NEX válido para vincular a licença a este computador.",
  };
}
