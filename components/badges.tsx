import { Badge } from "./ui";

export function AvailabilityBadge({ value }: { value: "available" | "on_loan" | "overdue" }) {
  if (value === "available") return <Badge tone="green">Available</Badge>;
  if (value === "overdue") return <Badge tone="red">On loan · overdue</Badge>;
  return <Badge tone="amber">On loan</Badge>;
}

const STATUS = {
  requested: { tone: "blue", label: "Requested" },
  approved: { tone: "green", label: "Approved" },
  declined: { tone: "gray", label: "Declined" },
  cancelled: { tone: "gray", label: "Cancelled" },
  returned: { tone: "gray", label: "Returned" },
} as const;

export function LoanStatusBadge({ status, overdue }: { status: keyof typeof STATUS; overdue?: boolean }) {
  if (overdue) return <Badge tone="red">Overdue</Badge>;
  return <Badge tone={STATUS[status].tone}>{STATUS[status].label}</Badge>;
}

export function TrustedBadge() {
  return (
    <span title="Marked as a Trusted Lender by an admin" className="text-xs font-medium text-brand-700">
      ★ Trusted Lender
    </span>
  );
}
