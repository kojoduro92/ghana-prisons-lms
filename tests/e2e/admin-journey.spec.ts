import { expect, test } from "@playwright/test";
import { loginThroughVerification } from "./helpers";

test("admin end-to-end journey", async ({ page }) => {
  await loginThroughVerification(page, {
    username: "admin",
    password: "Prison1234",
    expectedHomePath: /\/admin\/dashboard/,
  });

  await page.getByLabel("Portal sections").getByRole("link", { name: "Register" }).click();
  await expect(page).toHaveURL(/\/admin\/register-inmate/);

  await page.getByLabel("Full Name").fill("Journey Test Inmate");
  await page.getByLabel("Date of Birth").fill("1993-08-15");
  await page.getByLabel("Prison ID").fill("GTE-44556");
  await page.getByLabel("Educational Background").fill("Senior High");
  await page.getByLabel("Skill Interests (comma separated)").fill("IT, Carpentry");
  await page.getByLabel("Block or Unit Assignment").fill("Block J");
  await page.getByRole("button", { name: "Register Inmate" }).click();

  await expect(page.getByText("Journey Test Inmate")).toBeVisible();
  await page.getByRole("link", { name: "Open Registered Profile" }).click();
  await expect(page).toHaveURL(/\/admin\/inmates\/GP-\d+/);

  await page.goto("/admin/dashboard");
  await page.getByTestId("admin-search").fill("GP-10215");
  await page.getByRole("link", { name: "View Profile" }).first().click();
  await expect(page).toHaveURL(/\/admin\/inmates\/GP-10215/);

  await page.getByRole("button", { name: "Issue Certificate" }).click();
  await expect(page.getByText("Certificate issued for Entrepreneurship Essentials.")).toBeVisible();

  await page.getByLabel("Portal sections").getByRole("link", { name: "Security" }).click();
  await expect(page).toHaveURL(/\/admin\/security/);
  await page.locator("select").nth(1).selectOption("certificate-issued");
  await expect(page.getByRole("cell", { name: "certificate-issued" }).first()).toBeVisible();

  await page.getByLabel("Portal sections").getByRole("link", { name: "Reports" }).click();
  await expect(page).toHaveURL(/\/admin\/reports/);
  await expect(page.getByTestId("report-student-scope")).toHaveValue("GP-10215");
  await page.getByRole("combobox").first().selectOption("performance");
  await page.getByRole("button", { name: "Generate Report" }).click();
  await expect(page.getByRole("cell", { name: "GP-10215" }).first()).toBeVisible();
});
