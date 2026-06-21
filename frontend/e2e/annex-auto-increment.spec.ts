import { test, expect, Page } from "@playwright/test"

// Verifies that checking the "Annexe" box on a structure row auto-assigns the
// next annex identifier (next-after-highest): letters for the income statement,
// numbers for the balance sheet. All backend calls are mocked; the structure
// editor card is rendered by feeding it series + base rows (as in the
// link-code spec).

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

test("income statement: checking Annexe auto-assigns the next letter", async ({
  page,
}) => {
  // Highest existing annex is "C" → checking an un-annexed row yields "D".
  const structure: StructRow[] = [
    {
      label: "Revenus",
      linkCode: "4000",
      liaisonMode: "single",
      defineMapping: true,
      showInDetail: true,
      annexLetter: "C",
    },
    {
      label: "Autres revenus",
      linkCode: "4100",
      liaisonMode: "single",
      defineMapping: true,
      // Explicitly off so the Annexe checkbox starts unchecked (mappable rows
      // default to shown-in-detail otherwise).
      showInDetail: false,
    },
  ]
  await openSommaireEditor(page, "income-statement", structure, [
    "Revenus",
    "Autres revenus",
  ])

  // Two mappable rows → two Annexe checkboxes / annex inputs, in structure order.
  const checkboxes = page.getByRole("checkbox", {
    name: "Annexe : afficher au détail",
  })
  const annexInputs = page.getByPlaceholder("A")
  await expect(checkboxes).toHaveCount(2, { timeout: 15000 })
  // Row 0 already carries the highest annex "C"; row 1 is un-annexed.
  await expect(annexInputs.nth(0)).toHaveValue("C")
  await expect(annexInputs.nth(1)).toHaveValue("")

  await toggleAnnex(checkboxes.nth(1))
  await expect(annexInputs.nth(1)).toHaveValue("D", { timeout: 10000 })
})

test("balance sheet: checking Annexe renumbers all annexes in structure order", async ({
  page,
}) => {
  // Highest saved annex is "3" on row 0; checking row 1 renumbers 3→1 and assigns 2.
  const structure: StructRow[] = [
    {
      label: "Encaisse",
      linkCode: "1000",
      liaisonMode: "single",
      defineMapping: true,
      showInDetail: true,
      annexLetter: "3",
    },
    {
      label: "Clients",
      linkCode: "1100",
      liaisonMode: "single",
      defineMapping: true,
      // Explicitly off so the Annexe checkbox starts unchecked.
      showInDetail: false,
    },
  ]
  await openSommaireEditor(page, "balance-sheet", structure, [
    "Encaisse",
    "Clients",
  ])

  const checkboxes = page.getByRole("checkbox", {
    name: "Annexe : afficher au détail",
  })
  const annexInputs = page.getByPlaceholder("1")
  await expect(checkboxes).toHaveCount(2, { timeout: 15000 })
  // On load, existing annexes are normalized to 1…n in structure order.
  await expect(annexInputs.nth(0)).toHaveValue("1")
  await expect(annexInputs.nth(1)).toHaveValue("")

  await toggleAnnex(checkboxes.nth(1))
  await expect(annexInputs.nth(0)).toHaveValue("1", { timeout: 10000 })
  await expect(annexInputs.nth(1)).toHaveValue("2", { timeout: 10000 })
})
