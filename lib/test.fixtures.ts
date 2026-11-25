// Test-only data for the lib/ tests.
import type { LoanRowData } from "./timeline";

/** A loan of Lena's drill to Sam, 1–3 Dec, seen by one of them or an admin. */
export function loanFixture(viewerRole: LoanRowData["viewerRole"], over: Partial<LoanRowData> = {}): LoanRowData {
  return {
    viewerRole,
    status: "requested",
    startDate: "2026-12-01",
    endDate: "2026-12-03",
    owner: { name: "Lena", trustedLender: true },
    borrower: { name: "Sam" },
    tool: { name: "Cordless drill", category: "power tools", removed: false },
    ...over,
  } as LoanRowData;
}
