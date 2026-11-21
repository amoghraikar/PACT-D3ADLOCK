import { test, expect } from "@playwright/test";

test.describe("PACT P05 - Sign-in, Workspaces & Shells", () => {
  test("Styleguide loads cleanly with design system components", async ({ page }) => {
    await page.goto("/styleguide");
    await expect(page.locator("h1")).toContainText("PACT Design System & Styleguide");
    await expect(page.locator("text=UI Kit & Tokens")).toBeVisible();
    await expect(page.locator("text=1. Brand & Mark")).toBeVisible();
    await expect(page.locator("text=3. Buttons")).toBeVisible();
  });

  test("Unauthenticated user navigating to protected workspace is redirected to /login", async ({ page }) => {
    await page.goto("/customer");
    await page.waitForURL("**/login");
    await expect(page.locator("h1")).toContainText("Welcome to PACT");
  });

  test("Asha Rao signs in with dev code and reaches customer workspace", async ({ page }) => {
    await page.goto("/login");

    // Enter Asha's phone number
    await page.locator('input[type="tel"]').fill("9999900001");
    await page.getByRole("button", { name: "Send code" }).click();

    // Verify 6-digit code step appears
    await expect(page.locator("text=Enter 6-digit code")).toBeVisible();

    // Fill 000000
    const otpInputs = page.locator('input[aria-label^="Digit"]');
    for (let i = 0; i < 6; i++) {
      await otpInputs.nth(i).fill("0");
    }

    await page.getByRole("button", { name: "Verify and continue" }).click();

    // Lands on customer start or customer workspace
    await expect(page).toHaveURL(/\/(customer|customer\/start)/);
  });
});
