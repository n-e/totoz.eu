import { test, expect } from "@playwright/test";
import { randomBytes } from "crypto";
import { setTimeout } from "timers/promises";

let user_name = `user_${randomBytes(4).toString("hex")}`;
const password = `pw_${user_name}`;

test("shows the home page", async ({ page }) => {
  await page.goto("http://localhost:3000/");

  await expect(page.locator("#query")).toBeVisible();
});

test("creates an account", async ({ page }) => {
  await page.goto("http://localhost:3000/");

  await page.locator("text=Create an Account").click();
  await expect(page).toHaveURL("http://localhost:3000/new_account");

  await page.locator('input[name="username"]').click();
  await page.locator('input[name="username"]').fill(user_name);

  await page.locator('input[name="email"]').click();
  await page.locator('input[name="email"]').fill("n1@ztel.fr");

  await page.locator('input[name="password"]').first().click();
  await page.locator('input[name="password"]').first().fill(password);

  await page.locator('input[name="password"]').nth(1).click();
  await page.locator('input[name="password"]').nth(1).fill(password);

  await page.locator("text=Create Account").click();
  await expect(page).toHaveURL("http://localhost:3000/user/" + user_name);
});

test("creates a totoz", async ({ page }) => {
  await page.goto("http://localhost:3000");

  await page.locator("text=Log in").click();
  await page.locator('input[name="username"]').click();
  await page.locator('input[name="username"]').fill(user_name);
  await page.locator('input[name="password"]').click();
  await page.locator('input[name="password"]').fill(password);
  await page.locator("text=Log in").nth(1).click();

  const totoz_name = `totoz_${randomBytes(4).toString("hex")}`;

  // Il y a une race condition ici, mais je n'ai pas trouvé la cause.
  // Il semblerait que le login n'ait pas été bien pris en compte au
  // moment où le redirect a lieu
  await setTimeout(500);
  await page.reload();

  await page.locator("text=Create a Totoz").first().click();
  await expect(page).toHaveURL("http://localhost:3000/create_totoz");

  await page.locator('input[name="name"]').click();
  await page.locator('input[name="name"]').fill(totoz_name);

  await page.locator('input[name="image"]').click();
  await page.locator('input[name="image"]').setInputFiles("./static/uxam.gif");

  await page.locator('input[name="tags"]').click();
  await page.locator('input[name="tags"]').fill("tttag");

  await page.locator("text=Create it!").click();
  await expect(page).toHaveURL("http://localhost:3000/totoz/" + totoz_name);

  await page.locator("img").nth(2).click();
  await expect(page).toHaveURL("http://localhost:3000/");

  await expect(page.getByText(`[:${totoz_name}]`)).toBeVisible();
});
