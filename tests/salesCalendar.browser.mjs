import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { demoUser, summaryFixture } from "./fixtures/forecast-demo.mjs"
const { chromium } = createRequire(import.meta.url)("playwright")
const browser = await chromium.launch({ channel: "msedge", headless: true })
const origin = process.env.FORECAST_PREVIEW_URL || "http://127.0.0.1:5203"
const instant = "2026-11-22T01:00:00Z"
try {
  for (const browserZone of ["Asia/Tokyo", "America/Los_Angeles"]) {
    for (const [companyZone, day, wall] of [
      ["America/Port-au-Prince", "2026-11-21", "2026-11-21T20:00:00"],
      ["Asia/Tokyo", "2026-11-22", "2026-11-22T10:00:00"],
    ]) {
      for (const role of ["ADMIN", "CASHIER"]) {
      const context = await browser.newContext({ viewport: { width: 1200, height: 1000 }, timezoneId: browserZone })
      const page = await context.newPage(), requests = [], errors = []
      page.on("pageerror", error => errors.push(error.message))
      await page.clock.install({ time: new Date(instant) })
      await page.addInitScript(() => {
        localStorage.setItem("camelyon_token", "isolated-sales-calendar")
        localStorage.setItem("cameleyon-ui-language", "en")
      })
      await page.route("**/api/**", async route => {
        const request = route.request(), url = new URL(request.url()), path = url.pathname
        if (!path.startsWith("/api/")) return route.continue()
        const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type" }
        if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers })
        assert.equal(request.method(), "GET")
        requests.push(url)
        let body
        if (path === "/api/auth/me") body = { ...demoUser, role, companyTimeZoneId: companyZone }
        else if (path === "/api/company/locations") body = [{ id: 9, name: "Site A", active: true, primaryLocation: true }]
        else if (path === "/api/company/subscription") body = { planCode: "BASIC", status: "TRIAL" }
        else if (path === "/api/sales") body = [{
          id: 1, saleNumber: "SALE-CALENDAR", soldAt: wall, locationId: 9, locationName: "Site A",
          customerName: "Walk-in", paymentMethod: "CASH", totalAmount: 50, totalCostAmount: 30,
          totalProfitAmount: 20, taxAmount: 0, subtotalAmount: 50, status: "COMPLETED",
        }]
        else if (path === "/api/dashboard/summary") body = { ...summaryFixture, totalSales: 50, totalTransactions: 1 }
        else if (path === "/api/dashboard/sales-trend") body = [{
          date: day, totalSales: 50, totalCost: 30, totalProfit: 20, transactionCount: 1,
        }]
        else if (path === "/api/dashboard/top-products" || path === "/api/dashboard/low-stock") body = []
        else if (path === "/api/forecasts/weekly/current") body = { enabled: false }
        else throw Error("Unexpected API " + path)
        await route.fulfill({ json: body, headers })
      })
      await page.goto(origin + "/tests/fixtures/sales-calendar.html")
      await page.getByRole("cell", { name: "SALE-CALENDAR", exact: true }).waitFor()
      assert.equal(await page.locator("input[type=date]").last().inputValue(), day)
      assert.equal(await page.locator("input[type=date]").first().isDisabled(), role === "CASHIER")
      if (role === "CASHIER") {
        assert.equal(await page.locator("input[type=date]").first().inputValue(), day)
        assert.ok(requests.some(url => url.pathname === "/api/sales" && url.searchParams.get("startDate") === day))
      }
      await page.setViewportSize({ width: 375, height: 850 })
      assert.equal(await page.locator(".table-scroll-actions").count(), 0)
      const button = page.locator(".sales-history-actions button").first()
      assert.ok((await button.boundingBox()).height <= 36)
      await page.setViewportSize({ width: 1200, height: 1000 })
      const rowText = await page.locator("tr").filter({ hasText: "SALE-CALENDAR" }).innerText()
      assert.ok(rowText.includes(day.slice(-2)))
      assert.ok(requests.some(url => url.pathname === "/api/sales" && url.searchParams.get("endDate") === day))
      await page.goto(origin + "/tests/fixtures/dashboard-forecast.html")
      await page.locator(".summary-card").first().waitFor()
      assert.equal(await page.locator("input[type=date]").last().inputValue(), day)
      assert.ok(requests.some(url => url.pathname === "/api/dashboard/sales-trend" && url.searchParams.get("endDate") === day))
      assert.ok((await page.locator(".summary-card").first().innerText()).includes("50.00"))
      assert.deepEqual(errors, [])
      console.log("PASS", role, browserZone, companyZone, "history and dashboard share", day)
      await context.close()
      }
    }
  }
} finally { await browser.close() }
