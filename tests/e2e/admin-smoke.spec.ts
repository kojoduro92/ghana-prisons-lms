import { expect, test } from "@playwright/test";

test("admin smoke flow", async ({ page }) => {
  await page.goto("/admin-login");

  await page.getByTestId("admin-login-submit").click();

  const verifyButton = page.getByTestId("verify-identity-btn");
  const continueButton = page.getByRole("button", { name: "Continue to Portal" });

  for (let attempt = 0; attempt < 6; attempt += 1) {
    await verifyButton.click();
    if (await continueButton.isEnabled()) {
      break;
    }
  }

  await expect(continueButton).toBeEnabled();
  await continueButton.click();

  await expect(page).toHaveURL(/\/admin\/dashboard/);

  await page.getByRole("link", { name: "Attendance Logs" }).click();
  await expect(page).toHaveURL(/\/admin\/attendance/);
  await expect(page.getByRole("heading", { name: "Facility Entry / Exit Events" })).toBeVisible();

  await page.goto("/admin/dashboard");
  await page.getByTestId("open-register-page").click();

  await expect(page).toHaveURL(/\/admin\/register-inmate/);
  await expect(page.getByTestId("register-form")).toBeVisible();

  await page.goto("/admin/dashboard");
  await page.getByRole("link", { name: "View Profile" }).first().click();
  await expect(page).toHaveURL(/\/admin\/inmates\//);
});
