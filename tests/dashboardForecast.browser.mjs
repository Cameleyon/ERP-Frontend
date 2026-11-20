import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { mkdir } from "node:fs/promises"
import { actualFixture, forecastFixture, today } from "./fixtures/forecast-data.mjs"
import { demoSites, demoUser, summaryFixture } from "./fixtures/forecast-demo.mjs"
const { chromium } = createRequire(import.meta.url)("playwright")
const origin = process.env.FORECAST_PREVIEW_URL || "http://127.0.0.1:5203"
const screenshots = process.env.FORECAST_SCREENSHOT_DIR || "docs/screenshots/phase4"
await mkdir(screenshots, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: "msedge" })
const words = {
  en: { title: "Dashboard", period: "Filters", week: "This week's forecast", daily: "Today's forecast", show: "Show forecast", apply: "Apply", site: "Site", provisional: "Provisional forecast" },
  fr: { title: "Tableau de bord", period: "Filtres", week: "Prévision de la semaine", daily: "Prévision du jour", show: "Afficher les prévisions", apply: "Appliquer", site: "Site", provisional: "Prévision provisoire" },
  es: { title: "Panel", period: "Filtros", week: "Previsión de esta semana", daily: "Previsión de hoy", show: "Mostrar previsiones", apply: "Aplicar", site: "Sitio", provisional: "Previsión provisional" },
}
async function setup({ language = "en", width = 1440, mode = "available", role = "ADMIN", delay = false, currency = "USD", productRows = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 1100 }, timezoneId: "Asia/Tokyo" })
  const page = await context.newPage()
  await page.clock.install({ time: new Date("2026-11-25T17:00:00Z") })
  await page.addInitScript(lang => { localStorage.setItem("camelyon_token", "isolated-dashboard-test"); localStorage.setItem("cameleyon-ui-language", lang) }, language)
  const state = { mode, requests: [], held: [], errors: [], delay, delayedSites: new Set(), currency }
  page.on("pageerror", error => state.errors.push(error.message))
  await page.route("**/api/**", async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname
    if (!path.startsWith("/api/")) return route.continue()
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, OPTIONS" }
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers })
    assert.equal(request.method(), "GET", "dashboard must never trigger generation")
    let body = [], status = 200
    if (path === "/api/auth/me") body = { ...demoUser, role, companyCurrencyCode: currency }
    else if (path === "/api/company/locations") body = demoSites
    else if (path === "/api/dashboard/summary") body = summaryFixture
    else if (path === "/api/dashboard/sales-trend") body = actualFixture
    else if (path === "/api/dashboard/top-products" && productRows) body = [{ productId: 1, productName: "Test product", sku: "TEST", totalQuantitySold: 3, totalSalesAmount: 150, totalProfitAmount: 35 }]
    else if (path === "/api/forecasts/weekly/current") {
      const id = url.searchParams.get("locationId")
      state.requests.push({ id, cache: request.headers()["cache-control"] })
      if (state.delay || state.delayedSites.has(id)) await new Promise(resolve => state.held.push(resolve))
      if (state.mode === "failure" || state.mode === "unauthorized") { status = state.mode === "failure" ? 503 : 403; body = { code: "DO_NOT_SHOW_RAW_INTERNAL_ERROR" } }
      else {
        body = forecastFixture(id ? [Number(id)] : [9, 10], state.mode)
        body.scope = id ? "SITE" : "COMPANY"; body.currency = state.currency
        if (state.mode === "foreign") body.siteIds = [999]
      }
    }
    await route.fulfill({ status, contentType: "application/json", headers, body: JSON.stringify(body) })
  })
  await page.goto(origin + "/tests/fixtures/dashboard-forecast.html")
  try { await page.getByRole("heading", { name: words[language].title, exact: true }).waitFor({ timeout: 15_000 }) }
  catch (error) { console.log("SETUP_FAILURE", state.errors, await page.locator("body").innerText()); throw error }
  await page.locator(".summary-card").first().waitFor()
  return { page, state, context, language }
}
async function applyPeriod(test, value) {
  await test.page.getByLabel(words[test.language].period, { exact: true }).selectOption(value)
  await test.page.getByRole("button", { name: words[test.language].apply, exact: true }).click()
  await test.page.locator(".summary-card").first().waitFor()
}
async function verifyLayout(test, name) {
  const { page, state } = test
  assert.equal(await page.locator(".summary-card").count(), 7)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, name + " page overflow")
  const clipping = await page.locator(".summary-card, .summary-forecast, .sales-trend-card, .forecast-toggle").evaluateAll(nodes => nodes.filter(node => node.scrollWidth > node.clientWidth + 1).length)
  assert.equal(clipping, 0, name + " component clipping")
  assert.deepEqual(state.errors, [])
  await page.screenshot({ path: `${screenshots}/${name}.png`, fullPage: true })
}
async function close(test) { test.state.held.splice(0).forEach(resolve => resolve()); await test.context.close() }
try {
  for (const language of ["en", "fr", "es"]) {
    const t = await setup({ language, width: language === "en" ? 1440 : 390 })
    // Monthly amounts stay monthly; chart includes only overlapping dates.
    await t.page.getByRole("checkbox", { name: words[language].show }).waitFor()
    assert.equal(await t.page.locator(".summary-forecast").count(), 0)
    assert.equal(t.state.requests.length, 1)
    await verifyLayout(t, `monthly-${language}`)
    await applyPeriod(t, "this-week")
    await t.page.getByText(words[language].week, { exact: true }).first().waitFor()
    assert.equal(await t.page.locator(".summary-forecast").count(), 2)
    assert.equal(t.state.requests.length, 1, "date changes reuse bounded current-scope data")
    const paths = await t.page.locator("path.recharts-line-curve[stroke-dasharray='6 4']").count()
    assert.equal(paths, 2)
    assert.ok(await t.page.locator(".summary-forecast-profit .summary-forecast-value").textContent().then(text => text.includes("-")))
    await verifyLayout(t, `weekly-${language}`)
    if (language === "en") {
      const dot = t.page.locator("circle[stroke='#2563eb']").nth(2)
      await dot.hover({ force: true })
      await t.page.locator(".forecast-chart-tooltip").filter({ hasText: "Today’s recorded values are incomplete." }).waitFor()
      const tooltip = await t.page.locator(".forecast-chart-tooltip").textContent()
      assert.ok(tooltip.includes("Forecasted sales")); assert.ok(tooltip.includes("Cost")); assert.ok(tooltip.includes("-USD\u00a010.00"))
      await t.page.screenshot({ path: `${screenshots}/weekly-current-day-tooltip.png`, fullPage: true })
      const future = t.page.locator("circle[stroke='#2563eb']").last()
      await future.hover({ force: true })
      await t.page.locator(".forecast-chart-tooltip").filter({ hasText: "Nov 29" }).waitFor()
      const futureTooltip = await t.page.locator(".forecast-chart-tooltip").textContent()
      assert.ok(!futureTooltip.includes("Cost:")); assert.ok(!futureTooltip.includes("incomplete"))
    }
    // Toggle is keyboard-accessible and does not alter KPI values or request data.
    const before = await t.page.locator(".summary-grid").textContent()
    const toggle = t.page.getByRole("checkbox", { name: words[language].show })
    await toggle.focus(); await t.page.keyboard.press("Space")
    assert.equal(await t.page.locator("path.recharts-line-curve[stroke-dasharray='6 4']").count(), 0)
    assert.equal(await t.page.locator(".summary-grid").textContent(), before)
    assert.equal(t.state.requests.length, 1)
    await verifyLayout(t, `hidden-${language}`)
    await toggle.check()
    await applyPeriod(t, "today")
    assert.equal(await t.page.getByText(words[language].daily, { exact: true }).count(), 2)
    assert.equal(t.state.requests.length, 1)
    if (language === "en") {
      // Language changes reformat values without refetching.
      await t.page.getByRole("button", { name: "FR", exact: true }).click()
      await t.page.getByText(words.fr.daily, { exact: true }).first().waitFor()
      assert.equal(t.state.requests.length, 1)
    }
    await close(t)
  }
  const mobileEn = await setup({ width: 320 })
  await applyPeriod(mobileEn, "this-week")
  await mobileEn.page.locator(".summary-forecast").first().waitFor()
  await verifyLayout(mobileEn, "weekly-en-mobile-320")
  await close(mobileEn)

  for (const [mode, label] of [["provisional", "limited sales history"], ["insufficient", "insufficient data"], ["pending", "being prepared"],
    ["deferred", "being prepared"], ["no-sales", "insufficient data"], ["stale", "Forecasts are not available."],
    ["partial", "covering all selected sites"], ["failure", "Forecasts are not available."], ["unauthorized", "Forecasts are not available."], ["foreign", "Forecasts are not available."]]) {
    const t = await setup({ mode }); await applyPeriod(t, "this-week")
    await t.page.locator(".forecast-notice").filter({ hasText: label }).waitFor()
    const count = await t.page.locator(".summary-forecast").count()
    assert.equal(count, mode === "provisional" ? 2 : mode === "partial" ? 1 : 0, mode)
    assert.equal(await t.page.getByText("DO_NOT_SHOW_RAW_INTERNAL_ERROR").count(), 0)
    await verifyLayout(t, mode)
    await close(t)
  }
  const disabled = await setup({ mode: "disabled" })
  await applyPeriod(disabled, "this-week")
  await disabled.page.waitForTimeout(50)
  assert.equal(await disabled.page.locator(".forecast-notice, .summary-forecast, .forecast-toggle").count(), 0)
  await close(disabled)

  const historical = await setup()
  await historical.page.locator("input[type=date]").nth(0).fill("2026-10-01")
  await historical.page.locator("input[type=date]").nth(1).fill("2026-10-31")
  await historical.page.getByRole("button", { name: "Apply", exact: true }).click()
  await historical.page.locator(".summary-card").first().waitFor()
  assert.equal(await historical.page.locator(".summary-forecast, .forecast-toggle").count(), 0)
  await verifyLayout(historical, "historical")
  await close(historical)

  const slow = await setup({ delay: true })
  assert.equal(await slow.page.locator(".summary-value").first().textContent(), "USD\u00a0150.00")
  await slow.page.getByText("Loading forecast…", { exact: true }).waitFor()
  slow.state.delay = false; slow.state.held.splice(0).forEach(resolve => resolve())
  await slow.page.getByRole("checkbox", { name: "Show forecast" }).waitFor()
  await applyPeriod(slow, "this-week")
  // Old site's delayed response must never overwrite the new site's results.
  slow.state.delayedSites.add("9")
  await slow.page.getByLabel("Site", { exact: true }).selectOption("9")
  await slow.page.waitForFunction(() => document.querySelector(".forecast-notice")?.textContent.includes("Loading"))
  await slow.page.getByLabel("Site", { exact: true }).selectOption("10")
  await slow.page.locator(".summary-forecast").first().waitFor()
  assert.equal(await slow.page.locator(".summary-forecast-sales .summary-forecast-value").textContent(), "USD\u00a0710.00")
  slow.state.held.splice(0).forEach(resolve => resolve())
  await slow.page.waitForTimeout(100)
  assert.equal(await slow.page.locator(".summary-forecast-sales .summary-forecast-value").textContent(), "USD\u00a0710.00")
  await verifyLayout(slow, "site10-after-obsolete-response")
  // TTL revalidation removes invalidated numbers.
  slow.state.mode = "stale"
  await slow.page.clock.runFor(61_000)
  await slow.page.getByText("Forecasts are not available.", { exact: true }).waitFor()
  assert.equal(await slow.page.locator(".summary-forecast").count(), 0)
  await close(slow)

  const cashier = await setup({ role: "CASHIER" })
  await applyPeriod(cashier, "this-week")
  assert.equal(cashier.state.requests.length, 0)
  assert.equal(await cashier.page.locator(".summary-card").count(), 7)
  await close(cashier)
  const custom = await setup()
  await custom.page.locator("input[type=date]").nth(0).fill("2026-11-23")
  await custom.page.locator("input[type=date]").nth(1).fill("2026-11-29")
  await custom.page.getByRole("button", { name: "Apply", exact: true }).click()
  await custom.page.getByText("This week's forecast", { exact: true }).first().waitFor()
  assert.equal(custom.state.requests.length, 1)
  await custom.page.locator("input[type=date]").nth(0).fill("2026-11-24")
  await custom.page.locator("input[type=date]").nth(1).fill("2026-11-26")
  await custom.page.getByRole("button", { name: "Apply", exact: true }).click()
  await custom.page.locator(".summary-card").first().waitFor()
  assert.equal(await custom.page.locator(".summary-forecast").count(), 0)
  assert.equal(custom.state.requests.length, 1)
  await verifyLayout(custom, "custom-overlap")
  await close(custom)
  const alternateCurrency = await setup({ currency: "HTG", language: "fr", width: 390 })
  await applyPeriod(alternateCurrency, "this-week")
  await alternateCurrency.page.locator(".summary-forecast").first().waitFor()
  assert.ok((await alternateCurrency.page.locator(".summary-forecast-sales").textContent()).includes("HTG"))
  await verifyLayout(alternateCurrency, "weekly-fr-htg")
  await close(alternateCurrency)
  for (const [language, amount] of [["en", "CAD\u00a0150.00"], ["fr", "150,00\u00a0CAD"], ["es", "150,00\u00a0CAD"]]) {
    const cad = await setup({ language, currency: "CAD", width: 390, productRows: true })
    await applyPeriod(cad, "this-week")
    await cad.page.locator(".summary-forecast").first().waitFor()
    assert.equal(await cad.page.locator(".summary-value").first().textContent(), amount)
    assert.equal(await cad.page.locator(".top-products-card").first().getByText(amount, { exact: true }).count(), 2)
    assert.equal(await cad.page.locator(".top-products-card").last().getByText(amount, { exact: true }).count(), 2)
    await verifyLayout(cad, `currency-cad-${language}-mobile`)
    await close(cad)
  }
  const zeros = await setup({ mode: "zero" })
  await applyPeriod(zeros, "this-week")
  await zeros.page.locator(".summary-forecast").first().waitFor()
  assert.equal(await zeros.page.locator(".summary-forecast-sales .summary-forecast-value").textContent(), "USD\u00a00.00")
  assert.equal(await zeros.page.locator(".summary-forecast-profit .summary-forecast-value").textContent(), "USD\u00a00.00")
  await verifyLayout(zeros, "zero-forecasts")
  await close(zeros)
  const transition = await setup()
  await applyPeriod(transition, "this-week")
  await transition.page.locator(".summary-forecast").first().waitFor()
  await transition.page.clock.setSystemTime(new Date("2026-11-30T17:00:00Z"))
  await transition.page.clock.runFor(30_001)
  await transition.page.getByText("Forecasts are not available.", { exact: true }).waitFor()
  assert.equal(await transition.page.locator("input[type=date]").first().inputValue(), "2026-11-30")
  assert.equal(await transition.page.locator(".summary-forecast").count(), 0)
  assert.ok(transition.state.requests.length >= 2)
  await close(transition)
  const demoContext = await browser.newContext({ viewport: { width: 1200, height: 1000 } })
  const demoPage = await demoContext.newPage()
  await demoPage.addInitScript(() => localStorage.setItem("camelyon_token", "preserved-existing-test-session"))
  const demoApiRequests = []
  demoPage.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) demoApiRequests.push(request.url()) })
  await demoPage.goto(origin + "/tests/fixtures/dashboard-forecast.html?demo=1")
  await demoPage.locator(".summary-card").first().waitFor()
  await demoPage.getByRole("checkbox", { name: "Show forecast" }).waitFor()
  assert.equal(demoApiRequests.length, 0, "manual demo must never contact a backend")
  const stored = await demoContext.storageState()
  assert.equal(stored.origins.find(entry => entry.origin === origin).localStorage.find(entry => entry.name === "camelyon_token").value, "preserved-existing-test-session")
  await demoContext.close()
  console.log("PASS: forecast dashboard browser scenarios, localization, async scope isolation, TTL, responsive layout, read-only requests")
} finally { await browser.close() }
