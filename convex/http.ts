import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction, type ActionCtx } from "./_generated/server";
import { isIsoDate, today } from "./lib/dates";
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, verifySignature } from "./lib/hmac";

/**
 * Endpoints n8n calls. Every request must be signed with N8N_TO_LENDLOOP_SECRET (see lib/hmac.ts);
 * anything else gets a bare 401 that says nothing about why.
 */
const MAX_BODY_BYTES = 16 * 1024;

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

type Body = Record<string, unknown>;

function signed(handler: (ctx: ActionCtx, body: Body) => Promise<Response>) {
  return httpAction(async (ctx, request) => {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return json(413, { error: "payload too large" });
    const check = await verifySignature(
      process.env.N8N_TO_LENDLOOP_SECRET,
      raw,
      request.headers.get(TIMESTAMP_HEADER),
      request.headers.get(SIGNATURE_HEADER),
    );
    if (!check.ok) {
      console.warn(`Rejected n8n request to ${new URL(request.url).pathname}: ${check.reason}`);
      return json(401, { error: "unauthorized" });
    }
    let body: unknown;
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return json(400, { error: "body must be JSON" });
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) return json(400, { error: "body must be an object" });
    return await handler(ctx, body as Body);
  });
}

const str = (body: Body, key: string, max = 300) => {
  const value = body[key];
  return typeof value === "string" && value.length > 0 && value.length <= max ? value : null;
};
const status = (body: Body) => (body.status === "sent" || body.status === "failed" ? body.status : null);

const http = httpRouter();

/** Overdue loans not yet reminded today. Body: {"asOf"?: "YYYY-MM-DD"} (default: today, UTC). */
http.route({
  path: "/n8n/overdue-loans",
  method: "POST",
  handler: signed(async (ctx, body) => {
    const asOf = body.asOf === undefined ? today() : str(body, "asOf", 10);
    if (!asOf || !isIsoDate(asOf)) return json(400, { error: "asOf must be YYYY-MM-DD" });
    const loans = await ctx.runQuery(internal.reminders.overdue, { asOf });
    return json(200, { asOf, count: loans.length, loans });
  }),
});

/** Reminder write-back. Body: {"reminderKey", "status": "sent"|"failed", "error"?}. Idempotent. */
http.route({
  path: "/n8n/reminders",
  method: "POST",
  handler: signed(async (ctx, body) => {
    const reminderKey = str(body, "reminderKey", 100);
    const outcome = status(body);
    if (!reminderKey || !outcome) return json(400, { error: "reminderKey and status (sent|failed) are required" });
    const result = await ctx.runMutation(internal.reminders.record, {
      reminderKey,
      status: outcome,
      error: str(body, "error") ?? undefined,
    });
    return result.ok ? json(200, result) : json(404, { error: result.reason });
  }),
});

/** Notification outcome. Body: {"eventId", "status": "sent"|"failed", "error"?}. Idempotent. */
http.route({
  path: "/n8n/notification-status",
  method: "POST",
  handler: signed(async (ctx, body) => {
    const eventId = str(body, "eventId", 100);
    const outcome = status(body);
    if (!eventId || !outcome) return json(400, { error: "eventId and status (sent|failed) are required" });
    const result = await ctx.runMutation(internal.notifications.report, {
      eventId,
      status: outcome,
      error: str(body, "error") ?? undefined,
    });
    return result.found ? json(200, result) : json(404, { error: "unknown event" });
  }),
});

export default http;
