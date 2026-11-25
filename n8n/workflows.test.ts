// @vitest-environment node
/**
 * Checks the exported n8n workflows without an n8n instance: their structure, that they carry no
 * secrets, and the JavaScript inside their Code nodes, run against the same signing code Convex uses.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { signatureHeaders, verifySignature } from "../convex/lib/hmac";

type N8nNode = { name: string; type: string; typeVersion: number; parameters: Record<string, unknown>; [k: string]: unknown };
type Workflow = { id: string; name: string; nodes: N8nNode[]; connections: Record<string, { main: { node: string }[][] }>; settings: Record<string, unknown> };

const dir = path.join(__dirname, "workflows");
const load = (file: string): Workflow => JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
const events = load("lendloop-request-notification.json");
const reminders = load("lendloop-overdue-reminders.json");
const errors = load("lendloop-error-handler.json");
const all = [events, reminders, errors];

// Node types and versions available in n8n 2.49.6 (n8n-nodes-base), the version docker-compose pins.
const KNOWN: Record<string, number[]> = {
  "n8n-nodes-base.webhook": [2, 2.1, 2.2],
  "n8n-nodes-base.code": [2],
  "n8n-nodes-base.if": [2, 2.1, 2.2, 2.3, 2.4],
  "n8n-nodes-base.respondToWebhook": [1.1, 1.2, 1.3, 1.4, 1.5],
  "n8n-nodes-base.removeDuplicates": [2],
  "n8n-nodes-base.emailSend": [2, 2.1],
  "n8n-nodes-base.httpRequest": [4.2, 4.3, 4.4, 4.5],
  "n8n-nodes-base.scheduleTrigger": [1.2, 1.3, 1.4],
  "n8n-nodes-base.splitOut": [1, 1.1],
  "n8n-nodes-base.stopAndError": [1],
  "n8n-nodes-base.errorTrigger": [1],
};

const TO_N8N = "test-convex-to-n8n";
const FROM_N8N = "test-n8n-to-convex";
const ENV = {
  LENDLOOP_TO_N8N_SECRET: TO_N8N,
  N8N_TO_LENDLOOP_SECRET: FROM_N8N,
  LENDLOOP_CONVEX_SITE_URL: "http://lendloop.test",
  LENDLOOP_MAIL_FROM: "LendLoop <no-reply@lendloop.test>",
  LENDLOOP_OPS_EMAIL: "ops@lendloop.test",
};

type Item = { json: Record<string, unknown>; binary?: Record<string, { data: string }> };

/** Runs one Code node the way n8n does: $env, $input, $json, $('Node'), require, this.helpers. */
async function runCode(
  wf: Workflow,
  name: string,
  { items = [] as Item[], json = {} as Record<string, unknown>, env = ENV as Record<string, string | undefined>, others = {} as Record<string, Record<string, unknown>> } = {},
) {
  const node = wf.nodes.find((n) => n.name === name);
  if (!node) throw new Error(`no node ${name}`);
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
  const fn = new AsyncFunction("$env", "$input", "$json", "$", "require", "Buffer", node.parameters.jsCode as string);
  const self = {
    helpers: {
      getBinaryDataBuffer: async (index: number, prop: string) => Buffer.from(items[index].binary![prop].data, "base64"),
    },
  };
  const $input = { first: () => items[0], all: () => items, item: { json } };
  const $ = (other: string) => ({ item: { json: others[other] } });
  return await fn.call(self, env, $input, json, $, createRequire(__filename), Buffer);
}

describe("workflow structure", () => {
  test.each(all.map((w) => [w.name, w] as const))("%s: known nodes, valid connections", (_name, wf) => {
    const names = new Set(wf.nodes.map((n) => n.name));
    expect(names.size).toBe(wf.nodes.length);
    for (const n of wf.nodes) expect(KNOWN[n.type], `${n.name}: ${n.type}`).toContain(n.typeVersion);
    for (const [from, { main }] of Object.entries(wf.connections)) {
      expect(names.has(from), from).toBe(true);
      for (const target of main.flat()) expect(names.has(target.node), target.node).toBe(true);
    }
    expect(wf.settings.saveDataSuccessExecution).toBe("none");
  });

  test("both workflows report failures to the error workflow", () => {
    expect(events.settings.errorWorkflow).toBe(errors.id);
    expect(reminders.settings.errorWorkflow).toBe(errors.id);
  });

  test("no secrets in the exports: only references to environment variables and a credential name", () => {
    for (const wf of all) {
      const text = JSON.stringify(wf);
      expect(text).not.toMatch(/password|apiKey|-----BEGIN|sk_(live|test)_/i);
      expect(text).not.toMatch(/[0-9a-f]{32,}/); // no hard-coded keys or signatures
      const secretMentions = text.match(/[A-Z0-9_]*SECRET[A-Z0-9_]*/g) ?? [];
      expect(secretMentions.every((m) => m === "LENDLOOP_TO_N8N_SECRET" || m === "N8N_TO_LENDLOOP_SECRET")).toBe(true);
      for (const n of wf.nodes.filter((n) => n.credentials)) expect(n.credentials).toEqual({ smtp: { id: expect.any(String), name: "LendLoop SMTP" } });
    }
  });

  test("the webhook keeps the raw body (needed to check the signature) and answers from the flow", () => {
    const hook = events.nodes.find((n) => n.type === "n8n-nodes-base.webhook")!;
    expect(hook.parameters).toMatchObject({ httpMethod: "POST", responseMode: "responseNode", options: { rawBody: true } });
  });

  test("retries where they are safe, not where they would duplicate emails", () => {
    const byName = (wf: Workflow, name: string) => wf.nodes.find((n) => n.name === name)!;
    expect(byName(events, "Send email").retryOnFail).toBe(true); // one email per execution
    expect(byName(reminders, "Send reminder").retryOnFail).toBe(false); // many emails per execution
    expect(byName(reminders, "Write back to LendLoop").retryOnFail).toBe(true); // idempotent writes
    expect(byName(events, "Report to LendLoop").retryOnFail).toBe(true);
  });
});

const event = {
  eventId: "evt123",
  deliveryId: "evt123:0",
  type: "loan.requested",
  occurredAt: "2026-06-10T09:00:00.000Z",
  recipient: { name: "Alice", email: "alice@example.com", role: "owner" },
  otherParty: { name: "Bob" },
  tool: { name: "Cordless drill" },
  loan: { id: "loan1", startDate: "2026-06-10", endDate: "2026-06-12", status: "requested" },
};

async function webhookItem(body: string, secret = TO_N8N, nowMs = Date.now()): Promise<Item> {
  const signed = await signatureHeaders(secret, body, nowMs);
  // Express (and so n8n) lowercases header names.
  const headers = Object.fromEntries(Object.entries(signed).map(([k, v]) => [k.toLowerCase(), v]));
  return { json: { headers, body: JSON.parse(body) }, binary: { data: { data: Buffer.from(body).toString("base64") } } };
}

describe("request notification: Code nodes", () => {
  test("accepts an event signed by Convex", async () => {
    const body = JSON.stringify(event);
    const [out] = await runCode(events, "Verify signature", { items: [await webhookItem(body)] });
    expect(out.json).toEqual({ valid: true, event });
  });

  test("rejects tampered, stale, wrongly signed or unsigned events", async () => {
    const body = JSON.stringify(event);
    const tampered = await webhookItem(body);
    tampered.binary!.data.data = Buffer.from(body.replace("Bob", "Eve")).toString("base64");
    const cases: [Item, string][] = [
      [tampered, "bad signature"],
      [await webhookItem(body, "wrong-secret"), "bad signature"],
      [await webhookItem(body, TO_N8N, Date.now() - 600_000), "stale timestamp"],
      [{ json: { headers: {} }, binary: { data: { data: "" } } }, "missing signature headers"],
    ];
    for (const [item, reason] of cases) {
      const [out] = await runCode(events, "Verify signature", { items: [item] });
      expect(out.json).toEqual({ valid: false, reason });
    }
    const [noSecret] = await runCode(events, "Verify signature", {
      items: [await webhookItem(body)],
      env: { ...ENV, LENDLOOP_TO_N8N_SECRET: undefined },
    });
    expect(noSecret.json.valid).toBe(false);
  });

  test("builds an email from the event, carrying nothing else forward", async () => {
    const out = await runCode(events, "Build email", { json: { valid: true, event } });
    expect(Object.keys(out.json).sort()).toEqual(["eventId", "subject", "text", "to"]);
    expect(out.json).toMatchObject({ to: "alice@example.com", subject: "Bob wants to borrow your Cordless drill" });
    for (const type of ["loan.approved", "loan.declined", "loan.cancelled", "loan.returned"]) {
      const o = await runCode(events, "Build email", { json: { event: { ...event, type } } });
      expect(o.json.subject).toContain("Cordless drill");
    }
  });

  test("signs the status report so Convex accepts it", async () => {
    const sent = await runCode(events, "Sign report", { json: {}, others: { "Build email": { eventId: "evt123" } } });
    const h = sent.json.headers as Record<string, string>;
    expect(await verifySignature(FROM_N8N, sent.json.body, h["X-LendLoop-Timestamp"], h["X-LendLoop-Signature"])).toEqual({ ok: true });
    expect(JSON.parse(sent.json.body)).toEqual({ eventId: "evt123", status: "sent" });

    const failed = await runCode(events, "Sign report", { json: { error: "SMTP down" }, others: { "Build email": { eventId: "evt123" } } });
    expect(JSON.parse(failed.json.body)).toEqual({ eventId: "evt123", status: "failed", error: "SMTP down" });
  });
});

describe("overdue reminders: Code nodes", () => {
  test("signs the overdue-loans request", async () => {
    const [out] = await runCode(reminders, "Sign request");
    const h = out.json.headers as Record<string, string>;
    expect(out.json.body).toBe("{}");
    expect(await verifySignature(FROM_N8N, out.json.body, h["X-LendLoop-Timestamp"], h["X-LendLoop-Signature"])).toEqual({ ok: true });
  });

  test("builds one reminder per loan and signs an idempotent write-back", async () => {
    const loan = {
      loanId: "loan1",
      reminderKey: "loan1:2026-06-15",
      borrower: { name: "Bob", email: "bob@example.com" },
      tool: { name: "Cordless drill" },
      endDate: "2026-06-12",
      daysOverdue: 3,
    };
    const email = await runCode(reminders, "Build reminder", { json: loan });
    expect(email.json).toMatchObject({ reminderKey: "loan1:2026-06-15", to: "bob@example.com" });
    expect(email.json.text).toContain("3 days ago");

    const back = await runCode(reminders, "Sign write-back", { json: {}, others: { "Build reminder": email.json } });
    const h = back.json.headers as Record<string, string>;
    expect(await verifySignature(FROM_N8N, back.json.body, h["X-LendLoop-Timestamp"], h["X-LendLoop-Signature"])).toEqual({ ok: true });
    expect(JSON.parse(back.json.body)).toEqual({ reminderKey: "loan1:2026-06-15", status: "sent" });
  });
});

describe("error workflow", () => {
  test("alerts with a link to the execution, not its data", async () => {
    const out = await runCode(errors, "Format alert", {
      json: {
        workflow: { id: "LendLoopRemind01", name: "LendLoop: overdue reminders" },
        execution: { id: "42", url: "http://localhost:5678/workflow/LendLoopRemind01/executions/42", lastNodeExecuted: "Write back to LendLoop", error: { message: "timeout" } },
      },
    });
    expect(out.json.subject).toBe("[LendLoop] LendLoop: overdue reminders failed");
    expect(out.json.text).toContain("executions/42");
    expect(out.json.text).toContain("timeout");
  });
});
