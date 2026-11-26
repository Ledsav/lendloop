import { expect, test } from "@playwright/test";
import { LENA, SAM, day, openItem, signedIn, toast } from "./helpers";

// Run against the sample data (npx convex run devtools:seed). Each test makes its own request, so
// the suite can run again on the same data.

test("the public page lists what's free with names and categories, never owners", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Borrow what you need/ })).toBeVisible();
  const available = page.locator("section", { has: page.getByRole("heading", { name: "Available now" }) });
  await expect(available.getByRole("listitem").first()).toBeVisible();
  const text = await available.innerText();
  for (const owner of ["Lena", "Marco", "Priya", "Aisha"]) expect(text).not.toContain(owner);
  await expect(page.getByRole("button", { name: "Sign in to lend or borrow" })).toBeVisible();
});

test("a neighbour requests dates, the lender approves, then marks them returned", async ({ browser }) => {
  const sam = await signedIn(browser, SAM);
  await openItem(sam, "Folding chairs, set of six");
  await day(sam, 0).first().click();
  await day(sam, 1).first().click();
  await expect(sam.getByText(/, 2 days$/)).toBeVisible();
  await sam.getByRole("button", { name: "Request dates" }).click();
  await expect(toast(sam, "Dates requested. Lena gets an email.")).toBeVisible();
  await expect(sam.getByText(/^You asked for/)).toBeVisible();

  const lena = await signedIn(browser, LENA);
  await lena.goto("/incoming");
  const chairs = lena.locator("li").filter({ hasText: "Folding chairs" });
  await chairs.filter({ hasText: "New request" }).getByRole("button", { name: "Approve" }).click();
  await expect(toast(lena, "Approved. Sam gets an email.")).toBeVisible();
  await chairs.filter({ hasText: "Day 1 of 2" }).getByRole("button", { name: "Mark returned" }).click();
  await lena.getByRole("alertdialog").getByRole("button", { name: "Mark returned" }).click();
  await expect(toast(lena, "Marked returned. Sam gets an email.")).toBeVisible();

  // Sam's history tells the story, worded from his side.
  await sam.goto("/requests");
  const past = sam.locator("li").filter({ hasText: "Folding chairs" }).filter({ hasText: "Returned" }).first();
  await past.getByRole("button", { name: "Show history" }).click();
  await expect(past).toContainText("You asked for");
  await expect(past).toContainText("Lena said yes");
  await expect(past).toContainText("Lena marked it returned");
});

test("a range across someone else's booked days explains why it can't be sent", async ({ browser }) => {
  const sam = await signedIn(browser, SAM);
  await openItem(sam, "Camping stove"); // the sample data books it from day +7 to +9
  await day(sam, 5).first().click();
  await day(sam, 10).first().click();
  await expect(sam.getByText("Some of those days are already booked.")).toBeVisible();
  await expect(sam.getByRole("button", { name: "Request dates" })).toBeDisabled();
});

test("a borrower cancels a request and the lender hears about it", async ({ browser }) => {
  const sam = await signedIn(browser, SAM);
  await openItem(sam, "Slow cooker");
  await day(sam, 20).first().click();
  await day(sam, 21).first().click();
  await sam.getByRole("button", { name: "Request dates" }).click();
  await expect(toast(sam, "Dates requested. Aisha gets an email.")).toBeVisible();

  await sam.goto("/requests");
  await sam.locator("li").filter({ hasText: "Slow cooker" }).filter({ hasText: "Waiting" }).getByRole("button", { name: "Cancel request" }).click();
  await sam.getByRole("alertdialog").getByRole("button", { name: "Cancel request" }).click();
  await expect(toast(sam, "Request cancelled. Aisha gets an email.")).toBeVisible();
});
