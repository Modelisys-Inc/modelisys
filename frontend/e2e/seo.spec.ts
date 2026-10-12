import { test, expect } from "@playwright/test"

test.describe("SEO + launch readiness", () => {
  test("/robots.txt serves the file (not redirected to /login)", async ({ request }) => {
    const res = await request.get("/robots.txt")
    expect(res.status()).toBe(200)
    const body = await res.text()
    expect(body).toContain("User-agent: *")
    expect(body).toContain("Sitemap: https://modelisys.com/sitemap.xml")
  })

  test("/sitemap.xml serves XML on the canonical host", async ({ request }) => {
    const res = await request.get("/sitemap.xml")
    expect(res.status()).toBe(200)
    const body = await res.text()
    expect(body).toContain("<?xml")
    expect(body).toContain("https://modelisys.com/")
    expect(body).toContain("/blog/importance-reporting-financier")
  })

  test("/.well-known/security.txt is reachable", async ({ request }) => {
    const res = await request.get("/.well-known/security.txt")
    expect(res.status()).toBe(200)
    const body = await res.text()
    expect(body).toMatch(/Contact:\s*mailto:security@modelisys\.com/)
  })

  test("/manifest.webmanifest serves valid JSON manifest", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest")
    expect(res.status()).toBe(200)
    expect(res.headers()["content-type"]).toContain("application/manifest+json")
    const manifest = await res.json()
    expect(manifest.name).toBe("Modelisys")
    expect(manifest.theme_color).toBe("#10b981")
  })

  test("/opengraph-image returns a PNG", async ({ request }) => {
    const res = await request.get("/opengraph-image")
    expect(res.status()).toBe(200)
    expect(res.headers()["content-type"]).toContain("image/png")
    const body = await res.body()
    expect(body.length).toBeGreaterThan(5000)
  })

  test("/icon and /apple-icon return PNGs", async ({ request }) => {
    for (const path of ["/icon", "/apple-icon"]) {
      const res = await request.get(path)
      expect(res.status(), `${path} should be 200`).toBe(200)
      expect(res.headers()["content-type"]).toContain("image/png")
    }
  })

  test("public pages send security headers", async ({ request }) => {
    const res = await request.get("/")
    expect(res.status()).toBe(200)
    const h = res.headers()
    expect(h["strict-transport-security"]).toContain("max-age=")
    expect(h["x-content-type-options"]).toBe("nosniff")
    expect(h["x-frame-options"]).toBe("DENY")
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin")
    expect(h["permissions-policy"]).toContain("camera=()")
  })

  test("landing page has OG, twitter, Organization JSON-LD", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/Modelisys/)
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      /Modelisys/,
    )
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /\/opengraph-image/,
    )
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image",
    )
    const orgScript = page.locator('script[type="application/ld+json"]').first()
    const orgJson = await orgScript.textContent()
    expect(orgJson).toBeTruthy()
    const parsed = JSON.parse(orgJson as string)
    expect(parsed["@type"]).toBe("Organization")
    expect(parsed.name).toBe("Modelisys")
  })

  test("blog post emits BlogPosting JSON-LD with datePublished", async ({ page }) => {
    await page.goto("/blog/importance-reporting-financier")
    const scripts = page.locator('script[type="application/ld+json"]')
    const count = await scripts.count()
    expect(count).toBeGreaterThanOrEqual(1)
    let found = false
    for (let i = 0; i < count; i++) {
      const text = await scripts.nth(i).textContent()
      if (text && text.includes('"BlogPosting"')) {
        const parsed = JSON.parse(text)
        expect(parsed.headline).toContain("reporting")
        expect(parsed.datePublished).toBe("2026-01-29")
        expect(parsed.author.name).toBe("Modelisys")
        found = true
      }
    }
    expect(found, "BlogPosting JSON-LD not found on page").toBe(true)
  })

  test("/login redirects to home (portal removed)", async ({ page }) => {
    await page.goto("/login")
    await expect(page).toHaveURL("/")
  })

  test("v0.app generator marker is gone", async ({ page }) => {
    const res = await page.goto("/")
    const html = await res!.text()
    expect(html).not.toContain('content="v0.app"')
  })
})
