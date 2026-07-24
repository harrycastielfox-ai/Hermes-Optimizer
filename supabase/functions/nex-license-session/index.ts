import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type LicenseAction = "activate" | "verify";

type LicenseRequest = {
  action?: LicenseAction;
  email?: string;
  code?: string;
  device?: {
    fingerprint?: string;
    label?: string;
    source?: string;
  };
};

type LicenseRow = {
  account_id: string | null;
  account_email: string;
  access_allowed: boolean;
  access_reason: string;
  license_plan_id: string | null;
  license_plan_name: string | null;
  license_status: string | null;
  license_starts_at: string | null;
  license_expires_at: string | null;
  licensed_device_label: string | null;
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

function safeError(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function normalizeEmail(email: string | undefined) {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

function validatePayload(payload: LicenseRequest) {
  const email = normalizeEmail(payload.email);
  const fingerprint = String(payload.device?.fingerprint ?? "")
    .trim()
    .toLowerCase();
  const label =
    String(payload.device?.label ?? "PC Windows")
      .trim()
      .slice(0, 120) || "PC Windows";

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error("ACCOUNT_EMAIL_REQUIRED");
  }
  if (!/^[a-f0-9]{64}$/.test(fingerprint)) {
    throw new Error("INVALID_DEVICE");
  }

  return { email, fingerprint, label };
}

function mapAccessReason(reason: string) {
  if (reason === "ALLOWED") return "allowed";
  if (reason === "NO_ENTITLEMENT") return "unlicensed";
  if (reason === "EXPIRED") return "expired";
  if (reason === "REVOKED") return "revoked";
  if (reason === "DEVICE_MISMATCH" || reason === "DEVICE_ALREADY_BOUND") return "blocked";
  return "unavailable";
}

function mapRow(row: LicenseRow) {
  const entitlement =
    row.license_plan_id && row.license_expires_at
      ? {
          userId: String(row.account_id ?? row.account_email),
          planId: row.license_plan_id,
          planName: row.license_plan_name ?? row.license_plan_id,
          status:
            row.license_status === "revoked"
              ? "revoked"
              : new Date(row.license_expires_at).getTime() <= Date.now()
                ? "expired"
                : "active",
          startsAt: row.license_starts_at ?? new Date().toISOString(),
          expiresAt: row.license_expires_at,
        }
      : null;

  return {
    ok: true,
    account: {
      id: row.account_id,
      email: row.account_email,
    },
    access: mapAccessReason(row.access_reason),
    accessReason: row.access_reason,
    entitlement,
    deviceLabel: row.licensed_device_label,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ ok: false, error: "SERVER_NOT_CONFIGURED" }, 500);
  }

  let payload: LicenseRequest;
  try {
    payload = (await req.json()) as LicenseRequest;
  } catch {
    return json({ ok: false, error: "INVALID_JSON" }, 400);
  }

  const action = payload.action;
  if (action !== "activate" && action !== "verify") {
    return json({ ok: false, error: "INVALID_ACTION" }, 400);
  }

  try {
    const { email, fingerprint, label } = validatePayload(payload);
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const rpcName =
      action === "activate" ? "redeem_email_license_code" : "get_email_device_entitlement";
    const rpcPayload =
      action === "activate"
        ? {
            requested_email: email,
            redemption_code: String(payload.code ?? ""),
            device_fingerprint: fingerprint,
            requested_device_label: label,
          }
        : {
            requested_email: email,
            device_fingerprint: fingerprint,
            requested_device_label: label,
          };

    const { data, error } = await admin.rpc(rpcName, rpcPayload);
    if (error) return json({ ok: false, error: error.message }, 400);

    const row = (Array.isArray(data) ? data[0] : data) as LicenseRow | undefined;
    if (!row) return json({ ok: false, error: "LICENSE_NOT_FOUND" }, 404);
    return json(mapRow(row));
  } catch (error) {
    return json({ ok: false, error: safeError(error) }, 400);
  }
});
