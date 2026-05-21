import { test, expect, Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"

async function setupAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "fake-access-token")
    localStorage.setItem("refresh_token", "fake-refresh-token")
  })
  await page.context().addCookies([
    { name: "has_session", value: "1", url: "http://localhost:3000" },
  ])

  // Auth bootstrap.
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "u1",
          email: "u@e.com",
          full_name: "Test User",
          is_active: true,
          created_at: "2026-01-01T00:00:00Z",
        },
        organizations: [
          { id: "o1", name: "Test Org", slug: "test-org", role: "admin" },
        ],
      }),
    }),
  )
  await page.route("**/api/organizations", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: "o1", name: "Test Org", slug: "test-org", role: "admin" },
      ]),
    }),
  )

  // listCompanies expects { companies: [...] } — see lib/api.ts.
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

  // listBudgets expects { budgets: [] }.
  await page.route(`**/api/companies/${COMPANY_ID}/budgets**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ budgets: [] }),
    }),
  )

  // Cash-flow rows (Sommaire/Détail, fetched on mount even in dashboard).
  await page.route(
    `**/api/companies/${COMPANY_ID}/financial-statements/cash-flow*`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ rows: [] }),
      }),
  )

  // Series endpoint used by StatementChart for data points.
  await page.route(
    `**/api/companies/${COMPANY_ID}/financial-statements/cash-flow/series*`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: "cash-flow",
          fiscalYear: 2026,
          periods: [],
          rows: [],
        }),
      }),
  )
}

function defaultCashFlowSlot() {
  return {
    chart_instance_id: "default",
    slot_index: 0,
    version: 1,
    config: {
      version: 2,
      chartTitle: "Flux de trésorerie",
      series: [
        {
          id: "op",
          kind: "bar",
          label: "Exploitation",
          spec: { type: "single", code: "" },
          yAxis: "left",
          valueFormat: "currency",
          showOnChart: true,
          showInSidePanel: true,
          color: "#3b82f6",
          stackGroup: "cf",
        },
        {
          id: "inv",
          kind: "bar",
          label: "Investissement",
          spec: { type: "single", code: "" },
          yAxis: "left",
          valueFormat: "currency",
          showOnChart: true,
          showInSidePanel: true,
          color: "#8b5cf6",
          stackGroup: "cf",
        },
        {
          id: "fin",
          kind: "bar",
          label: "Financement",
          spec: { type: "single", code: "" },
          yAxis: "left",
          valueFormat: "currency",
          showOnChart: true,
          showInSidePanel: true,
          color: "#ec4899",
          stackGroup: "cf",
        },
        {
          id: "net",
          kind: "line",
          label: "Flux net",
          spec: { type: "single", code: "" },
          yAxis: "left",
          valueFormat: "currency",
          showOnChart: true,
          showInSidePanel: true,
          color: "#10b981",
        },
      ],
    },
    updated_by_user_email: "u@e.com",
    updated_at: "2026-05-18T00:00:00Z",
  }
}

test.describe("Cash flow dashboard", () => {
  // The cash-flow page (see app/financial-statements/cash-flow/page.tsx)
  // defaults section to "dashboard" since Task 16. Only one StatementChart is
  // mounted at a time in dashboard mode (`{activeSlot ? <StatementChart … /> :
  // null}`), and the Top-3 variations band is rendered inside the
  // `section !== "dashboard"` branch, alongside the "Compréhension des flux
  // de trésorerie" heading. These two tests pin both behaviors down.
  test("section toggle is present and dashboard mode renders the default chart", async ({
    page,
  }) => {
    await setupAuth(page)

    const slots = [defaultCashFlowSlot()]
    await page.route(
      `**/api/companies/${COMPANY_ID}/statement-chart-configs*`,
      (route) => {
        if (route.request().method() === "GET") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ slots }),
          })
        }
        return route.continue()
      },
    )

    await page.goto(`/financial-statements/cash-flow?companyId=${COMPANY_ID}`)

    // The 3-button section toggle is rendered in the dark control bar.
    await expect(
      page.getByRole("button", { name: "Tableau de bord" }),
    ).toBeVisible({ timeout: 15000 })
    await expect(
      page.getByRole("button", { name: "Sommaire" }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Détail" }),
    ).toBeVisible()

    // Dashboard is the default section — the active chart card mounts and
    // exposes its settings button regardless of data availability.
    await expect(
      page
        .getByRole("button", { name: /paramètres du graphique/i })
        .first(),
    ).toBeVisible({ timeout: 10000 })
  })

  test("Top-3 variations band is hidden in Dashboard and visible in Sommaire", async ({
    page,
  }) => {
    await setupAuth(page)

    const slots = [defaultCashFlowSlot()]
    await page.route(
      `**/api/companies/${COMPANY_ID}/statement-chart-configs*`,
      (route) => {
        if (route.request().method() === "GET") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ slots }),
          })
        }
        return route.continue()
      },
    )

    await page.goto(`/financial-statements/cash-flow?companyId=${COMPANY_ID}`)

    // Wait until the page has mounted (section toggle is visible).
    await expect(
      page.getByRole("button", { name: "Tableau de bord" }),
    ).toBeVisible({ timeout: 15000 })

    // In dashboard mode, the "Compréhension des flux de trésorerie" heading
    // is not rendered (it lives inside the `section !== "dashboard"` branch).
    const cfHeading = page.getByText(/compréhension des flux de trésorerie/i)
    await expect(cfHeading).toHaveCount(0)

    // Switch to Sommaire — the heading should now be visible.
    await page.getByRole("button", { name: "Sommaire" }).click()
    await expect(cfHeading).toBeVisible({ timeout: 10000 })
  })
})
