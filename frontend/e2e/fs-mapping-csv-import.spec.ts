import { test, expect } from "@playwright/test"
import path from "path"
import fs from "fs"
import os from "os"

const BASE_URL = "http://localhost:3000"
const TEST_EMAIL = "playwright@modelisys.com"
const TEST_PASSWORD = "PlaywrightTest123"
const COMPANY_ID = "a17cc179-df90-4f56-a5f9-21ccd232f9f5"

test.describe("Financial Statement Mapping CSV Import", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*(?!login).*/)
  })

  test("should show import CSV button on FS mapping page", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings/companies/${COMPANY_ID}/financial-statements-mapping`)
    await page.waitForLoadState("networkidle")
    await expect(page.getByText("Importer CSV")).toBeVisible()
  })

  test("should import CSV and show success message", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings/companies/${COMPANY_ID}/financial-statements-mapping`)
    await page.waitForLoadState("networkidle")

    // Create a test CSV file
    const csvContent = [
      ",,,,",
      ",,,,",
      ",Nom de compte,Catégories,Types,Classement",
      ",Test Encaisse E2E,Actif,Court terme,1",
      ",Test Revenus E2E,Revenus,n/a,1",
    ].join("\n")

    const tmpDir = os.tmpdir()
    const csvPath = path.join(tmpDir, "test-fs-mapping.csv")
    fs.writeFileSync(csvPath, csvContent, "utf-8")

    // Upload the file
    const fileInput = page.locator('input[type="file"][accept=".csv"]')
    await fileInput.setInputFiles(csvPath)

    // Wait for success message
    await expect(page.getByText(/rows imported/i)).toBeVisible({ timeout: 10000 })

    // Cleanup
    fs.unlinkSync(csvPath)
  })
})
