import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

export type NexUser = {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string | null;
    avatar_url?: string | null;
  };
};

export type NexLicenseSession = {
  accountId: string | null;
  email: string;
  entitlement: NexEntitlement | null;
  access: NexDeviceAccess;
  verifiedAt: string;
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

type LicenseFunctionResponse = {
  ok?: boolean;
  error?: string;
  account?: {
    id: string | null;
    email: string;
  };
  access?: NexDeviceAccess;
  accessReason?: string;
  entitlement?: NexEntitlement | null;
};

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: NexLicenseSession | null;
  rememberedEmail: string | null;
  user: NexUser | null;
  entitlement: NexEntitlement | null;
  deviceIdentity: NexDeviceIdentity | null;
  deviceAccess: NexDeviceAccess;
  deviceTransfer: NexDeviceTransfer | null;
  error: string | null;
  activateWithEmailCode: (email: string, code: string) => Promise<NexEntitlement>;
  verifyEmailAccess: (email: string) => Promise<NexEntitlement>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  redeemCode: (code: string, email?: string) => Promise<NexEntitlement>;
  requestDeviceTransfer: () => Promise<NexDeviceTransfer>;
  cancelDeviceTransfer: () => Promise<void>;
  refreshEntitlement: (options?: { force?: boolean }) => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const supabaseUrl = (
  import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.NEXT_PUBLIC_SUPABASE_URL
)?.trim();
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)?.trim();
const storeUrl = import.meta.env.VITE_NEX_STORE_URL?.trim();

let browserClient: SupabaseClient | null = null;
let deviceIdentityPromise: Promise<NexDeviceIdentity> | null = null;

const BROWSER_DEVICE_STORAGE_KEY = "nex.auth.development-device.v1";
const LICENSE_SESSION_STORAGE_KEY = "nex.auth.email-license-session.v1";
const LICENSE_REMEMBERED_EMAIL_STORAGE_KEY = "nex.auth.remembered-email.v1";
const LICENSE_BACKGROUND_REFRESH_GRACE_MS = 10 * 60 * 1000;

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
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return browserClient;
}

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
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
  adminKey?: string,
) {
  const client = getSupabaseClient();
  const normalizedAdminKey = adminKey?.trim();
  if (!normalizedAdminKey) throw new Error("ADMIN_KEY_REQUIRED");
  if (!client) throw new Error("O servidor de licenças ainda não foi configurado.");

  const { data, error } = await client.functions.invoke("nex-license-admin", {
    body: payload,
    headers: {
      "x-nex-admin-key": normalizedAdminKey,
    },
  });
  if (error) {
    let message = error.message;
    const response = "context" in error ? (error.context as Response | undefined) : undefined;
    if (response) {
      try {
        const body = (await response.clone().json()) as { error?: string };
        if (body.error) message = body.error;
      } catch {
        // Keep the SDK message for non-JSON responses.
      }
    }
    throw new Error(message);
  }

  return data as T;
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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isSessionFresh(session: NexLicenseSession) {
  if (!session.entitlement || session.entitlement.status !== "active") return false;
  return new Date(session.entitlement.expiresAt).getTime() > Date.now();
}

function isSessionRecentlyVerified(session: NexLicenseSession) {
  const verifiedAt = new Date(session.verifiedAt).getTime();
  if (!Number.isFinite(verifiedAt)) return false;
  return Date.now() - verifiedAt < LICENSE_BACKGROUND_REFRESH_GRACE_MS;
}

function readStoredSession() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LICENSE_SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as NexLicenseSession;
    if (!parsed.email || !parsed.access) return null;
    return parsed;
  } catch {
    window.localStorage.removeItem(LICENSE_SESSION_STORAGE_KEY);
    return null;
  }
}

function writeStoredSession(session: NexLicenseSession | null) {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem(LICENSE_SESSION_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(LICENSE_SESSION_STORAGE_KEY, JSON.stringify(session));
}

function readRememberedEmail() {
  if (typeof window === "undefined") return null;
  return (
    normalizeEmail(window.localStorage.getItem(LICENSE_REMEMBERED_EMAIL_STORAGE_KEY) ?? "") || null
  );
}

function writeRememberedEmail(email: string | null) {
  if (typeof window === "undefined") return;
  const normalizedEmail = email ? normalizeEmail(email) : "";
  if (!normalizedEmail) {
    window.localStorage.removeItem(LICENSE_REMEMBERED_EMAIL_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(LICENSE_REMEMBERED_EMAIL_STORAGE_KEY, normalizedEmail);
}

function makeUserFromSession(session: NexLicenseSession | null): NexUser | null {
  if (!session) return null;
  return {
    id: session.accountId ?? session.email,
    email: session.email,
    user_metadata: {
      full_name: session.email,
      avatar_url: null,
    },
  };
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
    return "Este código pertence a outro e-mail.";
  }
  if (/CODE_NOT_ASSIGNED/i.test(message)) {
    return "Este código ainda não foi associado ao e-mail da compra.";
  }
  if (/ACCOUNT_EMAIL_REQUIRED/i.test(message)) {
    return "Digite o e-mail usado na compra.";
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
  if (/SERVER_NOT_CONFIGURED/i.test(message)) {
    return "O servidor de licenças ainda não foi configurado.";
  }
  if (/LICENSE_NOT_FOUND|NO_ENTITLEMENT/i.test(message)) {
    return "Nenhum acesso ativo foi encontrado para este e-mail neste computador.";
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
  if (/network|fetch|Failed to fetch/i.test(message)) {
    return "Não foi possível acessar o servidor de licenças. Verifique sua conexão.";
  }
  return message;
}

async function invokeLicenseSession(
  action: "activate" | "verify",
  email: string,
  identity: NexDeviceIdentity,
  code?: string,
) {
  const client = getSupabaseClient();
  if (!client) throw new Error("O servidor de licenças ainda não foi configurado.");

  const { data, error } = await client.functions.invoke("nex-license-session", {
    body: {
      action,
      email: normalizeEmail(email),
      code,
      device: identity,
    },
  });
  if (error) {
    let message = error.message;
    const response = "context" in error ? (error.context as Response | undefined) : undefined;
    if (response) {
      try {
        const body = (await response.clone().json()) as { error?: string };
        if (body.error) message = body.error;
      } catch {
        // Keep SDK error message for non-JSON responses.
      }
    }
    throw new Error(message);
  }

  const result = data as LicenseFunctionResponse;
  if (!result?.ok && result?.error) throw new Error(result.error);
  return result;
}

function buildSession(email: string, result: LicenseFunctionResponse): NexLicenseSession {
  const access = result.access ?? "unavailable";
  return {
    accountId: result.account?.id ?? null,
    email: normalizeEmail(result.account?.email ?? email),
    entitlement: result.entitlement ?? null,
    access,
    verifiedAt: new Date().toISOString(),
  };
}

export function NexAuthProvider({ children }: { children: ReactNode }) {
  const configured = isNexAuthConfigured();
  const [loading, setLoading] = useState(configured);
  const [session, setSession] = useState<NexLicenseSession | null>(() => readStoredSession());
  const [rememberedEmail, setRememberedEmail] = useState<string | null>(() => {
    const stored = readStoredSession();
    return stored?.email ?? readRememberedEmail();
  });
  const [entitlement, setEntitlement] = useState<NexEntitlement | null>(() => {
    const stored = readStoredSession();
    return stored?.entitlement ?? null;
  });
  const [deviceIdentity, setDeviceIdentity] = useState<NexDeviceIdentity | null>(null);
  const [deviceAccess, setDeviceAccess] = useState<NexDeviceAccess>(() => {
    const stored = readStoredSession();
    return stored?.access ?? "unlicensed";
  });
  const [deviceTransfer, setDeviceTransfer] = useState<NexDeviceTransfer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setLicenseSession = useCallback((nextSession: NexLicenseSession | null) => {
    setSession(nextSession);
    setEntitlement(nextSession?.entitlement ?? null);
    setDeviceAccess(nextSession?.access ?? "unlicensed");
    if (nextSession?.email) {
      setRememberedEmail(nextSession.email);
      writeRememberedEmail(nextSession.email);
    }
    writeStoredSession(nextSession);
  }, []);

  const refreshEntitlement = useCallback(
    async (options?: { force?: boolean }) => {
      const stored = readStoredSession();
      if (!stored?.email) {
        setLicenseSession(null);
        setLoading(false);
        return;
      }

      if (!configured) {
        setLicenseSession(stored);
        setLoading(false);
        return;
      }

      const canUseStoredAccess = isSessionFresh(stored) && stored.access === "allowed";
      const shouldRefreshInBackground =
        canUseStoredAccess && !options?.force && isSessionRecentlyVerified(stored);

      if (canUseStoredAccess) {
        setLicenseSession(stored);
        setLoading(false);
        if (shouldRefreshInBackground) return;
      }

      try {
        if (!canUseStoredAccess) {
          setLoading(true);
          setDeviceAccess("checking");
        }
        const identity = await getDeviceIdentity();
        setDeviceIdentity(identity);
        const result = await invokeLicenseSession("verify", stored.email, identity);
        setLicenseSession(buildSession(stored.email, result));
        setError(null);
      } catch (loadError) {
        if (canUseStoredAccess) {
          setLicenseSession({ ...stored, access: "allowed" });
          setError(null);
        } else if (isSessionFresh(stored)) {
          setLicenseSession({ ...stored, access: stored.access || "allowed" });
        } else {
          setDeviceAccess("unavailable");
          setError(friendlyAuthError(loadError));
        }
      } finally {
        setLoading(false);
      }
    },
    [configured, setLicenseSession],
  );

  useEffect(() => {
    void getDeviceIdentity()
      .then((identity) => setDeviceIdentity(identity))
      .catch((identityError) => setError(friendlyAuthError(identityError)));
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
    if (!session?.email || typeof window === "undefined") return;

    const refreshAccess = () => void refreshEntitlement();
    window.addEventListener("focus", refreshAccess);
    window.addEventListener("online", refreshAccess);
    return () => {
      window.removeEventListener("focus", refreshAccess);
      window.removeEventListener("online", refreshAccess);
    };
  }, [refreshEntitlement, session?.email]);

  const activateWithEmailCode = useCallback(
    async (email: string, code: string) => {
      const normalizedEmail = normalizeEmail(email);
      const normalizedCode = code.trim();
      if (!normalizedEmail) throw new Error("Digite o e-mail usado na compra.");
      if (normalizedCode.length < 8) throw new Error("Digite um código NEX válido.");

      const identity = deviceIdentity ?? (await getDeviceIdentity());
      setDeviceIdentity(identity);
      const result = await invokeLicenseSession(
        "activate",
        normalizedEmail,
        identity,
        normalizedCode,
      );
      const nextSession = buildSession(normalizedEmail, result);
      if (!nextSession.entitlement || nextSession.access !== "allowed") {
        throw new Error("O código foi processado, mas o acesso não foi liberado.");
      }
      setLicenseSession(nextSession);
      setError(null);
      return nextSession.entitlement;
    },
    [deviceIdentity, setLicenseSession],
  );

  const verifyEmailAccess = useCallback(
    async (email: string) => {
      try {
        const normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail) throw new Error("Digite o e-mail usado na compra.");

        const identity = deviceIdentity ?? (await getDeviceIdentity());
        setDeviceIdentity(identity);
        const result = await invokeLicenseSession("verify", normalizedEmail, identity);
        const nextSession = buildSession(normalizedEmail, result);
        if (!nextSession.entitlement || nextSession.access !== "allowed") {
          throw new Error("Nenhum acesso ativo foi encontrado para este e-mail neste computador.");
        }
        setLicenseSession(nextSession);
        setError(null);
        return nextSession.entitlement;
      } catch (verifyError) {
        throw new Error(friendlyAuthError(verifyError));
      }
    },
    [deviceIdentity, setLicenseSession],
  );

  const signInWithGoogle = useCallback(async () => {
    setError("O login Google foi removido do fluxo do cliente. Use e-mail e código de acesso.");
  }, []);

  const signOut = useCallback(async () => {
    const stored = readStoredSession();
    const reusableSession =
      stored && isSessionFresh(stored) && stored.access === "allowed" ? stored : null;
    const emailToRemember = reusableSession?.email ?? session?.email ?? rememberedEmail;
    if (emailToRemember) {
      setRememberedEmail(emailToRemember);
      writeRememberedEmail(emailToRemember);
    }
    setDeviceTransfer(null);
    setError(null);
    if (reusableSession) {
      setLicenseSession(reusableSession);
      void refreshEntitlement({ force: true });
      return;
    }
    setLicenseSession(null);
  }, [refreshEntitlement, rememberedEmail, session?.email, setLicenseSession]);

  const redeemCode = useCallback(
    async (code: string, email?: string) => {
      const targetEmail = email ?? session?.email ?? "";
      try {
        return await activateWithEmailCode(targetEmail, code);
      } catch (activationError) {
        throw new Error(friendlyAuthError(activationError));
      }
    },
    [activateWithEmailCode, session?.email],
  );

  const requestDeviceTransfer = useCallback(async () => {
    throw new Error("A troca automática de computador será conectada ao novo fluxo de e-mail.");
  }, []);

  const cancelDeviceTransfer = useCallback(async () => {
    throw new Error("A troca automática de computador será conectada ao novo fluxo de e-mail.");
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading,
      session,
      rememberedEmail,
      user: makeUserFromSession(session),
      entitlement,
      deviceIdentity,
      deviceAccess,
      deviceTransfer,
      error,
      activateWithEmailCode,
      verifyEmailAccess,
      signInWithGoogle,
      signOut,
      redeemCode,
      requestDeviceTransfer,
      cancelDeviceTransfer,
      refreshEntitlement,
      clearError,
    }),
    [
      activateWithEmailCode,
      cancelDeviceTransfer,
      clearError,
      configured,
      deviceAccess,
      deviceIdentity,
      deviceTransfer,
      entitlement,
      error,
      loading,
      rememberedEmail,
      redeemCode,
      refreshEntitlement,
      requestDeviceTransfer,
      session,
      signInWithGoogle,
      signOut,
      verifyEmailAccess,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useNexAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useNexAuth must be used inside NexAuthProvider.");
  return context;
}
