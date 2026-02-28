import { expect, test } from "@playwright/test";
import { loginThroughVerification } from "./helpers";

test("admin smoke flow", async ({ page }) => {
  await loginThroughVerification(page, {
    username: "admin",
    password: "Prison1234",
    expectedHomePath: /\/admin\/dashboard/,
  });

  await page.goto("/admin/attendance");
  await expect(page).toHaveURL(/\/admin\/attendance/);
  await expect(page.getByRole("heading", { name: "Facility Entry / Exit Events" })).toBeVisible();

  await page.goto("/admin/dashboard");
  await page.getByLabel("Portal sections").getByRole("link", { name: "Courses" }).click();
  await expect(page).toHaveURL(/\/admin\/courses/);
  await expect(page.getByRole("heading", { name: "Create Course" })).toBeVisible();

  await page.goto("/admin/dashboard");
  await page.getByLabel("Portal sections").getByRole("link", { name: "Security" }).click();
  await expect(page).toHaveURL(/\/admin\/security/);
  await expect(page.getByRole("heading", { name: "Security Event Log" })).toBeVisible();

  await page.goto("/admin/dashboard");
  await page.getByLabel("Portal sections").getByRole("link", { name: "Reports" }).click();
  await expect(page).toHaveURL(/\/admin\/reports/);
  await expect(page.getByRole("heading", { name: "Generate / Export Reports" })).toBeVisible();

  await page.goto("/admin/dashboard");
  await page.getByTestId("open-register-page").click();

  await expect(page).toHaveURL(/\/admin\/register-inmate/);
  await expect(page.getByTestId("register-form")).toBeVisible();

  await page.goto("/admin/dashboard");
  await page.getByRole("link", { name: "View Profile" }).first().click();
  await expect(page).toHaveURL(/\/admin\/inmates\//);
});
