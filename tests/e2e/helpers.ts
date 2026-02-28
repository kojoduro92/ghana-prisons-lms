import { expect, type Page } from "@playwright/test";

export async function loginThroughVerification(
  page: Page,
  options: {
    username: string;
    password: string;
    expectedHomePath: RegExp;
  },
): Promise<void> {
  await page.goto("/admin-login");
  await page.getByLabel("Username").fill(options.username);
  await page.getByLabel("Password").fill(options.password);
  await page.getByTestId("admin-login-submit").click();

  await expect(page).toHaveURL(/\/verify-identity/);
  const verifyButton = page.getByTestId("verify-identity-btn");
  const continueButton = page.getByRole("button", { name: "Continue to Portal" });

  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (await verifyButton.count() === 0) {
      break;
    }
    await verifyButton.click();
    if ((await continueButton.count()) > 0 && (await continueButton.isEnabled())) {
      break;
    }
  }

  if ((await continueButton.count()) === 0) {
    await expect(page).toHaveURL(options.expectedHomePath);
    return;
  }

  await expect(continueButton).toBeEnabled();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if ((await continueButton.count()) === 0) {
      await expect(page).toHaveURL(options.expectedHomePath);
      return;
    }
    await continueButton.click();

    try {
      await expect(page).toHaveURL(options.expectedHomePath, { timeout: 4_000 });
      return;
    } catch {
      if (attempt < 2 && (await verifyButton.count()) > 0) {
        await verifyButton.click();
        await expect(continueButton).toBeEnabled();
      }
    }
  }

  await expect(page).toHaveURL(options.expectedHomePath);
}
