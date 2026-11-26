import type { Metadata } from "next";
import Link from "next/link";
import { LegalSection, LegalTable, LegalTitle } from "@/components/legal";

export const metadata: Metadata = { title: "Privacy notice – LendLoop" };

export default function PrivacyPage() {
  return (
    <article>
      <LegalTitle title="Privacy notice" intro="What LendLoop holds about you, why, who helps us run it, for how long, and your rights." />

      <LegalSection title="Who we are">
        <p>
          LendLoop runs a neighbourhood lending board: neighbours list things they&apos;re happy to lend and ask to borrow each other&apos;s
          for a few days. LendLoop is the controller of the personal data described here. Write to us at privacy@lendloop.example.
        </p>
      </LegalSection>

      <LegalSection title="What we hold">
        <LegalTable
          head={["Data", "Where it comes from"]}
          rows={[
            ["Your first name and email address", "Your sign-in (Clerk). Other neighbours only ever see your first name."],
            ["The things you list: name, category, condition, your note", "You"],
            ["Loans: which item, the dates, what happened and when", "You and the other neighbour"],
            ["Records of the emails and reminders sent about a loan", "Our automation (ids, status and times, no message text)"],
            ["An audit log of changes (who did what to which record)", "The app, as you use it (ids and action names only)"],
            ["Technical logs: IP addresses, request times", "Our providers, while they run the service"],
          ]}
        />
      </LegalSection>

      <LegalSection title="Why we use it, and on what basis">
        <LegalTable
          head={["Purpose", "Lawful basis (GDPR, Article 6)"]}
          rows={[
            ["Run your account, your listings and your loans, and send the emails a loan needs", "Contract: it's the service you signed up for"],
            ["Keep the service safe: rate limits, the audit log, admins removing listings", "Legitimate interests: security and abuse prevention"],
            ["Keep past loans for the other neighbour after you leave", "Legitimate interests: their record of what they lent or borrowed"],
          ]}
        />
        <p>We don&apos;t use your data for marketing, profiling or advertising, and we never sell it.</p>
      </LegalSection>

      <LegalSection title="Who processes it for us">
        <ul>
          <li>Clerk: sign-in and your account.</li>
          <li>Convex: the database and the server functions.</li>
          <li>Vercel: hosting the website.</li>
          <li>n8n, run by us, and our email provider: the notification and reminder emails.</li>
        </ul>
        <p>
          Each works only on our instructions, under a data processing agreement. Some are based in the United States; transfers rely on
          the EU-US Data Privacy Framework or the European Commission&apos;s standard contractual clauses.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <LegalTable
          head={["Data", "Kept"]}
          rows={[
            ["Your account, listings and loans", "While your account exists"],
            ["After you delete your account", "Your listings are removed. Past loans stay for the other neighbour, showing \"A former neighbour\" instead of your name."],
            ["The audit log", "12 months, then deleted automatically"],
            ["Email and reminder records (ids only)", "As long as the loan they belong to"],
            ["Providers' technical logs", "As set by each provider, typically 30 days or less"],
          ]}
        />
      </LegalSection>

      <LegalSection title="Your rights">
        <ul>
          <li>
            See your data and take it with you: <Link href="/account">Your data</Link>, then Download my data (one JSON file).
          </li>
          <li>Correct your name: change it in your account menu; LendLoop picks it up the next time you sign in.</li>
          <li>
            Delete your account: <Link href="/account">Your data</Link>, then Delete my account.
          </li>
          <li>Restrict or object to how we use your data, or ask anything else: write to privacy@lendloop.example.</li>
          <li>Complain to a data protection authority, for example the CNPD in Luxembourg, or the one where you live.</li>
        </ul>
        <p>We answer within one month.</p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          LendLoop uses only the cookies Clerk needs to keep you signed in. There are no analytics or advertising cookies, so there&apos;s
          nothing to consent to and no cookie banner.
        </p>
      </LegalSection>

      <LegalSection title="The public demo">
        <p>
          The demo is limited to two test accounts and new sign-ups are closed, so it never holds real people&apos;s personal data. It
          starts over every night.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>LendLoop isn&apos;t for anyone under 16.</p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>If this notice changes, we update the date at the top, and tell you by email when the change matters.</p>
      </LegalSection>
    </article>
  );
}
