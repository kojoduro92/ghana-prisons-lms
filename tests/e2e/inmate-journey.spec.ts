import { expect, test } from "@playwright/test";
import { loginThroughVerification } from "./helpers";

test("inmate end-to-end journey", async ({ page }) => {
  await loginThroughVerification(page, {
    username: "GP-10234",
    password: "Prison1234",
    expectedHomePath: /\/inmate\/dashboard/,
  });

  await expect(page.getByRole("heading", { name: "Attendance Operations" })).toBeVisible();
  const clockInButton = page.getByRole("button", { name: "Clock In" });
  const clockOutButton = page.getByRole("button", { name: "Clock Out" });
  if (await clockInButton.isDisabled()) {
    await expect(page.getByText("In Session")).toBeVisible();
  } else {
    await expect(page.getByRole("heading", { name: "No Active Session" })).toBeVisible();
    await clockInButton.click();
    await expect(page.getByText("Clock-in recorded.")).toBeVisible();
  }
  await expect(clockOutButton).toBeVisible();

  await expect(page.getByLabel("Portal sections").getByRole("link", { name: "Courses" })).toBeVisible();
  await page.goto("/inmate/courses");
  await expect(page).toHaveURL(/\/inmate\/courses/);
  await expect(page.getByRole("heading", { name: "Browse and Enroll in Courses" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enrolled" }).first()).toBeVisible();
  await page.getByTestId("open-course-page-C-001").click();
  await expect(page).toHaveURL(/\/inmate\/courses\/C-\d+/);
  await expect(page.getByRole("heading", { name: "Progress Summary" })).toBeVisible();
  await page.getByRole("link", { name: "Back to Courses" }).click();
  await expect(page).toHaveURL(/\/inmate\/courses/);

  await expect(page.getByLabel("Portal sections").getByRole("link", { name: "Certificates" })).toBeVisible();
  await page.goto("/inmate/certificates");
  await expect(page).toHaveURL(/\/inmate\/certificates/);
  await expect(page.getByRole("cell", { name: "CERT-001" })).toBeVisible();
});
