import { chromium } from "@playwright/test"

const browser = await chromium.launch({
  headless: true,
  args: ["--window-size=420,900"],
})
const page = await browser.newPage({ viewport: null })
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" })
const info = await page.evaluate(() => {
  const hero = document.querySelector("#hero .grid")
  return {
    innerWidth: window.innerWidth,
    outerWidth: window.outerWidth,
    screen: [screen.width, screen.height],
    viewport: document.querySelector('meta[name="viewport"]')?.getAttribute("content"),
    scaled: document.documentElement.getAttribute("data-landing-scaled"),
    heroCols: hero ? getComputedStyle(hero).gridTemplateColumns : null,
  }
})
console.log(JSON.stringify(info, null, 2))
await page.screenshot({ path: "tmp-home-narrow.png" })
await browser.close()
