import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type NexPlan = {
  id: string;
  name: string;
  durationDays: number;
  priceCents: number;
  featured?: boolean;
};

export type NexEntitlement = {
  userId: string;
  planId: string;
  planName: string;
  status: "active" | "expired" | "revoked";
  startsAt: string;
  expiresAt: string;
};

export type NexDeviceIdentity = {
  fingerprint: string;
  label: string;
  source: string;
};

export type NexDeviceAccess =
  | "checking"
  | "allowed"
  | "unlicensed"
  | "expired"
  | "revoked"
  | "blocked"
  | "unavailable";

export type NexDeviceTransfer = {
  id: string;
  status: "pending" | "approved" | "rejected" | "cancelled" | "expired";
  requestedDeviceLabel: string;
  requestedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
};

export const NEX_PLANS: NexPlan[] = [
  { id: "15_days", name: "15 dias", durationDays: 15, priceCents: 1729 },
  { id: "30_days", name: "30 dias", durationDays: 30, priceCents: 3458 },
  { id: "3_months", name: "3 meses", durationDays: 90, priceCents: 8990 },
  { id: "6_months", name: "6 meses", durationDays: 180, priceCents: 15990 },
  {
    id: "1_year",
    name: "1 ano",
    durationDays: 365,
    priceCents: 27990,
    featured: true,
  },
];

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  entitlement: NexEntitlement | null;
  deviceIdentity: NexDeviceIdentity | null;
  deviceAccess: NexDeviceAccess;
  deviceTransfer: NexDeviceTransfer | null;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  redeemCode: (code: string) => Promise<NexEntitlement>;
  requestDeviceTransfer: () => Promise<NexDeviceTransfer>;
  cancelDeviceTransfer: () => Promise<void>;
  refreshEntitlement: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim();
const storeUrl = import.meta.env.VITE_NEX_STORE_URL?.trim();

let browserClient: SupabaseClient | null = null;
let deviceIdentityPromise: Promise<NexDeviceIdentity> | null = null;

const BROWSER_DEVICE_STORAGE_KEY = "nex.auth.development-device.v1";

export function isNexAuthConfigured() {
  const hasRealProjectUrl = Boolean(
    supabaseUrl &&
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl) &&
    !supabaseUrl.includes("seu-projeto"),
  );
  const hasRealPublishableKey = Boolean(
    supabasePublishableKey &&
    /^(sb_publishable_|eyJ)/.test(supabasePublishableKey) &&
    !supabasePublishableKey.includes("substitua"),
  );

  return hasRealProjectUrl && hasRealPublishableKey;
}

function getSupabaseClient() {
  if (!isNexAuthConfigured() || typeof window === "undefined") {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }

  return browserClient;
}

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function getOAuthRedirectUrl() {
  if (isTauriRuntime()) {
    return "nexoptimizer://auth/callback";
  }

  return `${window.location.origin}/conta`;
}

export async function openNexExternalUrl(url: string) {
  if (isTauriRuntime()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return;
  }

  window.location.assign(url);
}

export function getNexStoreUrl() {
  return storeUrl || null;
}

export async function invokeNexLicenseAdmin<T = Record<string, unknown>>(
  payload: Record<string, unknown>,
) {
  const client = getSupabaseClient();
  if (!client) throw new Error("O servidor de licenças ainda não foi configurado.");

  const { data, error } = await client.functions.invoke("nex-license-admin", {
    body: payload,
  });
  if (error) {
    let message = error.message;
    const response = "context" in error ? (error.context as Response | undefined) : undefined;
    if (response) {
      try {
        const body = (await response.clone().json()) as { error?: string };
        if (body.error) message = body.error;
      } catch {
        // The SDK message is the safest fallback for non-JSON errors.
      }
    }
    throw new Error(message);
  }

  return data as T;
}

function mapDeviceEntitlement(row: Record<string, unknown>): NexEntitlement {
  const expiresAt = String(row.license_expires_at);
  const storedStatus = String(row.license_status);
  const expired = new Date(expiresAt).getTime() <= Date.now();

  return {
    userId: String(row.license_user_id),
    planId: String(row.license_plan_id),
    planName: String(row.license_plan_name),
    status: storedStatus === "revoked" ? "revoked" : expired ? "expired" : "active",
    startsAt: String(row.license_starts_at),
    expiresAt,
  };
}

function mapDeviceAccess(reason: string): NexDeviceAccess {
  if (reason === "ALLOWED") return "allowed";
  if (reason === "NO_ENTITLEMENT") return "unlicensed";
  if (reason === "EXPIRED") return "expired";
  if (reason === "REVOKED") return "revoked";
  if (reason === "DEVICE_MISMATCH") return "blocked";
  return "unavailable";
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function createBrowserDevelopmentIdentity(): Promise<NexDeviceIdentity> {
  let installationId = window.localStorage.getItem(BROWSER_DEVICE_STORAGE_KEY);
  if (!installationId) {
    installationId = crypto.randomUUID();
    window.localStorage.setItem(BROWSER_DEVICE_STORAGE_KEY, installationId);
  }

  return {
    fingerprint: await sha256Hex(`nex-optimizer-browser-development-v1:${installationId}`),
    label: "Navegador de desenvolvimento",
    source: "browser-installation-sha256",
  };
}

async function getDeviceIdentity() {
  if (!isTauriRuntime() && !import.meta.env.DEV) {
    throw new Error("DEVICE_IDENTITY_APP_REQUIRED");
  }

  if (!deviceIdentityPromise) {
    deviceIdentityPromise = isTauriRuntime()
      ? import("@tauri-apps/api/core").then(({ invoke }) =>
          invoke<NexDeviceIdentity>("nex_device_identity"),
        )
      : createBrowserDevelopmentIdentity();
  }

  return deviceIdentityPromise;
}

async function readDeviceEntitlement(client: SupabaseClient, identity: NexDeviceIdentity) {
  const { data, error } = await client.rpc("get_device_entitlement", {
    device_fingerprint: identity.fingerprint,
    requested_device_label: identity.label,
  });

  if (error) {
    throw error;
  }

  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
  if (!row) return { entitlement: null, access: "unavailable" as NexDeviceAccess };

  const access = mapDeviceAccess(String(row.access_reason));
  const entitlement = row.license_plan_id ? mapDeviceEntitlement(row) : null;
  return { entitlement, access };
}

function mapDeviceTransfer(row: Record<string, unknown>): NexDeviceTransfer {
  return {
    id: String(row.id),
    status: String(row.status) as NexDeviceTransfer["status"],
    requestedDeviceLabel: String(row.requested_device_label),
    requestedAt: String(row.requested_at),
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    reviewNote: row.review_note ? String(row.review_note) : null,
  };
}

async function readLatestDeviceTransfer(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from("device_transfer_requests")
    .select("id, status, requested_device_label, requested_at, reviewed_at, review_note")
    .eq("user_id", userId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? mapDeviceTransfer(data as Record<string, unknown>) : null;
}

function friendlyAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/CODE_INVALID_OR_ALREADY_USED/i.test(message)) {
    return "Este código é inválido ou já foi utilizado.";
  }
  if (/CODE_EXPIRED/i.test(message)) {
    return "Este código expirou e não pode mais ser utilizado.";
  }
  if (/CODE_ASSIGNED_TO_ANOTHER_ACCOUNT/i.test(message)) {
    return "Este código pertence a outra conta Google.";
  }
  if (/CODE_NOT_ASSIGNED/i.test(message)) {
    return "Este código ainda não foi associado ao e-mail da compra.";
  }
  if (/ACCOUNT_EMAIL_REQUIRED/i.test(message)) {
    return "Sua conta Google precisa fornecer um e-mail válido para resgatar o código.";
  }
  if (/GOOGLE_AUTH_REQUIRED/i.test(message)) {
    return "Entre com uma conta Google para usar a licença do NEX.";
  }
  if (/DEVICE_ALREADY_BOUND|DEVICE_MISMATCH/i.test(message)) {
    return "Esta licença já está vinculada a outro computador.";
  }
  if (/INVALID_DEVICE/i.test(message)) {
    return "Não foi possível validar a identidade segura deste computador.";
  }
  if (/DEVICE_IDENTITY_APP_REQUIRED/i.test(message)) {
    return "Abra o NEX Optimizer instalado no Windows para ativar esta licença.";
  }
  if (/TRANSFER_ALREADY_PENDING/i.test(message)) {
    return "Já existe uma solicitação de troca aguardando análise.";
  }
  if (/TRANSFER_RATE_LIMITED/i.test(message)) {
    return "O limite de três solicitações de troca em 30 dias foi atingido.";
  }
  if (/TRANSFER_LICENSE_INACTIVE/i.test(message)) {
    return "A troca de computador exige uma licença ativa.";
  }
  if (/ALREADY_THIS_DEVICE/i.test(message)) {
    return "Esta licença já está vinculada a este computador.";
  }
  if (/invalid login|provider/i.test(message)) {
    return "O login Google ainda não está habilitado no servidor do NEX.";
  }
  if (/network|fetch/i.test(message)) {
    return "Não foi possível acessar o servidor de licenças. Verifique sua conexão.";
  }
  return message;
}

export function NexAuthProvider({ children }: { children: ReactNode }) {
  const configured = isNexAuthConfigured();
  const [loading, setLoading] = useState(configured);
  const [session, setSession] = useState<Session | null>(null);
  const [entitlement, setEntitlement] = useState<NexEntitlement | null>(null);
  const [deviceIdentity, setDeviceIdentity] = useState<NexDeviceIdentity | null>(null);
  const [deviceAccess, setDeviceAccess] = useState<NexDeviceAccess>("unlicensed");
  const [deviceTransfer, setDeviceTransfer] = useState<NexDeviceTransfer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handledUrls = useRef(new Set<string>());

  const refreshEntitlement = useCallback(async () => {
    const client = getSupabaseClient();
    const userId = session?.user.id;
    if (!client || !userId) {
      setEntitlement(null);
      setDeviceAccess("unlicensed");
      setDeviceTransfer(null);
      return;
    }

    try {
      setDeviceAccess("checking");
      const identity = await getDeviceIdentity();
      setDeviceIdentity(identity);
      const [result, latestTransfer] = await Promise.all([
        readDeviceEntitlement(client, identity),
        readLatestDeviceTransfer(client, userId),
      ]);
      setEntitlement(result.entitlement);
      setDeviceAccess(result.access);
      setDeviceTransfer(latestTransfer);
    } catch (loadError) {
      setDeviceAccess("unavailable");
      setError(friendlyAuthError(loadError));
    }
  }, [session?.user.id]);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setLoading(false);
      return;
    }

    let active = true;
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (!nextSession) {
        setEntitlement(null);
        setDeviceAccess("unlicensed");
        setDeviceTransfer(null);
      }
    });

    void client.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (sessionError) throw sessionError;
        if (active) setSession(data.session);
      })
      .catch((sessionError) => active && setError(friendlyAuthError(sessionError)))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    void refreshEntitlement();
  }, [refreshEntitlement]);

  useEffect(() => {
    if (!entitlement || entitlement.status !== "active") return;

    const remainingMs = new Date(entitlement.expiresAt).getTime() - Date.now();
    if (remainingMs <= 0) {
      void refreshEntitlement();
      return;
    }

    const timeout = window.setTimeout(
      () => void refreshEntitlement(),
      Math.min(remainingMs + 250, 2_147_000_000),
    );
    return () => window.clearTimeout(timeout);
  }, [entitlement, refreshEntitlement]);

  useEffect(() => {
    if (!session?.user || typeof window === "undefined") return;

    const refreshAccess = () => void refreshEntitlement();
    window.addEventListener("focus", refreshAccess);
    window.addEventListener("online", refreshAccess);
    return () => {
      window.removeEventListener("focus", refreshAccess);
      window.removeEventListener("online", refreshAccess);
    };
  }, [refreshEntitlement, session?.user]);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client || typeof window === "undefined") return;

    let disposed = false;
    let unlisten: (() => void) | undefined;

    const handleCallback = async (rawUrl: string) => {
      if (disposed || handledUrls.current.has(rawUrl)) return;
      handledUrls.current.add(rawUrl);

      try {
        const callbackUrl = new URL(rawUrl);
        const authCode = callbackUrl.searchParams.get("code");
        const authError = callbackUrl.searchParams.get("error_description");
        if (authError) throw new Error(authError);
        if (!authCode) return;

        const { error: exchangeError } = await client.auth.exchangeCodeForSession(authCode);
        if (exchangeError) throw exchangeError;
        setError(null);
      } catch (callbackError) {
        setError(friendlyAuthError(callbackError));
      }
    };

    if (isTauriRuntime()) {
      void import("@tauri-apps/plugin-deep-link")
        .then(async ({ getCurrent, onOpenUrl }) => {
          const currentUrls = await getCurrent();
          for (const url of currentUrls ?? []) await handleCallback(url);
          unlisten = await onOpenUrl((urls) => {
            for (const url of urls) void handleCallback(url);
          });
        })
        .catch((deepLinkError) => setError(friendlyAuthError(deepLinkError)));
    } else {
      void handleCallback(window.location.href);
    }

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) {
      setError("Configure o servidor de contas do NEX antes de entrar.");
      return;
    }

    setError(null);
    const { data, error: oauthError } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getOAuthRedirectUrl(),
        skipBrowserRedirect: true,
      },
    });

    if (oauthError) {
      setError(friendlyAuthError(oauthError));
      return;
    }

    if (data.url) await openNexExternalUrl(data.url);
  }, []);

  const signOut = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) return;
    const { error: signOutError } = await client.auth.signOut();
    if (signOutError) {
      setError(friendlyAuthError(signOutError));
      return;
    }
    setEntitlement(null);
    setDeviceAccess("unlicensed");
    setDeviceTransfer(null);
  }, []);

  const redeemCode = useCallback(
    async (code: string) => {
      const client = getSupabaseClient();
      if (!client) throw new Error("O servidor de licenças ainda não foi configurado.");
      if (!session?.user) throw new Error("Entre com sua conta Google antes de resgatar o código.");

      const normalized = code.trim();
      if (normalized.length < 8) throw new Error("Digite um código NEX válido.");

      const identity = deviceIdentity ?? (await getDeviceIdentity());
      setDeviceIdentity(identity);
      const { error: redemptionError } = await client.rpc("redeem_license_code", {
        redemption_code: normalized,
        device_fingerprint: identity.fingerprint,
        requested_device_label: identity.label,
      });
      if (redemptionError) throw new Error(friendlyAuthError(redemptionError));

      const result = await readDeviceEntitlement(client, identity);
      if (!result.entitlement || result.access !== "allowed")
        throw new Error("O código foi processado, mas a licença não foi encontrada.");
      setEntitlement(result.entitlement);
      setDeviceAccess(result.access);
      return result.entitlement;
    },
    [deviceIdentity, session?.user],
  );

  const requestDeviceTransfer = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client || !session?.user) {
      throw new Error("Entre com sua conta Google antes de solicitar a troca.");
    }

    const identity = deviceIdentity ?? (await getDeviceIdentity());
    setDeviceIdentity(identity);
    const { error: requestError } = await client.rpc("request_device_transfer", {
      requested_device_fingerprint: identity.fingerprint,
      requested_device_name: identity.label,
    });
    if (requestError) throw new Error(friendlyAuthError(requestError));

    const nextTransfer = await readLatestDeviceTransfer(client, session.user.id);
    if (!nextTransfer) throw new Error("A solicitação foi enviada, mas não pôde ser consultada.");
    setDeviceTransfer(nextTransfer);
    return nextTransfer;
  }, [deviceIdentity, session?.user]);

  const cancelDeviceTransfer = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client || !deviceTransfer || !session?.user) return;

    const { data, error: cancelError } = await client.rpc("cancel_device_transfer", {
      transfer_request_id: deviceTransfer.id,
    });
    if (cancelError) throw new Error(friendlyAuthError(cancelError));
    if (!data) throw new Error("Esta solicitação não está mais pendente.");

    setDeviceTransfer(await readLatestDeviceTransfer(client, session.user.id));
  }, [deviceTransfer, session?.user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading,
      session,
      user: session?.user ?? null,
      entitlement,
      deviceIdentity,
      deviceAccess,
      deviceTransfer,
      error,
      signInWithGoogle,
      signOut,
      redeemCode,
      requestDeviceTransfer,
      cancelDeviceTransfer,
      refreshEntitlement,
      clearError: () => setError(null),
    }),
    [
      configured,
      deviceAccess,
      deviceIdentity,
      deviceTransfer,
      entitlement,
      error,
      loading,
      redeemCode,
      requestDeviceTransfer,
      cancelDeviceTransfer,
      refreshEntitlement,
      session,
      signInWithGoogle,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useNexAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useNexAuth must be used inside NexAuthProvider.");
  return context;
}
