import { expect, test } from "@playwright/test";
import { loginThroughVerification } from "./helpers";

test("management analytics journey", async ({ page }) => {
  await loginThroughVerification(page, {
    username: "manager",
    password: "Prison1234",
    expectedHomePath: /\/management\/dashboard/,
  });

  await expect(page.getByRole("heading", { name: "Predictive AI Insights" })).toBeVisible();

  await page.getByPlaceholder("Search student, facility, method").fill("mgr-001");
  await expect(page.getByRole("cell", { name: "mgr-001" }).first()).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("management-export-csv").click();
  const download = await downloadPromise;
  await expect(download.suggestedFilename()).toBe("management-analytics.csv");
  await expect(page.getByText("Management analytics CSV exported.")).toBeVisible();
});
