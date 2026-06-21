import { test, expect, Page } from "@playwright/test"

// Verifies appearance-order annex numbering: identifiers follow the order annexes
// appear in the report (structure order), NOT the order their checkboxes were
// ticked. Letters for the income statement, numbers for the balance sheet. The
// "Lettre" field is read-only (assigned automatically). Stale/out-of-order
// identifiers are normalized on load. All backend calls are mocked.

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"
type StructRow = Record<string, unknown>

async function setupAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "fake-access-token")
    localStorage.setItem("refresh_token", "fake-refresh-token")
  })
  await page.context().addCookies([
    { name: "has_session", value: "1", url: "http://localhost:3000" },
  ])
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "u1",
          email: "u@e.com",
          full_name: "Test",
          is_active: true,
          created_at: "2026-01-01T00:00:00Z",
        },
        organizations: [{ id: "o1", name: "Org", slug: "org", role: "admin" }],
      }),
    }),
  )
  await page.route("**/api/organizations", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: "o1", name: "Org", slug: "org", role: "admin" },
      ]),
    }),
  )
  await page.route(/\/api\/companies(\?.*)?$/, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companies: [{ id: COMPANY_ID, name: "Test Co", divisions: [] }],
        }),
      })
    }
    return route.continue()
  })
  await page.route(`**/api/companies/${COMPANY_ID}/budgets**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ budgets: [] }),
    }),
  )
}

/**
 * Mock everything the statement page needs and open its Sommaire structure
 * editor. `statement` is "income-statement" or "balance-sheet"; `labels` are the
 * two structure-row labels (also used as series row labels so the card renders).
 */
async function openSommaireEditor(
  page: Page,
  statement: "income-statement" | "balance-sheet",
  structure: StructRow[],
  labels: [string, string],
) {
  await setupAuth(page)

  await page.route(
    `**/api/companies/${COMPANY_ID}/statement-chart-configs**`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ slots: [] }),
      }),
  )
  await page.route("**/api/companies/*/statement-structures/*", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ structure }),
      })
    }
    return route.continue()
  })
  // Base single-period rows.
  await page.route(
    `**/api/companies/${COMPANY_ID}/financial-statements/${statement}*`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          rows: [
            { label: labels[0], current: 1000, prior: 900 },
            { label: labels[1], current: 400, prior: 350 },
          ],
        }),
      }),
  )
  // Multi-period series (default view is "12months") — added last so it wins
  // over the base glob for the /series URL.
  await page.route(
    `**/api/companies/${COMPANY_ID}/financial-statements/${statement}/series*`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: statement,
          fiscalYear: 2026,
          periods: [{ fiscalYear: 2026, fiscalMonth: 5, label: "Mai 2026" }],
          rows: [
            { id: "s1", label: labels[0], amounts: { "2026-5": 1000 }, detailRows: [] },
            { id: "s2", label: labels[1], amounts: { "2026-5": 400 }, detailRows: [] },
          ],
        }),
      }),
  )

  await page.goto(`/financial-statements/${statement}?companyId=${COMPANY_ID}`)
  await page.getByRole("button", { name: /^Sommaire$/ }).click({ timeout: 15000 })
  await page.getByRole("button", { name: /^Paramètres$/ }).click({ timeout: 15000 })
}

/** Toggle a Radix checkbox once. A real/synthetic pointer click double-fires
 * here because the checkbox is wrapped in a <label> (the browser forwards the
 * click to the control as well). Dispatching a click event directly to the
 * element fires React's onClick exactly once, with no label forwarding. */
async function toggleAnnex(checkbox: import("@playwright/test").Locator) {
  await checkbox.dispatchEvent("click")
}

test("income statement: identifiers follow report order, not check order", async ({
  page,
}) => {
  // Row 0 is un-annexed; row 1 carries a stale high letter "Z". On load the
  // renumber normalizes by appearance: the only annex (row 1) becomes "A".
  const structure: StructRow[] = [
    {
      label: "Revenus",
      linkCode: "4000",
      liaisonMode: "single",
      defineMapping: true,
      showInDetail: false,
    },
    {
      label: "Autres revenus",
      linkCode: "4100",
      liaisonMode: "single",
      defineMapping: true,
      showInDetail: true,
      annexLetter: "Z",
    },
  ]
  await openSommaireEditor(page, "income-statement", structure, [
    "Revenus",
    "Autres revenus",
  ])

  const checkboxes = page.getByRole("checkbox", {
    name: "Annexe : afficher au détail",
  })
  const annexInputs = page.getByPlaceholder("A")
  await expect(checkboxes).toHaveCount(2, { timeout: 15000 })

  // Stale "Z" normalized to "A" on load; row 0 has no annex yet.
  await expect(annexInputs.nth(0)).toHaveValue("")
  await expect(annexInputs.nth(1)).toHaveValue("A")
  // The "Lettre" field is read-only (assigned automatically).
  await expect(annexInputs.nth(0)).toBeDisabled()
  await expect(annexInputs.nth(1)).toBeDisabled()

  // Enable the annex on row 0, which appears FIRST. It must become "A", bumping
  // the previously-lettered row 1 to "B" — numbering follows position.
  await toggleAnnex(checkboxes.nth(0))
  await expect(annexInputs.nth(0)).toHaveValue("A", { timeout: 10000 })
  await expect(annexInputs.nth(1)).toHaveValue("B", { timeout: 10000 })
})

test("balance sheet: numbers follow report order, not check order", async ({
  page,
}) => {
  const structure: StructRow[] = [
    {
      label: "Encaisse",
      linkCode: "1000",
      liaisonMode: "single",
      defineMapping: true,
      showInDetail: false,
    },
    {
      label: "Clients",
      linkCode: "1100",
      liaisonMode: "single",
      defineMapping: true,
      showInDetail: true,
      annexLetter: "5",
    },
  ]
  await openSommaireEditor(page, "balance-sheet", structure, [
    "Encaisse",
    "Clients",
  ])

  const checkboxes = page.getByRole("checkbox", {
    name: "Annexe : afficher au détail",
  })
  const annexInputs = page.getByPlaceholder("A")
  await expect(checkboxes).toHaveCount(2, { timeout: 15000 })

  // Stale "5" normalized to "1" on load; row 0 un-annexed.
  await expect(annexInputs.nth(0)).toHaveValue("")
  await expect(annexInputs.nth(1)).toHaveValue("1")
  await expect(annexInputs.nth(1)).toBeDisabled()

  await toggleAnnex(checkboxes.nth(0))
  await expect(annexInputs.nth(0)).toHaveValue("1", { timeout: 10000 })
  await expect(annexInputs.nth(1)).toHaveValue("2", { timeout: 10000 })
})

test("disabling an annex closes the gap (renumber on uncheck)", async ({
  page,
}) => {
  // Three annexes A, B, C (by appearance). Disabling the middle one (B) must
  // renumber the trailing one so identifiers stay gap-free: A, B.
  const structure: StructRow[] = [
    {
      label: "Revenus",
      linkCode: "4000",
      liaisonMode: "single",
      defineMapping: true,
      showInDetail: true,
      annexLetter: "A",
    },
    {
      label: "Autres revenus",
      linkCode: "4100",
      liaisonMode: "single",
      defineMapping: true,
      showInDetail: true,
      annexLetter: "B",
    },
    {
      label: "Produits financiers",
      linkCode: "4200",
      liaisonMode: "single",
      defineMapping: true,
      showInDetail: true,
      annexLetter: "C",
    },
  ]
  await setupAuth(page)
  await page.route(
    `**/api/companies/${COMPANY_ID}/statement-chart-configs**`,
    (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ slots: [] }) }),
  )
  await page.route("**/api/companies/*/statement-structures/*", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ structure }),
      })
    }
    return route.continue()
  })
  await page.route(
    `**/api/companies/${COMPANY_ID}/financial-statements/income-statement*`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          rows: [
            { label: "Revenus", current: 1000, prior: 900 },
            { label: "Autres revenus", current: 400, prior: 350 },
            { label: "Produits financiers", current: 200, prior: 150 },
          ],
        }),
      }),
  )
  await page.route(
    `**/api/companies/${COMPANY_ID}/financial-statements/income-statement/series*`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: "income-statement",
          fiscalYear: 2026,
          periods: [{ fiscalYear: 2026, fiscalMonth: 5, label: "Mai 2026" }],
          rows: [
            { id: "s1", label: "Revenus", amounts: { "2026-5": 1000 }, detailRows: [] },
            { id: "s2", label: "Autres revenus", amounts: { "2026-5": 400 }, detailRows: [] },
            { id: "s3", label: "Produits financiers", amounts: { "2026-5": 200 }, detailRows: [] },
          ],
        }),
      }),
  )
  await page.goto(`/financial-statements/income-statement?companyId=${COMPANY_ID}`)
  await page.getByRole("button", { name: /^Sommaire$/ }).click({ timeout: 15000 })
  await page.getByRole("button", { name: /^Paramètres$/ }).click({ timeout: 15000 })

  const checkboxes = page.getByRole("checkbox", {
    name: "Annexe : afficher au détail",
  })
  const annexInputs = page.getByPlaceholder("A")
  await expect(checkboxes).toHaveCount(3, { timeout: 15000 })
  await expect(annexInputs.nth(0)).toHaveValue("A")
  await expect(annexInputs.nth(1)).toHaveValue("B")
  await expect(annexInputs.nth(2)).toHaveValue("C")

  // Uncheck the middle annex (B). Remaining annexes renumber A, B (no gap, no "C").
  await toggleAnnex(checkboxes.nth(1))
  await expect(annexInputs.nth(0)).toHaveValue("A", { timeout: 10000 })
  await expect(annexInputs.nth(1)).toHaveValue("", { timeout: 10000 })
  await expect(annexInputs.nth(2)).toHaveValue("B", { timeout: 10000 })
})
