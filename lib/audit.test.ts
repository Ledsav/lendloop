import { describe, expect, test } from "vitest";
import { auditText, type AuditRow } from "./audit";

const row = (action: AuditRow["action"], over: Partial<AuditRow> = {}): AuditRow =>
  ({ _id: "x", at: 0, action, actor: "Lena", bySystem: false, item: "Cordless drill", other: null, details: null, ...over }) as AuditRow;

describe("audit lines in plain words", () => {
  test("listings", () => {
    expect(auditText(row("listing.created"))).toBe("Lena listed the cordless drill");
    expect(auditText(row("listing.updated"))).toBe("Lena edited the cordless drill");
    expect(auditText(row("listing.removed", { actor: "Ada" }))).toBe("Ada removed the cordless drill");
  });

  test("loans", () => {
    expect(auditText(row("loan.requested", { actor: "Sam", other: "Lena" }))).toBe("Sam asked Lena for the cordless drill");
    expect(auditText(row("loan.approved", { other: "Sam" }))).toBe("Lena approved Sam's request for the cordless drill");
    expect(auditText(row("loan.declined", { other: "Sam" }))).toBe("Lena declined Sam's request for the cordless drill");
    expect(auditText(row("loan.cancelled", { actor: "Sam" }))).toBe("Sam cancelled a request for the cordless drill");
    expect(auditText(row("loan.returned", { other: "Sam" }))).toBe("Lena marked the cordless drill returned by Sam");
  });

  test("people and accounts", () => {
    expect(auditText(row("user.trustedLender", { actor: "Ada", other: "Lena", item: null, details: { trusted: true } }))).toBe(
      "Ada made Lena a trusted lender",
    );
    expect(auditText(row("user.trustedLender", { actor: "Ada", other: "Lena", item: null, details: { trusted: false } }))).toBe(
      "Ada removed Lena's trusted lender mark",
    );
    expect(auditText(row("user.role", { actor: null, bySystem: true, other: "Lena", item: null, details: { role: "admin" } }))).toBe(
      "Lena was made admin from the command line",
    );
    expect(auditText(row("user.role", { actor: null, bySystem: true, other: "Lena", item: null, details: { role: "user" } }))).toBe(
      "Lena was made a user from the command line",
    );
    expect(auditText(row("account.exported", { actor: "Sam", item: null }))).toBe("Sam downloaded their data");
    expect(auditText(row("account.deleted", { actor: "A former neighbour", item: null }))).toBe("A neighbour deleted their account");
    expect(auditText(row("notification.retried", { actor: "Ada" }))).toBe("Ada retried an email about the cordless drill");
  });

  test("missing people and items still read well", () => {
    expect(auditText(row("listing.removed", { actor: null, item: null }))).toBe("Someone removed a removed item");
    expect(auditText(row("loan.approved", { actor: null, other: null, item: null }))).toBe(
      "Someone approved someone's request for a removed item",
    );
  });
});
