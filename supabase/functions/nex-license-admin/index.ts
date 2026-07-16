import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

const authenticatedHandler = withSupabase({ auth: "user" }, async (req, ctx) => {
  const adminEmail = String(ctx.userClaims?.email ?? "")
    .trim()
    .toLowerCase();
  const appMetadata = ctx.userClaims?.appMetadata;
  const provider = String(appMetadata?.provider ?? "").toLowerCase();
  if (provider !== "google" || !adminEmail) {
    return json({ error: "ADMIN_NOT_ALLOWED" }, 403);
  }

  const { data: admin, error: adminError } = await ctx.supabaseAdmin
    .from("license_admins")
    .select("email")
    .eq("email", adminEmail)
    .eq("active", true)
    .maybeSingle();
  if (adminError) return json({ error: "ADMIN_LOOKUP_FAILED" }, 500);
  if (!admin) return json({ error: "ADMIN_NOT_ALLOWED" }, 403);

  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  let payload: AdminRequest;
  try {
    payload = (await req.json()) as AdminRequest;
  } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }

  if (payload.action === "create_code") {
    if (!payload.planId || !payload.assignedEmail) {
      return json({ error: "INVALID_CREATE_CODE_REQUEST" }, 400);
    }
    const { data, error } = await ctx.supabaseAdmin.rpc("admin_create_license_code", {
      requested_plan_id: payload.planId,
      assigned_email: payload.assignedEmail,
      actor_email: adminEmail,
      code_expires_at: payload.expiresAt ?? null,
      code_note: payload.note ?? null,
    } as never);
    if (error) return json({ error: error.message }, 400);
    return json({ code: Array.isArray(data) ? data[0] : data });
  }

  if (payload.action === "list_transfers") {
    const { data, error } = await ctx.supabaseAdmin
      .from("device_transfer_requests")
      .select("id, user_id, requested_device_label, status, requested_at, reviewed_at, review_note")
      .in("status", ["pending", "approved", "rejected", "expired"])
      .order("requested_at", { ascending: false })
      .limit(100);
    if (error) return json({ error: error.message }, 400);
    return json({ transfers: data ?? [] });
  }

  if (payload.action === "review_transfer") {
    if (!payload.transferId || !payload.decision) {
      return json({ error: "INVALID_REVIEW_REQUEST" }, 400);
    }
    const { data, error } = await ctx.supabaseAdmin.rpc("admin_review_device_transfer", {
      transfer_request_id: payload.transferId,
      transfer_decision: payload.decision,
      actor_email: adminEmail,
      reviewer_note: payload.note ?? null,
    } as never);
    if (error) return json({ error: error.message }, 400);
    return json({ status: data });
  }

  if (payload.action === "list_codes") {
    const { data, error } = await ctx.supabaseAdmin
      .from("license_codes")
      .select("id, plan_id, status, created_at, redeemed_at, expires_at, note")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return json({ error: error.message }, 400);
    return json({ codes: data ?? [] });
  }

  if (payload.action === "revoke_license") {
    if (!payload.userId) return json({ error: "INVALID_USER_ID" }, 400);
    const { data, error } = await ctx.supabaseAdmin.rpc("admin_revoke_entitlement", {
      target_user_id: payload.userId,
      actor_email: adminEmail,
      revoke_reason: payload.reason ?? null,
    } as never);
    if (error) return json({ error: error.message }, 400);
    return json({ revoked: Boolean(data) });
  }

  return json({ error: "UNKNOWN_ACTION" }, 400);
});

export default {
  fetch(req: Request) {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    return authenticatedHandler(req);
  },
};
