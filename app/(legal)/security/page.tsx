import type { Metadata } from "next";
import { LegalSection, LegalTable, LegalTitle } from "@/components/legal";

export const metadata: Metadata = { title: "Security and compliance – LendLoop" };

const code = (path: string) => <code className="text-[14px] break-all text-slate">{path}</code>;

export default function SecurityPage() {
  return (
    <article>
      <LegalTitle
        title="Security and compliance"
        intro="How LendLoop protects people's data, and how that maps to the ISO standards for security and privacy."
      />

      <LegalSection title="How LendLoop protects data">
        <ul>
          <li>Sign-in by Clerk with emailed codes: LendLoop never stores a password.</li>
          <li>Every server function checks who is asking and what their role allows. The interface hides buttons, but the server decides.</li>
          <li>Only what&apos;s needed is shown: other people see first names only, emails never reach the browser, and the public page shows no owners.</li>
          <li>Who has an item is shown only to its owner, that borrower and admins.</li>
          <li>Messages between LendLoop and its automation are signed (HMAC-SHA256) both ways and checked against replay.</li>
          <li>Emails are queued in the same transaction as the change that causes them, retried, never sent twice, and failures are shown to admins.</li>
          <li>Fair-use limits: 10 borrow requests an hour and 20 new listings a day per person.</li>
          <li>An audit log records who changed what (ids only) and is deleted after 12 months.</li>
          <li>Encrypted in transit (TLS everywhere, with HSTS) and at rest by our providers.</li>
          <li>A content security policy limits what the browser may load and where it may connect.</li>
          <li>Exact dependency versions, automated checks on every change, unit tests and browser tests.</li>
          <li>People can download their data or delete their account in the app, and the demo is closed to real sign-ups.</li>
        </ul>
      </LegalSection>

      <LegalSection title="ISO mapping">
        <p>
          LendLoop is designed to align with these controls of ISO/IEC 27001:2022 (information security), ISO/IEC 27701 (privacy
          information management) and ISO/IEC 27018 (personal data in public clouds). It isn&apos;t certified.
        </p>
        <LegalTable
          head={["Control", "What LendLoop does", "Where"]}
          rows={[
            ["27001 A.5.15 Access control", "Users act only on their own listings and loans; admins only through admin functions", code("convex/lib/auth.ts, convex/loans.ts")],
            ["27001 A.5.17 Authentication information", "No passwords stored; secrets only in environment variables and n8n credentials", code(".env.local.example, .env.n8n.example")],
            ["27001 A.5.34 Privacy and protection of PII", "Data minimisation, rights in the app, a privacy notice", code("convex/account.ts, app/(legal)/privacy")],
            ["27001 A.8.2 Privileged access rights", "The admin role is granted only from the command line, and audited", code("convex/users.ts")],
            ["27001 A.8.3 Information access restriction", "Holder names only for the people involved; no emails to the browser", code("convex/lib/loans.ts, convex/tools.ts")],
            ["27001 A.8.5 Secure authentication", "Every call carries a Clerk token that Convex verifies", code("convex/auth.config.ts")],
            ["27001 A.8.10 Information deletion", "Account deletion; audit entries deleted after 12 months", code("convex/account.ts, convex/crons.ts")],
            ["27001 A.8.15 Logging", "Audit log of every change, ids only", code("convex/lib/audit.ts")],
            ["27001 A.8.16 Monitoring activities", "Failed emails and reminders shown to admins; an n8n error workflow alerts", code("convex/admin.ts, n8n/workflows")],
            ["27001 A.8.24 Use of cryptography", "HMAC-SHA256 signatures; TLS and HSTS", code("convex/lib/hmac.ts, next.config.ts")],
            ["27001 A.8.25 Secure development life cycle", "Checks on every push: lint, types, tests, build", code(".github/workflows/ci.yml")],
            ["27001 A.8.28 Secure coding", "Input validated on the server; a content security policy", code("convex/lib/validators.ts, lib/csp.ts")],
            ["27001 A.8.29 Security testing", "Tests for who may do what; browser tests of the main flow", code("convex/tests/access.test.ts, e2e/")],
            ["27001 A.8.32 Change management", "Changes on branches, checked, deployed from main automatically", code("vercel.json")],
            ["27701 PII minimisation", "Public page: names and categories only; first names elsewhere", code("convex/tools.ts")],
            ["27701 Retention and disposal", "Retention periods set and applied automatically", code("convex/crons.ts")],
            ["27701 Data subject rights", "Download my data, Delete my account", code("app/(app)/account")],
            ["27701 Records of processing", "A data map: what, where, why, lawful basis, how long", code("README.md")],
            ["27018 Purpose limitation", "No marketing, profiling or advertising use", code("app/(legal)/privacy")],
            ["27018 Return and disposal of PII", "Export as a file; deletion on request", code("convex/account.ts")],
            ["27018 Disclosure of subprocessors", "Every provider named in the privacy notice", code("app/(legal)/privacy")],
          ]}
        />
      </LegalSection>

      <LegalSection title="What certification would take">
        <p>
          A certificate needs more than the software: an information security management system with a defined scope, a risk assessment
          and treatment plan, a statement of applicability, written policies, internal audits and management reviews, then an audit by an
          accredited certification body. LendLoop&apos;s design is ready to sit inside such a system; it doesn&apos;t replace it.
        </p>
      </LegalSection>

      <LegalSection title="Reporting a problem">
        <p>Found a security issue? Write to security@lendloop.example. We answer within two business days.</p>
      </LegalSection>
    </article>
  );
}
