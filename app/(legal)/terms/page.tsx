import type { Metadata } from "next";
import Link from "next/link";
import { LegalSection, LegalTitle } from "@/components/legal";

export const metadata: Metadata = { title: "Terms of service – LendLoop" };

export default function TermsPage() {
  return (
    <article>
      <LegalTitle title="Terms of service" intro="The rules for using LendLoop, for lenders and borrowers alike." />

      <LegalSection title="What LendLoop is">
        <p>
          LendLoop is a board that puts neighbours in touch so they can lend each other things. We aren&apos;t a party to any loan: the
          lender and the borrower agree it between themselves. LendLoop is free; there are no fees.
        </p>
      </LegalSection>

      <LegalSection title="Who can use it">
        <ul>
          <li>You&apos;re 16 or older.</li>
          <li>One account per person, under your own first name.</li>
          <li>You keep your sign-in to yourself.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Lending and borrowing">
        <ul>
          <li>Lenders describe things honestly and lend only what&apos;s safe to use and theirs to lend.</li>
          <li>Borrowers bring things back by the agreed day, in the condition they got them, and say straight away if something breaks.</li>
          <li>If something is damaged or lost, the lender and borrower sort it out together. LendLoop can&apos;t judge or pay for it.</li>
        </ul>
      </LegalSection>

      <LegalSection title="What's not allowed">
        <ul>
          <li>Listing anything illegal, dangerous or not yours, such as weapons, medicines or stolen goods.</li>
          <li>Spam, harassment, or pretending to be someone else.</li>
          <li>Trying to get round the security, the limits or other people&apos;s accounts.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Fair-use limits">
        <p>
          To keep LendLoop usable for everyone, each person can send up to 10 borrow requests an hour and list up to 20 things a day.
        </p>
      </LegalSection>

      <LegalSection title="Admins">
        <p>
          Admins can remove listings that break these terms and see all loans to sort out problems. The Trusted Lender mark means an admin
          has vouched for someone; it isn&apos;t a guarantee.
        </p>
      </LegalSection>

      <LegalSection title="Liability">
        <p>
          LendLoop is provided as it is. As far as the law allows, we aren&apos;t responsible for the things people lend, their
          condition, or what happens between neighbours. Nothing here limits rights you have as a consumer.
        </p>
      </LegalSection>

      <LegalSection title="Ending your account">
        <p>
          You can delete your account at any time from <Link href="/account">Your data</Link>, once your open loans are closed. We may
          suspend an account that breaks these terms, and we&apos;ll tell you why.
        </p>
      </LegalSection>

      <LegalSection title="Changes and governing law">
        <p>
          If these terms change, we update the date at the top and tell you by email when the change matters. They&apos;re governed by
          Luxembourg law. Questions: support@lendloop.example.
        </p>
      </LegalSection>
    </article>
  );
}
