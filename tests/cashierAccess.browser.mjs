import assert from "node:assert/strict"
import { createRequire } from "node:module"
const { chromium } = createRequire(import.meta.url)("playwright")
const browser = await chromium.launch({ channel: "msedge", headless: true })
const origin = process.env.PRODUCT_SEARCH_PREVIEW_URL || "http://127.0.0.1:5203"
try {
  for (const [language, width] of [["en", 1440], ["fr", 375], ["es", 768]]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } })
    const page = await context.newPage(), errors = [], requests = []
    page.on("pageerror", error => errors.push(error.message))
    await page.addInitScript(lang => {
      localStorage.setItem("camelyon_token", "isolated-cashier-access")
      localStorage.setItem("cameleyon-ui-language", lang)
    }, language)
    await page.route("**/api/**", async route => {
      const request = route.request(), url = new URL(request.url()), path = url.pathname
      if (!path.startsWith("/api/")) return route.continue()
      const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type" }
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers })
      requests.push(path)
      let json
      if (path === "/api/auth/me") json = { id: 8, role: "CASHIER", companyId: 7, companyName: "Cashier store", termsAccepted: true, companyTimeZoneId: "Etc/GMT+5" }
      else if (path === "/api/customers" || path === "/api/products" || path === "/api/sales") json = []
      else if (path === "/api/company/locations") json = [{ id: 9, name: "Site A", active: true, primaryLocation: true }]
      else if (path === "/api/company/subscription") json = { status: "ACTIVE", planCode: "BASIC" }
      else throw Error("Unexpected cashier API " + path)
      return route.fulfill({ json, headers })
    })
    await page.goto(origin + "/tests/fixtures/cashier-app.html")
    await page.locator(".product-lookup-card").waitFor()
    assert.equal(await page.locator(".sidebar-nav button").count(), 2)
    assert.equal(await page.locator(".sidebar-footer-actions button").count(), 0)
    assert.equal(await page.locator(".sidebar-logout-button").count(), 1)
    if (width < 1000) await page.locator(".mobile-menu-button").click()
    await page.locator(".sidebar-nav button").last().click()
    await page.locator("#sales-history-list-heading").waitFor()
    assert.ok(requests.includes("/api/sales"))
    assert.ok(!requests.some(path => path.startsWith("/api/dashboard")))
    // Even an isolated direct render of the client page must not load client data.
    const before = requests.filter(path => path === "/api/customers").length
    await page.goto(origin + "/tests/fixtures/customers.html")
    await page.waitForTimeout(300)
    assert.equal(await page.locator("h1").count(), 0)
    assert.equal(requests.filter(path => path === "/api/customers").length, before)
    assert.deepEqual(errors, [])
    console.log("PASS", language, width, "cashier starts in sales, only two pages, direct client rendering blocked")
    await context.close()
  }
} finally { await browser.close() }
