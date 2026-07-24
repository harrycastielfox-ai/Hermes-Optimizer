import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-nex-admin-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AdminRequest = {
  action?: string;
  planId?: string;
  assignedEmail?: string;
  expiresAt?: string | null;
  note?: string | null;
  transferId?: string;
  decision?: "approved" | "rejected";
  userId?: string;
  reason?: string | null;
};

type AdminKeyRow = {
  id: string;
  label: string;
  actor_email: string;
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

function normalizeAdminKey(value: string | null) {
  return String(value ?? "").trim();
}

function safeMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readPayload(req: Request) {
  try {
    return (await req.json()) as AdminRequest;
  } catch {
    throw new Error("INVALID_JSON");
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "SERVER_NOT_CONFIGURED" }, 500);
  }

  const adminKey = normalizeAdminKey(req.headers.get("x-nex-admin-key"));
  if (adminKey.length < 32) return json({ error: "ADMIN_KEY_REQUIRED" }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const keyHash = await sha256Hex(adminKey);
  const { data: adminKeyRow, error: adminError } = await admin
    .from("license_admin_keys")
    .select("id, label, actor_email")
    .eq("key_hash", keyHash)
    .eq("active", true)
    .maybeSingle<AdminKeyRow>();

  if (adminError) return json({ error: "ADMIN_LOOKUP_FAILED" }, 500);
  if (!adminKeyRow) return json({ error: "ADMIN_NOT_ALLOWED" }, 403);

  await admin
    .from("license_admin_keys")
    .update({ last_used_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", adminKeyRow.id);

  let payload: AdminRequest;
  try {
    payload = await readPayload(req);
  } catch (error) {
    return json({ error: safeMessage(error) }, 400);
  }

  if (payload.action === "create_code") {
    if (!payload.planId || !payload.assignedEmail) {
      return json({ error: "INVALID_CREATE_CODE_REQUEST" }, 400);
    }
    const { data, error } = await admin.rpc("admin_create_license_code", {
      requested_plan_id: payload.planId,
      assigned_email: payload.assignedEmail,
      actor_email: adminKeyRow.actor_email,
      code_expires_at: payload.expiresAt ?? null,
      code_note: payload.note ?? null,
    });
    if (error) return json({ error: error.message }, 400);
    return json({
      admin: { label: adminKeyRow.label },
      code: Array.isArray(data) ? data[0] : data,
    });
  }

  if (payload.action === "list_transfers") {
    const { data, error } = await admin
      .from("device_transfer_requests")
      .select("id, user_id, requested_device_label, status, requested_at, reviewed_at, review_note")
      .in("status", ["pending", "approved", "rejected", "expired"])
      .order("requested_at", { ascending: false })
      .limit(100);
    if (error) return json({ error: error.message }, 400);
    return json({ admin: { label: adminKeyRow.label }, transfers: data ?? [] });
  }

  if (payload.action === "review_transfer") {
    if (!payload.transferId || !payload.decision) {
      return json({ error: "INVALID_REVIEW_REQUEST" }, 400);
    }
    const { data, error } = await admin.rpc("admin_review_device_transfer", {
      transfer_request_id: payload.transferId,
      transfer_decision: payload.decision,
      actor_email: adminKeyRow.actor_email,
      reviewer_note: payload.note ?? null,
    });
    if (error) return json({ error: error.message }, 400);
    return json({ admin: { label: adminKeyRow.label }, status: data });
  }

  if (payload.action === "list_codes") {
    const { data, error } = await admin
      .from("license_codes")
      .select("id, plan_id, status, created_at, redeemed_at, expires_at, note")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return json({ error: error.message }, 400);
    return json({ admin: { label: adminKeyRow.label }, codes: data ?? [] });
  }

  if (payload.action === "revoke_license") {
    if (!payload.userId) return json({ error: "INVALID_USER_ID" }, 400);
    const { data, error } = await admin.rpc("admin_revoke_entitlement", {
      target_user_id: payload.userId,
      actor_email: adminKeyRow.actor_email,
      revoke_reason: payload.reason ?? null,
    });
    if (error) return json({ error: error.message }, 400);
    return json({ admin: { label: adminKeyRow.label }, revoked: Boolean(data) });
  }

  return json({ error: "UNKNOWN_ACTION" }, 400);
});
