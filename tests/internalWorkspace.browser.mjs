import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { mkdir } from "node:fs/promises"
import { messages } from "../src/i18n/messages.ts"
import { internalCopy } from "../src/i18n/internalCopy.ts"
import { setupCopy } from "../src/i18n/setupCopy.ts"
import { calendarCopy } from "../src/components/profile/calendarCopy.ts"
import { forecastFixture } from "./fixtures/forecast-data.mjs"

const { chromium } = createRequire(import.meta.url)("playwright")
const origin = process.env.INTERNAL_PREVIEW_URL || "http://127.0.0.1:5244"
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error("Browser tests require a local server")
const screenshots = process.env.INTERNAL_SCREENSHOTS
if (screenshots) await mkdir(screenshots, { recursive: true })
const browser = await chromium.launch({ channel: "msedge", headless: true })
const sites = [
  { id: 9, name: "Main site", active: true, primaryLocation: true },
  { id: 10, name: "Second site", active: true, primaryLocation: false },
]
const sales = [180, 248, 154, 245].map((totalSales, index) => {
  const totalCost = [62, 80, 49, 100][index]
  return { date: `2026-11-${23 + index}`, totalSales, totalCost, totalProfit: totalSales - totalCost, transactionCount: [4, 6, 3, 4][index] }
})
const products = [
  { productId: 1, productName: "Jasmine rice", sku: "PRD-000001", totalQuantitySold: 24, totalSalesAmount: 480, totalProfitAmount: 350 },
  { productId: 2, productName: "Black beans", sku: "PRD-000002", totalQuantitySold: 16, totalSalesAmount: 288, totalProfitAmount: 154 },
  { productId: 3, productName: "Sunflower oil", sku: "PRD-000003", totalQuantitySold: 3, totalSalesAmount: 59, totalProfitAmount: 32 },
]
const stock = products.slice(0, 2).map((product, i) => ({
  productId: product.productId, sku: product.sku, name: product.productName,
  currentStock: i ? 0 : 5, minimumStock: 8, shortage: i ? 8 : 3,
}))

async function capture(page, filename, whole = true) {
  if (!screenshots) return
  const expansion = whole && await page.addStyleTag({ content: `
    .app-shell.internal-shell { height: auto; min-height: 100vh; overflow: visible; }
    .internal-shell .workspace-main > .app-content { overflow: visible; }
  ` })
  try { await page.screenshot({ path: `${screenshots}/${filename}.png`, fullPage: whole, animations: "disabled" }) }
  finally { if (expansion) await expansion.evaluate(node => node.remove()) }
}

try {
  for (const [language, width, firstUse] of [
    ["en", 1440, false], ["en", 390, false], ["en", 1440, true], ["en", 390, true],
    ["fr", 390, false], ["es", 320, true],
  ]) {
    const copy = messages[language], labels = internalCopy[language]
    const mobile = width <= 768, device = mobile ? "mobile" : "desktop"
    const page = await browser.newPage({ viewport: { width, height: 900 }, timezoneId: "Asia/Tokyo" })
    const errors = [], requests = []
    page.on("pageerror", error => errors.push(error.message))
    await page.clock.setFixedTime(new Date("2026-11-26T17:00:00Z"))
    await page.addInitScript(() => localStorage.setItem("camelyon_token", "synthetic-workspace"))
    await page.route("**/*", async route => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname
      if (!path.startsWith("/api/")) return url.origin === origin ? route.continue() : route.abort()
      const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Allow-Methods": "GET, OPTIONS" }
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers })
      assert.equal(req.method(), "GET")
      requests.push(url)
      const hasSales = !firstUse && !url.searchParams.get("endDate")?.startsWith("2026-10")
      let json = []
      if (path === "/api/auth/me") json = { id: 8, companyId: 7, role: "ADMIN", termsAccepted: true, companyOwner: true,
        companyCurrencyCode: firstUse ? null : "USD", companyTimeZoneId: "Etc/GMT+5",
        locations: sites, companyName: "Cameleyon Demo Store", firstName: "Demo", lastName: "Owner" }
      else if (path === "/api/company/locations") json = sites
      else if (path === "/api/company/locations/all") json = sites
      else if (path === "/api/auth/email-consent") json = { productUpdates: false }
      else if (path === "/api/company/profile") json = { companyId: 7, name: "Cameleyon Demo Store", timeZoneId: "Etc/GMT+5", currencyCode: "USD" }
      else if (path === "/api/company/subscription") json = firstUse
        ? { status: "TRIAL", accessEndAt: "2027-02-24T17:00:00Z" } : { status: "ACTIVE" }
      else if (path === "/api/dashboard/setup-status") json = { hasCurrency: !firstUse, hasProduct: !firstUse,
        hasActiveProduct: !firstUse, hasRecordedStock: !firstUse, hasEverCompletedSale: !firstUse,
        hasAccessibleSite: true, needsInventoryReview: false, openingStockTarget: null, saleSiteIds: firstUse ? [] : [9] }
      else if (path === "/api/dashboard/summary") json = { totalSales: hasSales ? 827 : 0, totalCost: hasSales ? 291 : 0,
        totalProfit: hasSales ? 536 : 0, totalTransactions: hasSales ? 17 : 0, totalTax: 0,
        lowStockProducts: firstUse ? 0 : 2, outOfStockProducts: firstUse ? 0 : 1 }
      else if (path === "/api/dashboard/sales-trend") json = hasSales ? sales : []
      else if (path === "/api/dashboard/top-products") json = !hasSales ? [] :
        url.searchParams.get("ranking")?.startsWith("LOWEST") ? products.slice(2) : products.slice(0, 2)
      else if (path === "/api/dashboard/low-stock") json = firstUse ? [] : stock
      else if (path === "/api/forecasts/weekly/current") {
        const site = url.searchParams.get("locationId")
        json = { ...forecastFixture(site ? [Number(site)] : [9, 10]), scope: site ? "SITE" : "COMPANY" }
      } else if (path === "/api/history/calendar") json = {
        businessTimeZone: "Etc/GMT+5", calendar: { locationId: Number(url.searchParams.get("locationId")), weekdays: [], dates: [] },
      }
      return route.fulfill({ headers, json })
    })

    await page.goto(origin + "/" + language)
    await page.locator(".internal-dashboard h1").waitFor()
    assert.equal(await page.locator("html").getAttribute("lang"), language)
    await page.locator(".summary-card").first().waitFor()
    assert.equal(await page.locator(".summary-card").count(), 7)
    assert.deepEqual(await page.locator(".dashboard-primary-kpis .summary-title").allTextContents(),
      [copy.dashboardPage.totalSales, copy.dashboardPage.totalCost, copy.dashboardPage.totalProfit])
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth &&
      document.querySelector("main").scrollWidth <= document.querySelector("main").clientWidth), true)
    const filters = page.locator(".dashboard-filter-panel")
    const header = page.locator(".workspace-topbar")
    const headerSale = header.getByRole("button", { name: copy.sidebar.newSale, exact: true })
    const siteFilter = page.locator(".dashboard-heading").getByRole("combobox", { name: copy.dashboardFilters.location, exact: true })
    const openPage = async (name) => {
      if (mobile) await page.locator(".mobile-menu-button").click()
      await page.locator(".workspace-sidebar:visible").getByRole("button", { name, exact: true }).click()
    }
    const changeDefault = async id => {
      if (mobile) await page.locator(".mobile-menu-button").click()
      const menuSite = page.locator(".workspace-sidebar:visible .workspace-menu-site select")
      await menuSite.waitFor()
      assert.deepEqual(await menuSite.locator("option:enabled").allTextContents(), sites.map(site => site.name))
      await menuSite.selectOption(id)
      const title = page.locator(".workspace-sidebar:visible .sidebar-company-header strong")
      assert.equal(await title.textContent(), sites.find(site => String(site.id) === id).name)
      if (mobile) {
        await page.keyboard.press("Escape")
        await page.locator(".workspace-menu-dialog").waitFor({ state: "hidden" })
      }
    }
    const trial = header.locator(".trial-reminder")
    assert.equal(await headerSale.count(), 0)
    assert.equal(await siteFilter.isVisible(), true)
    if (!mobile) {
      const heading = await page.locator(".dashboard-heading h1").boundingBox()
      const selector = await siteFilter.boundingBox()
      assert.ok(selector.x >= heading.x + heading.width, "Site selector sits beside the page title")
    }
    assert.equal(await siteFilter.inputValue(), "")
    assert.equal(await siteFilter.locator('option[value=""]:enabled').textContent(), copy.dashboardFilters.allLocations)
    assert.equal(await header.getByRole("combobox").count(), 0)
    assert.equal(await filters.getByRole("combobox", { name: copy.dashboardFilters.location, exact: true }).count(), 0)
    assert.equal(await header.getByRole("button", { name: copy.common.profile, exact: true }).count(), 0)
    assert.equal(await filters.getAttribute("open") !== null, !mobile)
    if (firstUse) {
      await page.getByRole("region", { name: setupCopy[language].title }).waitFor()
      assert.equal(await page.locator(".setup-milestones li").count(), 4)
      assert.equal(await page.locator(".setup-milestones [aria-current=step]").count(), 1)
      await page.getByText(labels.noSales, { exact: true }).waitFor()
      await trial.waitFor()
      assert.equal(await page.locator("main .trial-reminder").count(), 0)
      assert.ok(!requests.some(url => url.pathname.startsWith("/api/forecasts/")))
      await capture(page, `first-use-${language}-${device}`)
      await openPage(copy.sidebar.newSale)
      await page.getByRole("heading", { name: copy.newSalePage.title, exact: true }).waitFor()
      assert.equal(await trial.isVisible(), true)
      assert.equal(await headerSale.count(), 0)
      assert.equal(await siteFilter.count(), 0)
    } else {
      assert.equal(await trial.count(), 0)
      if (mobile) await filters.locator("summary").click()
      await filters.getByRole("combobox", { name: labels.period, exact: true }).selectOption("this-week")
      await filters.getByRole("button", { name: copy.dashboardFilters.apply, exact: true }).click()
      await page.locator(".summary-forecast").first().waitFor()
      assert.equal(await page.locator(".summary-forecast").count(), 2)
      assert.equal(await page.locator(".setup-guide").count(), 0)
      await page.locator(".recharts-cartesian-grid").waitFor()
      if (mobile) await filters.locator("summary").click()
      await capture(page, `dashboard-${language}-${device}`)
      if (mobile) {
        await page.locator(".mobile-menu-button").click()
        await page.locator(".workspace-menu-dialog[open]").waitFor()
        await capture(page, `navigation-${language}-mobile`, false)
        await page.keyboard.press("Escape")
        await filters.locator("summary").click()
      } else {
        await capture(page, `navigation-${language}-desktop`, false)
      }
      const rankings = page.locator(".dashboard-bottom-grid > .top-products-card")
      const top = rankings.first()
      const lowest = rankings.last()
      const salesToggle = card => card.locator("details").first().locator("summary")
      const height = card => card.evaluate(element => element.getBoundingClientRect().height)
      const topExpanded = await height(top)
      const lowestExpanded = await height(lowest)
      await salesToggle(lowest).click()
      const lowestCollapsed = await height(lowest)
      assert.ok(lowestCollapsed < lowestExpanded, "Closing the right ranking shrinks its frame")
      assert.equal(await height(top), topExpanded)
      await salesToggle(lowest).click()
      await salesToggle(top).click()
      assert.ok(await height(top) < topExpanded, "Closing the left ranking shrinks its frame")
      assert.equal(await height(lowest), lowestExpanded)
      await salesToggle(top).click()
      await siteFilter.selectOption("10")
      assert.doesNotMatch(await filters.locator("summary").innerText(), /Second site/)
      assert.doesNotMatch(await page.locator(".dashboard-heading p").innerText(), /Second site/)
      await page.locator(".summary-forecast").first().waitFor()
      assert.ok(requests.some(url => url.pathname.endsWith("/summary") && url.searchParams.get("locationId") === "10"))
      await filters.locator("input[type=date]").first().fill("2026-10-01")
      await filters.locator("input[type=date]").last().fill("2026-10-31")
      await filters.getByRole("button", { name: copy.dashboardFilters.apply, exact: true }).click()
      await page.getByText(labels.noSales, { exact: true }).waitFor()
      assert.equal(await page.locator(".setup-guide, .forecast-toggle").count(), 0)
      assert.ok(requests.some(url => url.pathname.endsWith("/summary") && url.searchParams.get("endDate") === "2026-10-31"))
      await page.getByRole("heading", { name: copy.lowStockTable.title, exact: true }).waitFor()
      await capture(page, `empty-period-${language}-${device}`)
      await openPage(copy.sidebar.newSale)
      await page.getByRole("heading", { name: copy.newSalePage.title, exact: true }).waitFor()
      const saleSite = page.locator(".page-title-site-filter select")
      await saleSite.waitFor()
      assert.equal(await saleSite.inputValue(), "9")
      await saleSite.selectOption("10")
      await openPage(copy.sidebar.dashboard)
      assert.equal(await siteFilter.inputValue(), "10")
      await changeDefault("9")
      assert.equal(await siteFilter.inputValue(), "9")
      await openPage(copy.sidebar.newSale)
      await saleSite.waitFor()
      assert.equal(await saleSite.inputValue(), "9")
      await changeDefault("10")
      await page.waitForFunction(() => document.querySelector(".page-title-site-filter select")?.value === "10")
      await openPage(copy.sidebar.salesHistory)
      const historySite = page.locator(".page-title-site-filter select")
      await historySite.waitFor()
      assert.equal(await historySite.inputValue(), "10")
      await Promise.all([
        page.waitForResponse(response => {
          const url = new URL(response.url())
          return url.pathname === "/api/sales" && url.searchParams.get("locationId") === "9" && response.ok()
        }),
        historySite.selectOption("9"),
      ])
      for (const [label, target] of [
        [copy.sidebar.products, "products"], [copy.sidebar.inventory, "inventory"], [calendarCopy[language].settings, "settings"],
      ]) {
        await openPage(label)
        assert.equal(await page.locator(".internal-dashboard").count(), 0, target)
        assert.equal(await page.locator(".workspace-dashboard-content").count(), 0, target)
        await page.locator("main h1").waitFor()
        if (target === "settings") {
          await page.locator(".business-calendar").waitFor()
          await capture(page, `settings-${language}-${device}`)
        }
        if (target !== "products") {
          const pageSite = page.locator("main .workspace-page-site")
          await pageSite.waitFor()
          assert.equal(await pageSite.inputValue(), "10")
        }
        assert.equal(await page.locator("main").evaluate(node => node.scrollWidth <= node.clientWidth), true, target)
      }
      await openPage(copy.common.profile)
      await page.locator("#profile-account").waitFor()
      await capture(page, `profile-${language}-${device}`)
    }
    assert.deepEqual(errors, [])
    console.log("PASS workspace", language, width, firstUse ? "first use" : "populated, empty period, filters and navigation")
    await page.close()
  }
} finally { await browser.close() }
