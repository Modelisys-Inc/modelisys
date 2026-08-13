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

  // Income statement rows (Sommaire/Détail, fetched on mount even in dashboard).
  await page.route(
    `**/api/companies/${COMPANY_ID}/financial-statements/income-statement*`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ rows: [] }),
      }),
  )

  // Series endpoint used by StatementChart for data points.
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
}

function defaultIncomeSlot() {
  return {
    chart_instance_id: "default",
    slot_index: 0,
    version: 1,
    config: {
      version: 2,
      chartTitle: "",
      series: [
        {
          id: "r",
          kind: "bar",
          label: "Revenus",
          spec: { type: "single", code: "" },
          yAxis: "left",
          valueFormat: "currency",
          showOnChart: true,
          showInSidePanel: true,
          color: "#3b82f6",
        },
        {
          id: "m",
          kind: "line",
          label: "Contribution marginale (%)",
          spec: {
            type: "derivedContributiveMargin",
            revenueSeriesId: "r",
          },
          yAxis: "right",
          valueFormat: "ratio",
          showOnChart: true,
          showInSidePanel: true,
          color: "#f59e0b",
        },
        {
          id: "e",
          kind: "bar",
          label: "BAIIA",
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

test.describe("Income statement dashboard", () => {
  // Without populated series data the chart card renders its empty state. We
  // deliberately assert against that state because the goal of this regression
  // is to verify the *dashboard wiring* (default slot is created and shown,
  // add-slot triggers a POST) — not the chart drawing logic, which is exercised
  // by the underlying unit / chart-rendering tests.
  test("default chart slot renders in dashboard mode", async ({ page }) => {
    await setupAuth(page)
    await page.route(
      `**/api/companies/${COMPANY_ID}/statement-chart-configs*`,
      (route) => {
        if (route.request().method() === "GET") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ slots: [defaultIncomeSlot()] }),
          })
        }
        return route.continue()
      },
    )

    await page.goto(
      `/financial-statements/income-statement?companyId=${COMPANY_ID}`,
    )

    // The dashboard section is the default. The "Ajouter un graphique"
    // top-right button is rendered when there is a resolved company and
    // dashboard is active.
    await expect(
      page.getByRole("button", { name: /ajouter un graphique/i }),
    ).toBeVisible({ timeout: 15000 })

    // The default chart slot is mounted without a settings button (séries imposées).
    await expect(page.getByRole("heading", { name: "Performance financière" })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByRole("button", { name: /paramètres du graphique/i })).toHaveCount(0)
  })

  test("add chart triggers POST and re-fetches slots", async ({ page }) => {
    await setupAuth(page)

    let slots: ReturnType<typeof defaultIncomeSlot>[] = [defaultIncomeSlot()]
    let postCount = 0
    let getCountAfterPost = 0
    let postSeen = false

    await page.route(
      `**/api/companies/${COMPANY_ID}/statement-chart-configs*`,
      (route) => {
        const method = route.request().method()
        if (method === "GET") {
          if (postSeen) getCountAfterPost += 1
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ slots }),
          })
        }
        if (method === "POST") {
          postSeen = true
          postCount += 1
          const next = {
            ...defaultIncomeSlot(),
            chart_instance_id: "new-1",
            slot_index: 1,
          }
          slots = [...slots, next]
          return route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify(next),
          })
        }
        return route.continue()
      },
    )

    await page.goto(
      `/financial-statements/income-statement?companyId=${COMPANY_ID}`,
    )

    const addButton = page.getByRole("button", {
      name: /ajouter un graphique/i,
    })
    await expect(addButton).toBeVisible({ timeout: 15000 })

    // Wait for the POST request triggered by the click.
    const postRequest = page.waitForRequest(
      (req) =>
        req.method() === "POST" &&
        req.url().includes(`/api/companies/${COMPANY_ID}/statement-chart-configs`),
    )
    await addButton.click()
    await postRequest

    expect(postCount).toBe(1)
    // The hook re-fetches the slot list after a successful add.
    await expect.poll(() => getCountAfterPost, { timeout: 5000 }).toBeGreaterThan(0)
    expect(slots).toHaveLength(2)
  })
})
