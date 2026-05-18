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
  // Mock structure endpoint that the settings dialog calls. The dialog passes
  // `data.structure ?? []` to collectDistinctLinkCodesFromStructure, which
  // iterates over the array. Returning an empty array keeps the dialog quiet.
  await page.route("**/api/companies/*/statement-structures/*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ structure: [] }),
    }),
  )
}

test("stale-config 409 on save surfaces Recharger and Écraser banner", async ({
  page,
}) => {
  await setupAuth(page)

  const initial = {
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
          spec: { type: "single", code: "" },
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

  // The backend wraps detail; lib/api.ts StaleVersionError parses the inner
  // object. FastAPI's HTTPException(detail=dict) produces wire body
  // { "detail": <inner> }. Our apiFetch's formatApiErrorDetail
  // JSON.stringifies that inner detail before throwing ApiError, so the
  // parsed body must mimic the FastAPI wire shape.
  // Use a regex so a single matcher catches both `…/statement-chart-configs`
  // (GET list — no trailing slash) and `…/statement-chart-configs/<id>` (PUT
  // upsert). A glob like `…statement-chart-configs*` would NOT match the PUT
  // because `*` doesn't cross `/`.
  await page.route(
    new RegExp(
      `/api/companies/${COMPANY_ID}/statement-chart-configs(/[^?]+)?(\\?.*)?$`,
    ),
    (route) => {
      const method = route.request().method()
      if (method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ slots: [initial] }),
        })
      }
      if (method === "PUT") {
        return route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            detail: {
              detail: "stale_version",
              current_version: 5,
              current_config: {
                ...initial.config,
                chartTitle: "Edited elsewhere",
              },
              updated_by_user_email: "other@example.com",
              updated_at: "2026-05-18T01:00:00Z",
            },
          }),
        })
      }
      return route.continue()
    },
  )

  // Series / financial-statement mocks to keep the page quiet.
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

  // Dashboard is the default section. Open the settings dialog.
  await page
    .getByRole("button", { name: /paramètres du graphique/i })
    .first()
    .click({ timeout: 15000 })

  // Click "Enregistrer" inside the dialog — triggers the 409.
  await page.getByRole("button", { name: /^enregistrer$/i }).click()

  // Banner appears with the stale message + both action buttons.
  await expect(
    page.getByText(/quelqu'un d'autre a modifié ce graphique/i),
  ).toBeVisible({ timeout: 10000 })
  await expect(
    page.getByRole("button", { name: /recharger/i }),
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: /écraser quand même/i }),
  ).toBeVisible()
})
