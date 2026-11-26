import type { Browser, Page } from "@playwright/test";

export const LENA = "lena+clerk_test@example.com";
export const SAM = "sam+clerk_test@example.com";

/**
 * Signs in through Clerk's modal as one of Clerk's test users: "+clerk_test" addresses get the
 * fixed code 424242 instead of a real email, so no inbox is needed.
 */
export async function signedIn(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: /^sign in/i }).first().click();
  await page.locator('input[name="identifier"]').fill(email);
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByText(/check your email/i).waitFor();
  await page.waitForTimeout(500);
  await page.keyboard.type("424242");
  await page.waitForURL(/\/tools/);
  return page;
}

/** A day button on the calendar, `offset` days from today (the browser runs in UTC, en-GB). */
export const day = (page: Page, offset: number) =>
  page.locator(
    `button[data-day="${new Date(Date.now() + offset * 86_400_000).toLocaleDateString("en-GB", { timeZone: "UTC" })}"]`,
  );

export async function openItem(page: Page, name: string) {
  await page.goto("/tools");
  await page.getByRole("link", { name: new RegExp(name) }).first().click();
  await page.getByRole("heading", { name }).waitFor();
}

/** A toast with this text (sonner). */
export const toast = (page: Page, text: string) => page.locator("[data-sonner-toast]").filter({ hasText: text }).first();
