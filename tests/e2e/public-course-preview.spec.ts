import { expect, test } from "@playwright/test";

test("public landing opens course preview with breakdown", async ({ page }) => {
  await page.goto("/landing");
  await expect(page.getByRole("heading", { name: "Course Categories" })).toBeVisible();

  await page.getByRole("button", { name: /Languages/i }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Languages" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Enroll" }).first()).toBeVisible();

  await page.getByRole("link", { name: "View Details" }).first().click();
  await expect(page).toHaveURL(/\/landing\/courses\/C-\d+/);
  await expect(page.getByRole("heading", { name: "Course Overview" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Course Breakdown" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Enroll" })).toBeVisible();
});
