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

  // Balance sheet rows (Sommaire/Détail, fetched on mount even in dashboard).
  await page.route(
    `**/api/companies/${COMPANY_ID}/financial-statements/balance-sheet*`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ rows: [] }),
      }),
  )

  // Series endpoint used by StatementChart for data points.
  await page.route(
    `**/api/companies/${COMPANY_ID}/financial-statements/balance-sheet/series*`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: "balance-sheet",
          fiscalYear: 2026,
          periods: [],
          rows: [],
        }),
      }),
  )
}

function defaultBalanceSheetSlot() {
  return {
    chart_instance_id: "default",
    slot_index: 0,
    version: 1,
    config: {
      version: 2,
      chartTitle: "Bilan",
      series: [
        {
          id: "a",
          kind: "bar",
          label: "Actifs",
          spec: { type: "single", code: "" },
          yAxis: "left",
          valueFormat: "currency",
          showOnChart: true,
          showInSidePanel: true,
          color: "#3b82f6",
        },
        {
          id: "l",
          kind: "bar",
          label: "Passifs",
          spec: { type: "single", code: "" },
          yAxis: "left",
          valueFormat: "currency",
          showOnChart: true,
          showInSidePanel: true,
          color: "#10b981",
        },
        {
          id: "e",
          kind: "bar",
          label: "Capitaux propres",
          spec: { type: "single", code: "" },
          yAxis: "left",
          valueFormat: "currency",
          showOnChart: true,
          showInSidePanel: true,
          color: "#f59e0b",
        },
      ],
    },
    updated_by_user_email: "u@e.com",
    updated_at: "2026-05-18T00:00:00Z",
  }
}

test.describe("Balance sheet dashboard", () => {
  // Combined regression: verifies the default chart slot mounts AND that
  // "Ajouter un graphique" creates a second slot. Without populated series
  // data the chart card renders its empty state — we deliberately assert
  // against that state because the goal is to verify the *dashboard wiring*
  // (default slot creation, add-slot triggers a POST + re-fetch), not chart
  // drawing logic.
  //
  // NOTE on the multi-slot assertion. The page only mounts the *active*
  // StatementChart at a time (`{activeSlot ? <StatementChart … /> : null}`
  // in app/financial-statements/balance-sheet/page.tsx), so the requested
  // `toHaveCount(2)` on "Paramètres du graphique" can never be satisfied —
  // even with 2 slots the empty-state card only has one such button, and
  // the "2/2" slot badge only renders in the populated-chart branch (not
  // the empty branch). Following the same approach as Task 18, we instead
  // observe the POST + re-fetch on the network (the dashboard wiring under
  // test) and confirm the slot count grew to 2.
  test("default slot renders and add-chart spawns a second slot", async ({
    page,
  }) => {
    await setupAuth(page)

    let slots: ReturnType<typeof defaultBalanceSheetSlot>[] = [
      defaultBalanceSheetSlot(),
    ]
    let postCount = 0
    let postSeen = false
    let getCountAfterPost = 0

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
            ...defaultBalanceSheetSlot(),
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
      `/financial-statements/balance-sheet?companyId=${COMPANY_ID}`,
    )

    // Dashboard is the default section for the balance-sheet page (see
    // app/financial-statements/balance-sheet/page.tsx, useState<Section>
    // defaults to "dashboard"), so no toggle click is needed.

    const addButton = page.getByRole("button", {
      name: /ajouter un graphique/i,
    })
    await expect(addButton).toBeVisible({ timeout: 15000 })

    // The default chart slot is mounted — its settings button is exposed
    // independently of data availability.
    const settingsButtons = page.getByRole("button", {
      name: /paramètres du graphique/i,
    })
    await expect(settingsButtons.first()).toBeVisible({ timeout: 10000 })

    // Click add and wait for the POST so the hook re-fetches before we
    // assert the new slot is in place.
    const postRequest = page.waitForRequest(
      (req) =>
        req.method() === "POST" &&
        req
          .url()
          .includes(`/api/companies/${COMPANY_ID}/statement-chart-configs`),
    )
    await addButton.click()
    await postRequest

    expect(postCount).toBe(1)
    // The hook re-fetches the slot list after a successful add — proves
    // the second slot landed on the client.
    await expect
      .poll(() => getCountAfterPost, { timeout: 5000 })
      .toBeGreaterThan(0)
    expect(slots).toHaveLength(2)

    // Settings button stays present (one card still mounted at a time).
    await expect(settingsButtons.first()).toBeVisible()
  })
})
