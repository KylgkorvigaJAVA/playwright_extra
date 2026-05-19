const path = require("path");
const fs = require("fs");

const envPath = path.resolve(__dirname, "../data.env");
const envVars = Object.fromEntries(
  fs.readFileSync(envPath, "utf-8")
    .split("\n")
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("#"))
    .map(line => line.split("=").map(s => s.trim()))
);

const BASE_URL = envVars.BASE_URL;
const USERNAME = envVars.USERNAME;
const PASSWORD = envVars.PASSWORD;

const { test, expect } = require("@playwright/test");

const WRONG_USERNAME = envVars.WRONG_USERNAME;
const WRONG_PASSWORD = envVars.WRONG_PASSWORD;

const STUDENT_NAME = envVars.STUDENT_NAME;

const USERNAME_FIELD = "#Kasutajatunnus_id";
const PASSWORD_FIELD = "#Parool_id";

async function login(page, USERNAME, PASSWORD) {
  await page.goto(BASE_URL);

  await page.locator(USERNAME_FIELD).fill(USERNAME);
  await page.locator(PASSWORD_FIELD).fill(PASSWORD);

  await page.getByRole("button", { name: /Sisene/ }).click();

  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1500);
}

test.describe("Kooli siseveebi testid", () => {
  test("Õpilane logib sisse, avab enda tunniplaani ja teeb pildi", async ({
    page,
  }) => {
    await login(page, USERNAME, PASSWORD);

    await page.getByRole("option", { name: /Õppetöö/ }).click();

    await page.waitForTimeout(200);

    await page.getByRole("listitem").filter({ hasText: "Tunniplaan" }).click();

    await page.waitForTimeout(1000);

    await page.screenshot({
      path: "screenshots/minu-tunniplaan.png",
      fullPage: true,
    });
  });

  test("Õpetaja tunniplaani otsimine ja pildi tegemine", async ({ page }) => {
    await login(page, USERNAME, PASSWORD);
    await page.waitForTimeout(800);

    await page.getByRole("button", { name: /Vana õpilase vaade/ }).click();
    await page.waitForTimeout(800);

    await page.getByRole("link", { name: /Kutseõpe/ }).click();
    await page.waitForTimeout(500);

    await page.locator('a.chosen-single').filter({ hasText: 'Vali õpetaja' }).click();
    await page.waitForTimeout(500);

    await page.keyboard.type(envVars.TEACHER_1);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: "screenshots/opetaja-tunniplaan.png",
      fullPage: true,
    });
  });

  [
    envVars.TEACHER_1,
    envVars.TEACHER_2,
    envVars.TEACHER_3,
  ].forEach((teacherName) => {
    test(`Õpetaja tunniplaani otsimine: ${teacherName}`, async ({ page }) => {
      await login(page, USERNAME, PASSWORD);
      await page.waitForTimeout(1000);

      await page.getByRole("button", { name: /Vana õpilase vaade/ }).click();
      await page.waitForTimeout(1000);

      await page.getByRole("link", { name: /Kutseõpe/ }).click();
      await page.waitForTimeout(1000);

      const dropdown = page.locator("a.chosen-single").filter({ hasText: "Vali õpetaja" });
      await dropdown.click();
      await page.waitForTimeout(500);

      await page.keyboard.type(teacherName);
      await page.keyboard.press("Enter");

      await page.waitForTimeout(1000);

      await page.screenshot({
        path: `screenshots/opetaja-tunniplaan-${teacherName}.png`,
        fullPage: true,
      });
    });
  });

  test("Lehe laadimisaja mõõtmine(performance.now())", async ({ page }) => {
    const startTime = performance.now();

    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);

    const endTime = performance.now();
    const loadTime = endTime - startTime;

    console.log(`Lehe laadimisaeg: ${loadTime.toFixed(2)} ms`);

    expect(loadTime).toBeLessThan(10000);
  });

  test("Vale parooliga sisselogimine kuvab veateate", async ({ page }) => {
    await page.goto(BASE_URL);

    await page.locator("#Kasutajatunnus_id").fill(WRONG_USERNAME);
    await page.locator("#Parool_id").fill(WRONG_PASSWORD);

    await page
      .getByRole("button", { name: new RegExp("Sisene", "i") })
      .click();

    await expect(page.getByRole("status")).toContainText("Sisselogimine ebaõnnestus");
  });
});