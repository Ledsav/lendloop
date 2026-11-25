import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery, type MutationCtx, type QueryCtx } from "./_generated/server";
import { addDays, today as todayOf } from "./lib/dates";
import { CURRENT_LOANS, FAILED_EMAIL_ITEM, ITEMS, NEIGHBOURS, PEOPLE, REAL_KEYS, historyFor } from "./lib/seedData";
import type { EventType } from "./lib/validators";

function requireDevTools() {
  if (process.env.LENDLOOP_DEV_TOOLS !== "true")
    throw new ConvexError("Set LENDLOOP_DEV_TOOLS=true on this development deployment first.");
}

/**
 * Development helper for trying the overdue reminders without waiting: moves a loan's dates back.
 * Internal (CLI or dashboard only) and refuses to run unless LENDLOOP_DEV_TOOLS=true is set on the
 * deployment, so it can't touch production data by accident.
 *   npx convex env set LENDLOOP_DEV_TOOLS true
 *   npx convex run devtools:backdateLoan '{"loanId": "<id from the loans table>", "days": 5}'
 */
export const backdateLoan = internalMutation({
  args: { loanId: v.id("loans"), days: v.number() },
  handler: async (ctx, { loanId, days }) => {
    requireDevTools();
    const loan = await ctx.db.get("loans", loanId);
    if (!loan) throw new ConvexError("Loan not found.");
    const shift = (iso: string) => new Date(Date.parse(`${iso}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10);
    await ctx.db.patch("loans", loanId, { startDate: shift(loan.startDate), endDate: shift(loan.endDate) });
    return { startDate: shift(loan.startDate), endDate: shift(loan.endDate) };
  },
});

const HOUR = 3_600_000;
const MINUTE = 60_000;
const DEFAULT_REAL_EMAILS = ["lena+clerk_test@example.com", "sam+clerk_test@example.com"];

type SeedTable = Doc<"seedRows">["table"];

function counts(rows: { table: SeedTable }[]) {
  const n = (table: SeedTable) => rows.filter((r) => r.table === table).length;
  return { people: n("users"), items: n("tools"), loans: n("loans") };
}

/** The two real accounts that own and borrow sample items; a clear error until both have signed in. */
async function findRealAccounts(ctx: QueryCtx | MutationCtx, realEmails: string[]) {
  const users = await ctx.db.query("users").collect();
  const matches = realEmails.map((e) => users.filter((u) => u.email.toLowerCase() === e.toLowerCase()));
  if (realEmails.length !== REAL_KEYS.length || matches.some((m) => m.length !== 1))
    throw new ConvexError(
      `Sign in once as each of these accounts first, then run the seed again: ${realEmails.join(", ")}. ` +
        "Or pass realEmails with two accounts that have signed in.",
    );
  return matches.map((m) => m[0]);
}

const UNSEED_BATCH = 40;

async function deleteLoanWithHistory(ctx: MutationCtx, loanId: Id<"loans">) {
  const events = await ctx.db.query("outbox").withIndex("by_loan", (q) => q.eq("loanId", loanId)).collect();
  for (const e of events) await ctx.db.delete("outbox", e._id);
  const reminders = await ctx.db.query("reminders").withIndex("by_loan", (q) => q.eq("loanId", loanId)).collect();
  for (const r of reminders) await ctx.db.delete("reminders", r._id);
  await ctx.db.delete("loans", loanId);
}

/**
 * Removes up to one batch of sample data, newest rows first: loans (with their emails and
 * reminders) go before the items, so by the time an item goes, any loan still on it was made by
 * someone since, and goes with it. Returns whether anything is left.
 */
export const unseedBatch = internalMutation({
  args: {},
  handler: async (ctx) => {
    requireDevTools();
    const rows = await ctx.db.query("seedRows").order("desc").take(UNSEED_BATCH);
    for (const row of rows) {
      const id = ctx.db.normalizeId(row.table, row.docId);
      if (id && (await ctx.db.get(id))) {
        if (row.table === "loans") await deleteLoanWithHistory(ctx, id as Id<"loans">);
        else {
          if (row.table === "tools") {
            const left = await ctx.db
              .query("loans")
              .withIndex("by_tool_status", (q) => q.eq("toolId", id as Id<"tools">))
              .collect();
            for (const loan of left) await deleteLoanWithHistory(ctx, loan._id);
          }
          await ctx.db.delete(id);
        }
      }
      await ctx.db.delete("seedRows", row._id);
    }
    return { done: rows.length < UNSEED_BATCH && (await ctx.db.query("seedRows").first()) === null };
  },
});

export const checkRealAccounts = internalQuery({
  args: { realEmails: v.optional(v.array(v.string())) },
  handler: async (ctx, { realEmails = DEFAULT_REAL_EMAILS }) => {
    requireDevTools();
    await findRealAccounts(ctx, realEmails);
    return null;
  },
});

/**
 * Starts the sample data over, with dates relative to today: removes it in batches (one mutation
 * can't delete and rewrite it all within Convex's time limit), then seeds again.
 *   npx convex run devtools:reseed
 */
export const reseed = internalAction({
  args: { realEmails: v.optional(v.array(v.string())) },
  handler: async (ctx, args): Promise<{ seeded: boolean; people: number; items: number; loans: number }> => {
    requireDevTools();
    await ctx.runQuery(internal.devtools.checkRealAccounts, args); // before deleting anything
    while (!(await ctx.runMutation(internal.devtools.unseedBatch, {})).done);
    return await ctx.runMutation(internal.devtools.seed, args);
  },
});

/**
 * Fills a development deployment with sample data: ten neighbours (who exist only here and can't
 * sign in), 29 things to borrow in every category, and loans in every state with their history.
 * The history (emails, reminders) is written as already sent: nothing is scheduled and nothing is
 * emailed. Running it again does nothing; devtools:reseed starts it over, with dates relative to
 * today. The two real accounts (the Clerk test users by default) must have signed in once.
 *   npx convex env set LENDLOOP_DEV_TOOLS true
 *   npx convex run devtools:seed
 */
export const seed = internalMutation({
  args: { realEmails: v.optional(v.array(v.string())) },
  handler: async (ctx, { realEmails = DEFAULT_REAL_EMAILS }) => {
    requireDevTools();
    const real = await findRealAccounts(ctx, realEmails);
    const previous = await ctx.db.query("seedRows").collect();
    if (previous.length > 0) return { seeded: false, ...counts(previous) };

    const written: { table: SeedTable }[] = [];
    const record = async (table: SeedTable, docId: string) => {
      await ctx.db.insert("seedRows", { table, docId });
      written.push({ table });
    };

    const now = Date.now();
    const today = todayOf(now);
    const day = (n: number) => addDays(today, n);
    const at = (iso: string, hour: number) => Date.parse(`${iso}T00:00:00Z`) + hour * HOUR;

    const people = new Map<string, Id<"users">>();
    REAL_KEYS.forEach((key, i) => people.set(key, real[i]._id));
    await ctx.db.patch("users", people.get("lena")!, { trustedLender: true }); // as in the mockups
    for (const n of NEIGHBOURS) {
      const id = await ctx.db.insert("users", {
        tokenIdentifier: `seed|${n.key}`, // matches no Clerk identity, so nobody can sign in as them
        name: n.name,
        email: `${n.key}@example.com`,
        role: "user",
        trustedLender: n.trusted ?? false,
      });
      people.set(n.key, id);
      await record("users", id);
    }

    const tools = new Map<string, { id: Id<"tools">; owner: Id<"users"> }>();
    for (const it of ITEMS) {
      const owner = people.get(it.owner)!;
      const id = await ctx.db.insert("tools", {
        ownerId: owner,
        name: it.name,
        category: it.category,
        condition: it.condition,
        description: it.note,
      });
      tools.set(it.key, { id, owner });
      await record("tools", id);
    }

    const email = async (loanId: Id<"loans">, type: EventType, recipient: "owner" | "borrower", when: number, failed = false) => {
      // Emails and reminders aren't recorded in seedRows: they go when their loan goes.
      await ctx.db.insert("outbox", {
        type,
        loanId,
        recipient,
        status: failed ? "failed" : "sent",
        attempts: failed ? 6 : 1,
        generation: 0,
        lastError: failed ? "n8n answered HTTP 502" : undefined,
        updatedAt: when + MINUTE,
      });
    };

    type Spec = {
      item: string;
      borrower: string;
      start: number;
      end: number;
      status: Doc<"loans">["status"];
      lateReturn?: boolean;
      openIndex?: number;
    };
    const addLoan = async (spec: Spec) => {
      const tool = tools.get(spec.item)!;
      const startDate = day(spec.start);
      const endDate = day(spec.end);
      const requestedAt =
        spec.status === "requested"
          ? now - ((spec.openIndex ?? 0) + 1) * 3 * HOUR
          : Math.min(at(addDays(startDate, -2), 18), now - 26 * HOUR);
      const decidedAt = spec.status === "requested" ? undefined : requestedAt + 3 * HOUR;
      const returnedAt =
        spec.status === "returned" ? at(spec.lateReturn ? addDays(endDate, 1) : endDate, 17) : undefined;
      const loanId = await ctx.db.insert("loans", {
        toolId: tool.id,
        ownerId: tool.owner,
        borrowerId: people.get(spec.borrower)!,
        startDate,
        endDate,
        status: spec.status,
        requestedAt,
        decidedAt,
        returnedAt,
      });
      await record("loans", loanId);

      // The emails it went through, recorded as already sent (n8n never sees them).
      await email(loanId, "loan.requested", "owner", requestedAt);
      if (spec.status === "declined") await email(loanId, "loan.declined", "borrower", decidedAt!);
      if (spec.status === "cancelled") await email(loanId, "loan.cancelled", "owner", decidedAt!);
      if (spec.status === "approved" || spec.status === "returned") {
        const failed = spec.item === FAILED_EMAIL_ITEM && spec.status === "approved";
        await email(loanId, "loan.approved", "borrower", decidedAt!, failed);
      }
      if (returnedAt !== undefined) await email(loanId, "loan.returned", "borrower", returnedAt);

      // A late loan has had a reminder every morning since it was due.
      if (spec.status === "approved" && endDate < today) {
        for (let d = addDays(endDate, 1); d <= today; d = addDays(d, 1)) {
          const sentAt = at(d, 9);
          if (sentAt > now) break;
          await ctx.db.insert("reminders", {
            key: `${loanId}:${d}`,
            loanId,
            date: d,
            status: "sent",
            writes: 1,
            updatedAt: sentAt,
          });
        }
      }
    };

    // History first, so today's loans are the newest rows.
    for (const [index, it] of ITEMS.entries())
      for (const past of historyFor(index, it, PEOPLE)) await addLoan({ item: it.key, status: "returned", ...past });
    let openIndex = 0;
    for (const current of CURRENT_LOANS)
      await addLoan({ ...current, openIndex: current.status === "requested" ? openIndex++ : undefined });

    return { seeded: true, ...counts(written) };
  },
});
