import { expect, test } from "@playwright/test";
import { loginThroughVerification } from "./helpers";

test("route guard redirects anonymous users to login with next path", async ({ page }) => {
  await page.goto("/admin/dashboard");
  await expect(page).toHaveURL(/\/admin-login\?next=%2Fadmin%2Fdashboard/);
});

test("route guard blocks cross-role access with recovery message", async ({ page }) => {
  await loginThroughVerification(page, {
    username: "GP-10234",
    password: "Prison1234",
    expectedHomePath: /\/inmate\/dashboard/,
  });

  await page.goto("/admin/dashboard");
  await expect(page).toHaveURL(/\/admin-login\?next=%2Fadmin%2Fdashboard&reason=role/);
  await expect(
    page.getByText("Requested page needs a different role. Sign in with the correct account to continue."),
  ).toBeVisible();
});
