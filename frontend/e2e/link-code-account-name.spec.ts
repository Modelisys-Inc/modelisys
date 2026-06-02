import { test, expect, Page } from "@playwright/test"

// Verifies that link-code (Code de liaison) pickers also show the FS structure
// row label (the "account name"), so users can tell what a code maps to.
// Driven through the statement chart-settings dialog, whose single-code <Select>
// renders each option as "<code> — <libellé>". All backend calls are mocked.

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"

type StructRow = Record<string, unknown>

async function setupAuth(page: Page, structure: StructRow[]) {
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
}

const SINGLE_ROW: StructRow[] = [
  {
    label: "Ventes nettes",
    linkCode: "4100",
    liaisonMode: "single",
    defineMapping: true,
    showInDetail: true,
  },
]

test("chart-settings single-code picker shows the FS row label next to the code", async ({
  page,
}) => {
  await setupAuth(page, SINGLE_ROW)

  const slot = {
    chart_instance_id: "default",
    slot_index: 0,
    version: 1,
    config: {
      version: 2,
      chartTitle: "Performance financière",
      series: [
        {
          id: "r",
          kind: "bar",
          label: "Revenus",
          // Pre-selected single code so the Select trigger renders the label.
          spec: { type: "single", code: "4100" },
          yAxis: "left",
          valueFormat: "currency",
          showOnChart: true,
          showInSidePanel: true,
          color: "#3b82f6",
        },
      ],
    },
    updated_by_user_email: "u@e.com",
    updated_at: "2026-05-18T00:00:00Z",
  }

  await page.route(
    new RegExp(
      `/api/companies/${COMPANY_ID}/statement-chart-configs(/[^?]+)?(\\?.*)?$`,
    ),
    (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ slots: [slot] }),
        })
      }
      return route.continue()
    },
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
          periods: [],
          rows: [],
        }),
      }),
  )
  await page.route(
    `**/api/companies/${COMPANY_ID}/financial-statements/income-statement*`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ rows: [] }),
      }),
  )

  await page.goto(
    `/financial-statements/income-statement?companyId=${COMPANY_ID}`,
  )

  await page
    .getByRole("button", { name: /paramètres du graphique/i })
    .first()
    .click({ timeout: 15000 })

  // The single-code Select trigger shows the selected code AND its row label.
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByText("Ventes nettes").first()).toBeVisible({
    timeout: 10000,
  })
  await expect(dialog.getByText("4100").first()).toBeVisible()
})

const TWO_ROWS: StructRow[] = [
  {
    label: "Ventes nettes",
    linkCode: "4100",
    liaisonMode: "single",
    defineMapping: true,
  },
  {
    label: "Coût des marchandises",
    linkCode: "5100",
    liaisonMode: "single",
    defineMapping: true,
  },
]

test("Sommaire liaison combobox shows the FS row label for each code", async ({
  page,
}) => {
  await setupAuth(page, TWO_ROWS)

  await page.route(
    `**/api/companies/${COMPANY_ID}/statement-chart-configs**`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ slots: [] }),
      }),
  )
  // Populated rows so the Sommaire card renders (the empty state hides the
  // "Paramètres" button that opens the structure editor).
  await page.route(
    `**/api/companies/${COMPANY_ID}/financial-statements/income-statement*`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          rows: [
            { label: "Ventes nettes", current: 1000, prior: 900 },
            { label: "Coût des marchandises", current: 400, prior: 350 },
          ],
        }),
      }),
  )
  // Series route (added last so it wins over the base glob for /series). The
  // default view is multi-period ("12months"), so the summary builds its rows
  // from this series payload — it must be non-empty for the card to render.
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
            {
              id: "r1",
              label: "Ventes nettes",
              linkCode: "4100",
              amounts: { "2026-5": 1000 },
              detailRows: [],
            },
            {
              id: "r2",
              label: "Coût des marchandises",
              linkCode: "5100",
              amounts: { "2026-5": 400 },
              detailRows: [],
            },
          ],
        }),
      }),
  )

  await page.goto(
    `/financial-statements/income-statement?companyId=${COMPANY_ID}`,
  )

  // Switch to the Sommaire section, then enter structure-edit mode.
  await page.getByRole("button", { name: /^Sommaire$/ }).click({ timeout: 15000 })
  await page.getByRole("button", { name: /^Paramètres$/ }).click({ timeout: 15000 })

  // The liaison cell for the "Ventes nettes" row (code 4100) — open its popover.
  await page.getByRole("button", { name: "4100" }).click({ timeout: 15000 })

  // Inside the popover, the link-code combobox shows "4100 — Ventes nettes".
  const linkCombobox = page
    .getByRole("combobox")
    .filter({ hasText: "Ventes nettes" })
  await expect(linkCombobox).toBeVisible({ timeout: 10000 })

  // Opening it lists the OTHER code with its label too.
  await linkCombobox.click()
  await expect(page.getByText("Coût des marchandises").first()).toBeVisible({
    timeout: 10000,
  })
  await expect(page.getByText("5100").first()).toBeVisible()
})
