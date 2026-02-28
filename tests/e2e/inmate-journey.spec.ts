import { expect, test } from "@playwright/test";
import { loginThroughVerification } from "./helpers";

test("inmate end-to-end journey", async ({ page }) => {
  await loginThroughVerification(page, {
    username: "GP-10234",
    password: "Prison1234",
    expectedHomePath: /\/inmate\/dashboard/,
  });

  await expect(page.getByRole("heading", { name: "Attendance Operations" })).toBeVisible();

  await page.getByRole("button", { name: "Clock In" }).click();
  await page.getByRole("button", { name: "Clock Out" }).click();
  await expect(page.getByText("EXIT via").first()).toBeVisible();
  await expect(page.getByText("ENTRY via").first()).toBeVisible();

  await expect(page.getByLabel("Portal sections").getByRole("link", { name: "Courses" })).toBeVisible();
  await page.goto("/inmate/courses");
  await expect(page).toHaveURL(/\/inmate\/courses/);
  await expect(page.getByRole("heading", { name: "Browse and Enroll in Courses" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enrolled" }).first()).toBeVisible();

  await expect(page.getByLabel("Portal sections").getByRole("link", { name: "Certificates" })).toBeVisible();
  await page.goto("/inmate/certificates");
  await expect(page).toHaveURL(/\/inmate\/certificates/);
  await expect(page.getByRole("cell", { name: "CERT-001" })).toBeVisible();
});
