import type { Metadata } from "next";
import { LegalSection, LegalTable, LegalTitle } from "@/components/legal";

export const metadata: Metadata = { title: "Service levels – LendLoop" };

export default function ServiceLevelsPage() {
  return (
    <article>
      <LegalTitle
        title="Service levels"
        intro="What we aim for in availability, support, incidents and recovery, and what this doesn't cover."
      />

      <LegalSection title="Availability">
        <p>
          We aim for LendLoop to be available 99.5% of each month, about 3 hours and 40 minutes of downtime at most. Planned maintenance
          is announced at least 48 hours ahead and doesn&apos;t count towards it.
        </p>
      </LegalSection>

      <LegalSection title="Support">
        <p>Write to support@lendloop.example, Monday to Friday, 9:00 to 17:00 Central European Time.</p>
        <LegalTable
          head={["Severity", "For example", "First answer", "Fix or workaround"]}
          rows={[
            ["Critical", "Nobody can sign in, or data is at risk", "Within 4 business hours", "Within 1 business day"],
            ["High", "Requests or approvals fail for many people", "Within 1 business day", "Within 3 business days"],
            ["Normal", "Something small is wrong for one person", "Within 2 business days", "In a coming release"],
          ]}
        />
      </LegalSection>

      <LegalSection title="Incidents">
        <ul>
          <li>For a critical incident, people affected hear from us within an hour, then at least every four hours until it&apos;s fixed.</li>
          <li>Afterwards, a short note says what happened, why, and what we changed, within 5 business days.</li>
          <li>
            If personal data is breached, we tell the data protection authority within 72 hours and the people affected without delay when
            the risk to them is high (GDPR, Articles 33 and 34).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Backups and recovery">
        <p>
          The database is backed up daily and backups are kept for 7 days. If we ever need to restore, we aim to lose at most one day of
          changes (recovery point) and to be running again within one day (recovery time).
        </p>
      </LegalSection>

      <LegalSection title="Emails and reminders">
        <p>
          A notification that can&apos;t be delivered is retried up to six times over about a quarter of an hour, then shown to admins,
          who can send it again. Overdue reminders go out once a day; a reminder is never sent twice for the same loan on the same day.
        </p>
      </LegalSection>

      <LegalSection title="How changes are made">
        <p>
          Every change passes automated checks (code style, types, unit tests and a full build) before it reaches the live site, and the
          borrowing flow is tested in a real browser on demand.
        </p>
      </LegalSection>

      <LegalSection title="What this doesn't cover">
        <ul>
          <li>The public demo: it has no service levels and starts over every night.</li>
          <li>Outages at our providers that we can&apos;t prevent. We still count them, and tell you about them.</li>
        </ul>
        <p>A version sold to organisations would add service credits, a public status page and round-the-clock support for critical issues.</p>
      </LegalSection>
    </article>
  );
}
