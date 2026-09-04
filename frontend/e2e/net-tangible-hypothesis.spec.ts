import { test, expect, type Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"
const ROW_ID = "act-a-encaisse"
const ROW_ID_B = "act-c-clients"
const TOTAL_ID = "total-act-court"

async function setupAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "fake-access-token")
    localStorage.setItem("refresh_token", "fake-refresh-token")
  })
  await page.context().addCookies([{ name: "has_session", value: "1", url: "http://localhost:3000" }])

  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "u1",
          email: "admin@e.com",
          full_name: "Admin",
          is_active: true,
          is_superadmin: false,
          created_at: "2026-01-01T00:00:00Z",
        },
        organizations: [{ id: "o1", name: "Org", slug: "org", role: "admin", feature_flags: {} }],
      }),
    }),
  )
  await page.route("**/api/auth/refresh", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access_token: "fake-access-token", refresh_token: "fake-refresh-token" }),
    }),
  )
  await page.route(/\/api\/companies(\?.*)?$/, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companies: [
            {
              id: COMPANY_ID,
              name: "Demo Co",
              fiscal_year_end: "12-31",
              currency: "CAD",
              divisions: [],
            },
          ],
        }),
      })
    }
    return route.continue()
  })
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

async function setupNetTangiblePage(
  page: Page,
  options?: {
    withSubtotal?: boolean
    savedValues?: Record<string, number>
  },
) {
  await setupAuth(page)
  const withSubtotal = options?.withSubtotal ?? false
  const savedValues = options?.savedValues ?? {}

  await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/balance-sheet**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: null,
        company_id: COMPANY_ID,
        statement_type: "balance-sheet",
        structure: withSubtotal
          ? [
              { id: ROW_ID, label: "Encaisse", linkCode: "ACT-A", isResult: false },
              { id: ROW_ID_B, label: "Clients", linkCode: "ACT-C", isResult: false },
              {
                id: TOTAL_ID,
                label: "Total de l'actif à court terme",
                linkCode: "ACT",
                isResult: true,
                isBold: true,
                formula: ["+ACT-A", "+ACT-C"],
              },
            ]
          : [],
      }),
    }),
  )

  const rows = withSubtotal
    ? [
        {
          id: ROW_ID,
          label: "Encaisse",
          current: 500_000,
          prior: 400_000,
          isBold: false,
          isSection: false,
          isResult: false,
          linkCode: "ACT-A",
          hasLiaisonCode: true,
          detailRows: [],
        },
        {
          id: ROW_ID_B,
          label: "Clients",
          current: 200_000,
          prior: 180_000,
          isBold: false,
          isSection: false,
          isResult: false,
          linkCode: "ACT-C",
          hasLiaisonCode: true,
          detailRows: [],
        },
        {
          id: TOTAL_ID,
          label: "Total de l'actif à court terme",
          current: 700_000,
          prior: 580_000,
          isBold: true,
          isSection: false,
          isResult: true,
          linkCode: "ACT",
          hasLiaisonCode: true,
          detailRows: [],
        },
      ]
    : [
        {
          id: ROW_ID,
          label: "Encaisse",
          current: 500_000,
          prior: 400_000,
          isBold: false,
          isSection: false,
          isResult: false,
          linkCode: "ACT-A",
          hasLiaisonCode: true,
          detailRows: [],
        },
      ]

  await page.route(`**/api/companies/${COMPANY_ID}/financial-statements/balance-sheet**`, (route) => {
    if (route.request().url().includes("/series")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: "balance-sheet",
          fiscalYear: 2026,
          periods: [],
          rows: [],
        }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        companyId: COMPANY_ID,
        statementType: "balance-sheet",
        fiscalYear: 2026,
        month: 3,
        period: "monthly",
        rows,
      }),
    })
  })

  await page.route(`**/api/companies/${COMPANY_ID}/forecast-configs**`, (route) => {
    if (route.request().method() === "GET") {
      const url = route.request().url()
      if (url.includes("net-tangible-assets-values")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            configs:
              Object.keys(savedValues).length > 0
                ? [
                    {
                      id: "cfg-values",
                      company_id: COMPANY_ID,
                      config_type: "net-tangible-assets-values",
                      data: savedValues,
                    },
                  ]
                : [],
          }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ configs: [] }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "cfg-1",
        company_id: COMPANY_ID,
        config_type: "net-tangible-assets-values",
        data: {},
      }),
    })
  })
}

test.describe("Valeur comptable ajusté — hypothèses par cellule", () => {
  test("clicking Ajustements opens hypothesis engine with live VCA/ACN buildup", async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await setupNetTangiblePage(page)
    await page.goto(
      `/evaluation/net-tangible-assets?companyId=${COMPANY_ID}&refMonth=3&refYear=2026`,
    )

    await expect(
      page.getByRole("heading", { name: "Valeur comptable ajustée", exact: true }),
    ).toBeVisible({
      timeout: 15000,
    })
    const overview = page.getByTestId("net-tangible-overview-strip")
    await expect(overview).toBeVisible()
    await expect(page.getByTestId("net-tangible-overview-vc")).toBeVisible()
    await expect(page.getByTestId("net-tangible-overview-vca")).toBeVisible()
    await expect(page.getByTestId("net-tangible-overview-acn")).toBeVisible()
    await expect(page.getByTestId("net-tangible-overview-dettes")).toBeVisible()
    await expect(page.getByTestId("net-tangible-overview-actifs-excedentaires")).toBeVisible()
    await expect(page.getByTestId("net-tangible-overview-actifs-requis")).toBeVisible()
    await expect(page.getByTestId("net-tangible-overview-fdr-representatif")).toContainText("—")
    await expect(page.getByTestId("net-tangible-section-menu")).toBeVisible()
    await expect(page.getByTestId("net-tangible-section-menu")).toHaveAttribute(
      "aria-label",
      "Sommaire du rapport",
    )
    await expect(page.getByTestId("net-tangible-section-vca")).toBeVisible()
    await expect(page.getByTestId("net-tangible-section-jvm-capex")).toHaveCount(0)
    await expect(page.getByTestId("net-tangible-section-fdr-representatif")).toBeVisible()
    await expect(page.getByTestId("net-tangible-reference-date")).toContainText("Date de référence")
    await expect(page.getByRole("heading", { name: /Bilan ajusté \(VCA\)/ })).toBeVisible()
    await expect(page.getByText("Encaisse").first()).toBeVisible({ timeout: 15000 })
    // No footer Total row under the balance sheet
    await expect(
      page.locator("table tbody tr").filter({ has: page.getByText("Total", { exact: true }) }),
    ).toHaveCount(0)

    await page.getByTestId("net-tangible-section-fdr-representatif").click()
    await expect(page.getByTestId("net-tangible-fdr-card")).toBeVisible()
    await page.getByTestId("net-tangible-section-vca").click()

    await page.getByTestId(`nta-adj-${ROW_ID}`).click()

    const panel = page.getByTestId("net-tangible-hypothesis-panel")
    await expect(panel).toBeVisible()
    await expect(panel).toHaveAttribute("data-field", "adjustments")
    await expect(panel.getByText("Hypothèse — Ajustements")).toBeVisible()
    await expect(page.getByTestId("net-tangible-hypothesis-adjustments")).toBeVisible()
    await expect(page.getByTestId("net-tangible-hypothesis-debts")).toHaveCount(0)
    await expect(page.getByTestId("net-tangible-hypothesis-assets")).toHaveCount(0)
    await expect(page.getByTestId("nta-hypothesis-buildup")).toBeVisible()
    await expect(page.getByTestId("nta-buildup-vca")).toBeVisible()
    await expect(page.getByTestId("nta-buildup-acn")).toBeVisible()
    await expect(page.getByTestId("nta-leaf-mode-dollar")).toBeVisible()
    await expect(page.getByTestId("nta-leaf-mode-percent-vc")).toBeVisible()
    await expect(page.getByTestId("nta-leaf-mode-fair-value")).toBeVisible()

    await page.getByTestId(`nta-debt-${ROW_ID}`).click()
    await expect(panel).toHaveAttribute("data-field", "debts")
    await expect(panel.getByText("Hypothèse — Dettes")).toBeVisible()
    await expect(page.getByTestId("net-tangible-hypothesis-debts")).toBeVisible()
    await expect(page.getByTestId("net-tangible-hypothesis-adjustments")).toHaveCount(0)
  })

  test("subtotals sum Ajustements / VCA / Dettes / Actifs / ACN from leaf rows", async ({ page }) => {
    test.setTimeout(60_000)
    await setupNetTangiblePage(page, {
      withSubtotal: true,
      savedValues: {
        [`${ROW_ID}-adjustments`]: 100_000,
        [`${ROW_ID}-debts`]: 10_000,
        [`${ROW_ID}-assets`]: 1_000,
        [`${ROW_ID_B}-adjustments`]: 50_000,
        [`${ROW_ID_B}-debts`]: 5_000,
        [`${ROW_ID_B}-assets`]: 2_000,
      },
    })
    await page.goto(
      `/evaluation/net-tangible-assets?companyId=${COMPANY_ID}&refMonth=3&refYear=2026`,
    )

    await expect(page.getByText("Total de l'actif à court terme").first()).toBeVisible({
      timeout: 15000,
    })

    const totalAdj = page.getByTestId(`nta-adj-${TOTAL_ID}`)
    await expect(totalAdj).toHaveText(/150[\s\u00a0]?000/)
    // VCA = 700_000 + 150_000 = 850_000
    await expect(totalAdj.locator("xpath=following-sibling::td[1]")).toHaveText(/850[\s\u00a0]?000/)
    await expect(page.getByTestId(`nta-debt-${TOTAL_ID}`)).toHaveText(/15[\s\u00a0]?000/)
    await expect(page.getByTestId(`nta-asset-${TOTAL_ID}`)).toHaveText(/3[\s\u00a0]?000/)
    // ACN = 850_000 - 15_000 - 3_000 = 832_000
    await expect(page.getByTestId(`nta-asset-${TOTAL_ID}`).locator("xpath=following-sibling::td[1]")).toHaveText(
      /832[\s\u00a0]?000/,
    )
  })

  test("Validation VCA/ACN is balanced when Total actif equals Total passifs et actif net", async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const totalActifId = "total-actif"
    const totalPassifsId = "total-passifs"
    const equityTotalId = "total-cp"
    const totalLeId = "total-passif-cp"
    await setupAuth(page)

    await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/balance-sheet**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: null,
          company_id: COMPANY_ID,
          statement_type: "balance-sheet",
          structure: [
            { id: "sec-actifs", label: "Actifs", isSection: true },
            { id: ROW_ID, label: "Encaisse", linkCode: "ACT-A", isResult: false },
            {
              id: totalActifId,
              label: "Total de l'actif",
              linkCode: "ACT",
              isResult: true,
              isBold: true,
              formula: ["+ACT-A"],
            },
            { id: "pct", label: "Créditeurs", linkCode: "PCT-C" },
            {
              id: totalPassifsId,
              label: "Total des passifs",
              linkCode: "PAS",
              isResult: true,
              formula: ["+PCT-C"],
            },
            { id: "sec-cp", label: "Capitaux propres", isSection: true },
            {
              id: equityTotalId,
              label: "Total des capitaux propres",
              linkCode: "CAP",
              isResult: true,
            },
            {
              id: totalLeId,
              label: "Total passifs et capitaux propres",
              linkCode: "PAS-CAP",
              isResult: true,
              isBold: true,
            },
          ],
        }),
      }),
    )

    await page.route(`**/api/companies/${COMPANY_ID}/financial-statements/balance-sheet**`, (route) => {
      if (route.request().url().includes("/series")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            companyId: COMPANY_ID,
            statementType: "balance-sheet",
            fiscalYear: 2026,
            periods: [],
            rows: [],
          }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: "balance-sheet",
          fiscalYear: 2026,
          month: 3,
          period: "monthly",
          rows: [
            {
              id: "sec-actifs",
              label: "Actifs",
              current: 0,
              isSection: true,
              detailRows: [],
            },
            {
              id: ROW_ID,
              label: "Encaisse",
              current: 500_000,
              linkCode: "ACT-A",
              hasLiaisonCode: true,
              detailRows: [],
            },
            {
              id: totalActifId,
              label: "Total de l'actif",
              current: 500_000,
              isResult: true,
              isBold: true,
              linkCode: "ACT",
              hasLiaisonCode: true,
              detailRows: [],
            },
            {
              id: "pct",
              label: "Créditeurs",
              current: 200_000,
              linkCode: "PCT-C",
              hasLiaisonCode: true,
              detailRows: [],
            },
            {
              id: totalPassifsId,
              label: "Total des passifs",
              current: 200_000,
              isResult: true,
              isBold: true,
              linkCode: "PAS",
              hasLiaisonCode: true,
              detailRows: [],
            },
            {
              id: "sec-cp",
              label: "Capitaux propres",
              current: 0,
              isSection: true,
              detailRows: [],
            },
            {
              id: equityTotalId,
              label: "Total des capitaux propres",
              current: 300_000,
              isResult: true,
              isBold: true,
              linkCode: "CAP",
              hasLiaisonCode: true,
              detailRows: [],
            },
            {
              id: totalLeId,
              label: "Total passifs et capitaux propres",
              current: 500_000,
              isResult: true,
              isBold: true,
              linkCode: "PAS-CAP",
              hasLiaisonCode: true,
              detailRows: [],
            },
          ],
        }),
      })
    })

    await page.route(`**/api/companies/${COMPANY_ID}/forecast-configs**`, (route) => {
      if (route.request().method() === "GET") {
        if (route.request().url().includes("net-tangible-assets-values")) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              configs: [
                {
                  id: "cfg-values",
                  company_id: COMPANY_ID,
                  config_type: "net-tangible-assets-values",
                  data: {
                    [`${ROW_ID}-adjustments`]: 100_000,
                    [`${ROW_ID}-debts`]: 10_000,
                    ["pct-adjustments"]: 40_000,
                  },
                },
              ],
            }),
          })
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ configs: [] }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "cfg-1", data: {} }),
      })
    })

    await page.goto(
      `/evaluation/net-tangible-assets?companyId=${COMPANY_ID}&refMonth=3&refYear=2026`,
      { waitUntil: "domcontentloaded", timeout: 120_000 },
    )

    await expect(page.getByTestId("balance-sheet-validation-row")).toBeVisible({ timeout: 30000 })
    // Total actif VCA = Total passifs + Actif net → Validation VCA/ACN = 0 $
    await expect(page.getByTestId("nta-validation-vca")).toHaveText(/0\s*\$/)
    await expect(page.getByTestId("nta-validation-acn")).toHaveText(/0\s*\$/)
  })

  test("Actif net VCA and ACN equal Total actif minus Total des passifs", async ({ page }) => {
    test.setTimeout(60_000)
    const totalActifId = "total-actif"
    const totalPassifsId = "total-passifs"
    const equityTotalId = "total-cp"
    await setupAuth(page)

    await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/balance-sheet**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: null,
          company_id: COMPANY_ID,
          statement_type: "balance-sheet",
          structure: [
            { id: ROW_ID, label: "Encaisse", linkCode: "ACT-A" },
            {
              id: totalActifId,
              label: "Total de l'actif",
              linkCode: "ACT",
              isResult: true,
              formula: ["+ACT-A"],
            },
            { id: "pct", label: "Créditeurs", linkCode: "PCT-C" },
            {
              id: totalPassifsId,
              label: "Total des passifs",
              linkCode: "PAS",
              isResult: true,
              formula: ["+PCT-C"],
            },
            { id: "sec-cp", label: "Capitaux propres", isSection: true },
            { id: "cap-c", label: "Bénéfices non répartis", linkCode: "CAP-C" },
            {
              id: equityTotalId,
              label: "Total des capitaux propres",
              linkCode: "CAP",
              isResult: true,
              formula: ["+CAP-C"],
            },
            {
              id: "total-passifs-cp",
              label: "Total des passifs et des capitaux propres",
              linkCode: "PAS-CAP",
              isResult: true,
              isBold: true,
            },
          ],
        }),
      }),
    )

    await page.route(`**/api/companies/${COMPANY_ID}/financial-statements/balance-sheet**`, (route) => {
      if (route.request().url().includes("/series")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            companyId: COMPANY_ID,
            statementType: "balance-sheet",
            fiscalYear: 2026,
            periods: [],
            rows: [],
          }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: "balance-sheet",
          fiscalYear: 2026,
          month: 3,
          period: "monthly",
          rows: [
            {
              id: ROW_ID,
              label: "Encaisse",
              current: 1_000_000,
              isResult: false,
              linkCode: "ACT-A",
              hasLiaisonCode: true,
              detailRows: [],
            },
            {
              id: totalActifId,
              label: "Total de l'actif",
              current: 1_000_000,
              isResult: true,
              isBold: true,
              linkCode: "ACT",
              hasLiaisonCode: true,
              detailRows: [],
            },
            {
              id: "pct",
              label: "Créditeurs",
              current: 300_000,
              isResult: false,
              linkCode: "PCT-C",
              hasLiaisonCode: true,
              detailRows: [],
            },
            {
              id: totalPassifsId,
              label: "Total des passifs",
              current: 300_000,
              isResult: true,
              isBold: true,
              linkCode: "PAS",
              hasLiaisonCode: true,
              detailRows: [],
            },
            {
              id: "sec-cp",
              label: "Capitaux propres",
              current: 0,
              isSection: true,
              detailRows: [],
            },
            {
              id: "cap-c",
              label: "Bénéfices non répartis",
              current: 700_000,
              isResult: false,
              linkCode: "CAP-C",
              hasLiaisonCode: true,
              detailRows: [],
            },
            {
              id: equityTotalId,
              label: "Total des capitaux propres",
              current: 700_000,
              isResult: true,
              isBold: true,
              linkCode: "CAP",
              hasLiaisonCode: true,
              detailRows: [],
            },
            {
              id: "total-passifs-cp",
              label: "Total des passifs et des capitaux propres",
              current: 1_000_000,
              isResult: true,
              isBold: true,
              linkCode: "PAS-CAP",
              hasLiaisonCode: true,
              detailRows: [],
            },
          ],
        }),
      })
    })

    await page.route(`**/api/companies/${COMPANY_ID}/forecast-configs**`, (route) => {
      if (route.request().method() === "GET") {
        if (route.request().url().includes("net-tangible-assets-values")) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              configs: [
                {
                  id: "cfg-values",
                  company_id: COMPANY_ID,
                  config_type: "net-tangible-assets-values",
                  data: {
                    [`${ROW_ID}-adjustments`]: 100_000,
                    [`${ROW_ID}-debts`]: 20_000,
                    ["pct-adjustments"]: 50_000,
                  },
                },
              ],
            }),
          })
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ configs: [] }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "cfg-1", data: {} }),
      })
    })

    await page.goto(
      `/evaluation/net-tangible-assets?companyId=${COMPANY_ID}&refMonth=3&refYear=2026`,
    )

    await expect(page.getByText("Actif net", { exact: true }).first()).toBeVisible({ timeout: 15000 })
    const actifNetRow = page
      .locator("table tbody tr")
      .filter({ has: page.getByText("Actif net", { exact: true }) })
      .first()
    // Total actif VCA = 1_100_000 ; Total passifs VCA = 350_000 ; Actif net VCA = 750_000
    // Columns: Poste | Book | Adj | VCA | Dettes | Actifs | ACN
    const cells = actifNetRow.locator("td")
    await expect(cells.nth(3)).toHaveText(/750[\s\u00a0]?000/)
    // Total actif ACN = 1_100_000 − 20_000 = 1_080_000 ; Total passifs ACN = 350_000 ; Actif net ACN = 730_000
    await expect(cells.nth(6)).toHaveText(/730[\s\u00a0]?000/)

    await expect(page.getByText("Total des passifs et de l'actif net").first()).toBeVisible()
    await expect(page.getByText("Total des passifs et des capitaux propres")).toHaveCount(0)
    const leRow = page
      .locator("table tbody tr")
      .filter({ hasText: "Total des passifs et de l'actif net" })
      .first()
    const leCells = leRow.locator("td")
    // = Total passifs + Actif net = Total actif → VCA 1_100_000, ACN 1_080_000
    await expect(leCells.nth(3)).toHaveText(/1[\s\u00a0]?100[\s\u00a0]?000/)
    await expect(leCells.nth(6)).toHaveText(/1[\s\u00a0]?080[\s\u00a0]?000/)

    await expect(page.getByTestId("nta-row-valeur-dettes")).toHaveCount(0)
    await expect(page.getByTestId("nta-row-valeur-actifs-excedentaires")).toHaveCount(0)
  })

  test("Immobilisations corporelles Ajustements opens JVM Capex annex table with VC and JVM", async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await setupAuth(page)

    const ALT_B = "alt-b-immos"
    const ALT_B1 = "alt-b-1-terrain"
    const ALT_B2 = "alt-b-2-batiment"

    await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/balance-sheet**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: null,
          company_id: COMPANY_ID,
          statement_type: "balance-sheet",
          structure: [
            {
              id: ALT_B,
              label: "Immobilisations corporelles",
              linkCode: "ALT-B",
              annexLetter: "1",
              showInDetail: true,
              isResult: true,
              liaisonMode: "sum",
              liaisonSumCodes: ["ALT-B.1", "ALT-B.2"],
            },
            {
              id: ALT_B1,
              label: "Terrain",
              linkCode: "ALT-B.1",
              detailOnly: true,
              annexLetter: "1",
              showInDetail: true,
            },
            {
              id: ALT_B2,
              label: "Bâtiment",
              linkCode: "ALT-B.2",
              detailOnly: true,
              annexLetter: "1",
              showInDetail: true,
            },
          ],
        }),
      }),
    )

    await page.route(`**/api/companies/${COMPANY_ID}/financial-statements/balance-sheet**`, (route) => {
      if (route.request().url().includes("/series")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            companyId: COMPANY_ID,
            statementType: "balance-sheet",
            fiscalYear: 2026,
            periods: [],
            rows: [],
          }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: "balance-sheet",
          fiscalYear: 2026,
          month: 3,
          period: "monthly",
          rows: [
            {
              id: ALT_B,
              label: "Immobilisations corporelles",
              current: 500_000,
              prior: 480_000,
              isBold: true,
              isSection: false,
              isResult: true,
              linkCode: "ALT-B",
              hasLiaisonCode: true,
              annexLetter: "1",
              showInDetail: true,
              detailRows: [],
            },
            {
              id: ALT_B1,
              label: "Terrain",
              current: 200_000,
              prior: 200_000,
              isBold: false,
              isSection: false,
              isResult: false,
              detailOnly: true,
              linkCode: "ALT-B.1",
              hasLiaisonCode: true,
              detailRows: [],
            },
            {
              id: ALT_B2,
              label: "Bâtiment",
              current: 300_000,
              prior: 280_000,
              isBold: false,
              isSection: false,
              isResult: false,
              detailOnly: true,
              linkCode: "ALT-B.2",
              hasLiaisonCode: true,
              detailRows: [],
            },
          ],
        }),
      })
    })

    await page.route(`**/api/companies/${COMPANY_ID}/forecast-configs**`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ configs: [] }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "cfg-1", data: {} }),
      })
    })

    await page.route("**/api/standard-link-codes/flat**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      }),
    )

    await page.goto(
      `/evaluation/net-tangible-assets?companyId=${COMPANY_ID}&refMonth=3&refYear=2026`,
      { waitUntil: "domcontentloaded", timeout: 120_000 },
    )

    await expect(page.getByTestId(`nta-adj-${ALT_B}`)).toBeVisible({ timeout: 30_000 })
    await page.getByTestId(`nta-adj-${ALT_B}`).click()

    const panel = page.getByTestId("net-tangible-hypothesis-panel")
    await expect(panel).toBeVisible()
    await expect(panel).toHaveAttribute("data-jvm-capex", "true")
    await expect(page.getByTestId("net-tangible-jvm-capex-table")).toBeVisible()
    await expect(page.getByText("Terrain")).toBeVisible()
    await expect(page.getByText("Bâtiment")).toBeVisible()
    await expect(page.getByTestId("net-tangible-jvm-input-ALT-B.1")).toBeVisible()
    await expect(page.getByTestId("net-tangible-jvm-input-ALT-B.2")).toBeVisible()

    await page.getByTestId("net-tangible-jvm-input-ALT-B.2").fill("350000")
    await page.getByTestId("net-tangible-jvm-input-ALT-B.2").blur()
    await expect(page.getByTestId("net-tangible-jvm-adjustment")).toHaveText(/50[\s\u00a0]?000/)

    await page.getByTestId("net-tangible-jvm-toggle-meta-ALT-B.2").click()
    await page.getByTestId("net-tangible-jvm-note-ALT-B.2").fill("Évaluation indépendante 2026")

    await expect(page.getByTestId("nta-buildup-adjustments")).toContainText(/50[\s\u00a0]?000/, {
      timeout: 5_000,
    })
    await page.getByTestId("net-tangible-hypothesis-close").click()
    await expect(panel).toHaveCount(0)

    const immoRow = page
      .locator("table tbody tr")
      .filter({ has: page.getByText("Immobilisations corporelles", { exact: true }) })
      .first()
    await expect(immoRow.locator("td").nth(2)).toHaveText(/50[\s\u00a0]?000/)
  })

  test("Immobilisations corporelles Actifs opens surplus annex with JVM and editable Excédent", async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await setupAuth(page)

    const ALT_B = "alt-b-immos"
    const ALT_B1 = "alt-b-1-terrain"
    const ALT_B2 = "alt-b-2-batiment"

    await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/balance-sheet**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: null,
          company_id: COMPANY_ID,
          statement_type: "balance-sheet",
          structure: [
            {
              id: ALT_B,
              label: "Immobilisations corporelles",
              linkCode: "ALT-B",
              annexLetter: "1",
              showInDetail: true,
              isResult: true,
              liaisonMode: "sum",
              liaisonSumCodes: ["ALT-B.1", "ALT-B.2"],
            },
            {
              id: ALT_B1,
              label: "Terrain",
              linkCode: "ALT-B.1",
              detailOnly: true,
              annexLetter: "1",
              showInDetail: true,
            },
            {
              id: ALT_B2,
              label: "Bâtiment",
              linkCode: "ALT-B.2",
              detailOnly: true,
              annexLetter: "1",
              showInDetail: true,
            },
          ],
        }),
      }),
    )

    await page.route(`**/api/companies/${COMPANY_ID}/financial-statements/balance-sheet**`, (route) => {
      if (route.request().url().includes("/series")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            companyId: COMPANY_ID,
            statementType: "balance-sheet",
            fiscalYear: 2026,
            periods: [],
            rows: [],
          }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: "balance-sheet",
          fiscalYear: 2026,
          month: 3,
          period: "monthly",
          rows: [
            {
              id: ALT_B,
              label: "Immobilisations corporelles",
              current: 500_000,
              prior: 480_000,
              isBold: true,
              isResult: true,
              linkCode: "ALT-B",
              hasLiaisonCode: true,
              annexLetter: "1",
              showInDetail: true,
              detailRows: [],
            },
            {
              id: ALT_B1,
              label: "Terrain",
              current: 200_000,
              prior: 200_000,
              linkCode: "ALT-B.1",
              hasLiaisonCode: true,
              annexLetter: "1",
              showInDetail: true,
              detailRows: [],
            },
            {
              id: ALT_B2,
              label: "Bâtiment",
              current: 300_000,
              prior: 280_000,
              linkCode: "ALT-B.2",
              hasLiaisonCode: true,
              annexLetter: "1",
              showInDetail: true,
              detailRows: [],
            },
          ],
        }),
      })
    })

    await page.route(`**/api/companies/${COMPANY_ID}/forecast-configs**`, (route) => {
      if (route.request().method() === "GET") {
        if (route.request().url().includes("net-tangible-assets-values")) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              configs: [
                {
                  id: "cfg-values",
                  company_id: COMPANY_ID,
                  config_type: "net-tangible-assets-values",
                  data: {
                    [`${ALT_B}-jvm-ALT-B.1`]: 200_000,
                    [`${ALT_B}-jvm-ALT-B.2`]: 350_000,
                  },
                },
              ],
            }),
          })
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ configs: [] }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "cfg-1", data: {} }),
      })
    })

    await page.route("**/api/standard-link-codes/flat**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      }),
    )

    await page.goto(
      `/evaluation/net-tangible-assets?companyId=${COMPANY_ID}&refMonth=3&refYear=2026`,
      { waitUntil: "domcontentloaded", timeout: 120_000 },
    )

    await expect(page.getByTestId(`nta-asset-${ALT_B}`)).toBeVisible({ timeout: 30_000 })
    await page.getByTestId(`nta-asset-${ALT_B}`).click()
    const panel = page.getByTestId("net-tangible-hypothesis-panel")
    await expect(panel).toBeVisible({ timeout: 30_000 })
    await expect(panel).toHaveAttribute("data-surplus", "true")
    await expect(page.getByTestId("net-tangible-surplus-table")).toBeVisible()
    await expect(page.getByTestId("net-tangible-surplus-row-ALT-B.2")).toContainText("350")
    await expect(page.getByTestId("net-tangible-excedent-input-ALT-B.2")).toBeVisible()

    await page.getByTestId("net-tangible-excedent-input-ALT-B.2").fill("80000")
    await page.getByTestId("net-tangible-excedent-input-ALT-B.2").blur()
    await expect(page.getByTestId("net-tangible-surplus-total")).toHaveText(/80[\s\u00a0]?000/)
    await expect(page.getByTestId("nta-buildup-assets")).toContainText(/80[\s\u00a0]?000/, {
      timeout: 5_000,
    })

    await page.getByTestId("net-tangible-hypothesis-close").click()
    await expect(panel).toHaveCount(0)

    await expect(page.getByTestId(`nta-asset-${ALT_B}`)).toHaveText(/80[\s\u00a0]?000/)
  })
})

test.describe("Valeur comptable ajusté — FDR représentatif revenus TTM", () => {
  test("affiche les revenus TTM et le FDR en % des revenus", async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    await setupNetTangiblePage(page)

    const actCtId = "total-act-ct"
    const pctCtId = "total-pct-ct"
    await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/balance-sheet**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: null,
          company_id: COMPANY_ID,
          statement_type: "balance-sheet",
          structure: [
            { id: actCtId, label: "Total de l'actif à court terme", linkCode: "ACT", isResult: true },
            { id: pctCtId, label: "Total du passif à court terme", linkCode: "PCT", isResult: true },
          ],
        }),
      }),
    )
    await page.route(`**/api/companies/${COMPANY_ID}/financial-statements/balance-sheet**`, (route) => {
      if (route.request().url().includes("/series")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            companyId: COMPANY_ID,
            statementType: "balance-sheet",
            fiscalYear: 2026,
            periods: [],
            rows: [],
          }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: "balance-sheet",
          fiscalYear: 2026,
          month: 12,
          period: "monthly",
          rows: [
            {
              id: actCtId,
              label: "Total de l'actif à court terme",
              current: 240_000,
              isResult: true,
              isBold: true,
              linkCode: "ACT",
              detailRows: [],
            },
            {
              id: pctCtId,
              label: "Total du passif à court terme",
              current: 120_000,
              isResult: true,
              isBold: true,
              linkCode: "PCT",
              detailRows: [],
            },
          ],
        }),
      })
    })

    const monthAbbrevs = [
      "Jan",
      "Fév",
      "Mar",
      "Avr",
      "Mai",
      "Jun",
      "Jul",
      "Aoû",
      "Sep",
      "Oct",
      "Nov",
      "Déc",
    ]
    const periods = monthAbbrevs.map((label, i) => ({
      fiscalYear: 2026,
      fiscalMonth: i + 1,
      label: `${label} 2026`,
    }))
    const amounts: Record<string, number> = {}
    for (let month = 1; month <= 12; month++) amounts[`2026-${month}`] = 100_000

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
            periods,
            rows: [
              {
                id: "REV",
                label: "Revenus",
                linkCode: "REV",
                isBold: true,
                isSection: false,
                isResult: true,
                amounts,
                detailRows: [],
              },
            ],
          }),
        }),
    )

    await page.goto(
      `/evaluation/net-tangible-assets?companyId=${COMPANY_ID}&refMonth=12&refYear=2026`,
      { waitUntil: "domcontentloaded", timeout: 120_000 },
    )
    await expect(
      page.getByRole("heading", { name: "Valeur comptable ajustée", exact: true }),
    ).toBeVisible({
      timeout: 15_000,
    })
    // Attendre les données bilan (aperçu FDR = 240k − 120k)
    await expect(page.getByTestId("net-tangible-overview-fdr-representatif")).toContainText(
      /120[\s\u00a0\u202f]*000/,
      { timeout: 45_000 },
    )
    await page.getByTestId("net-tangible-section-fdr-representatif").click()
    await expect(page.getByTestId("net-tangible-fdr-card")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId("fdr-revenue-ttm")).toContainText(
      /1[\s\u00a0\u202f]*200[\s\u00a0\u202f]*000/,
    )
    await expect(page.getByText(/TTM au/)).toBeVisible()
    // FDR ACN = 240k − 120k = 120k ; TTM = 1.2M → 10.0 % des revenus
    await expect(page.getByTestId("fdr-base-value")).toContainText(
      /120[\s\u00a0\u202f]*000/,
    )
    await expect(page.getByTestId("fdr-base-pct-revenue")).toHaveText("10.0 % des revenus")

    // Bandeau : FDR = déterminé (120k) tant qu’aucun ajustement
    await expect(page.getByTestId("net-tangible-overview-fdr-representatif")).toContainText(
      /120[\s\u00a0\u202f]*000/,
    )

    // Mode Ajustement $ : carte Ajustement en $ ; % = FDR ajusté / TTM
    await page.getByTestId("fdr-adj-mode-dollar").click()
    await page.getByTestId("fdr-adj-value-input").fill("12000")
    await expect(page.getByTestId("fdr-adjustment-display")).toContainText(
      /12[\s\u00a0\u202f]*000/,
      { timeout: 5_000 },
    )
    // Ajusté = 120k + 12k = 132k / 1.2M = 11.0 % ; écart 12k / 1.2M = 1.0 %
    await expect(page.getByTestId("fdr-adjusted-pct-revenue")).toHaveText("11.0 % des revenus")
    await expect(page.getByTestId("fdr-adjustment-hint")).toHaveText(
      "Variations : 1.0 % des revenus",
    )
    await expect(page.getByTestId("net-tangible-overview-fdr-representatif")).toContainText(
      /132[\s\u00a0\u202f]*000/,
    )
    await expect(page.getByTestId("net-tangible-overview-fdr-representatif")).toContainText(
      "FDR représentatif ajusté",
    )
    // Mode % des revenus : carte Ajustement = écart $ vs VCA ; % = montant total / TTM
    await page.getByTestId("fdr-adj-mode-percent-revenue").click()
    await page.getByTestId("fdr-adj-value-input").fill("15")
    // Ajusté = 1.2M × 15 % = 180k ; écart vs 120k = 60k ; 180k / 1.2M = 15.0 %
    await expect(page.getByTestId("fdr-adjustment-display")).toContainText(
      /60[\s\u00a0\u202f]*000/,
      { timeout: 5_000 },
    )
    await expect(page.getByTestId("fdr-adjustment-hint")).toHaveText(
      "Variations : 5.0 % des revenus",
    )
    await expect(page.getByTestId("fdr-adjusted-pct-revenue")).toHaveText("15.0 % des revenus")

    // Mode montant représentatif : même principe (écart $ + total / TTM)
    await page.getByTestId("fdr-adj-mode-representative-amount").click()
    await page.getByTestId("fdr-adj-value-input").fill("180000")
    await expect(page.getByTestId("fdr-adjustment-display")).toContainText(
      /60[\s\u00a0\u202f]*000/,
      { timeout: 5_000 },
    )
    await expect(page.getByTestId("fdr-adjustment-hint")).toHaveText(
      "Variations : 5.0 % des revenus",
    )
    await expect(page.getByTestId("fdr-adjusted-pct-revenue")).toHaveText("15.0 % des revenus")
  })
})
