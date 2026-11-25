import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { mkdir } from "node:fs/promises"
import { setupCopy } from "../src/i18n/setupCopy.ts"
import { messages } from "../src/i18n/messages.ts"
const { chromium } = createRequire(import.meta.url)("playwright")
const origin = process.env.PRODUCT_SEARCH_PREVIEW_URL || "http://127.0.0.1:5203"
const output = process.env.SETUP_SCREENSHOTS
const browser = await chromium.launch({ channel: "msedge", headless: true })
if (output) await mkdir(output, { recursive: true })
try {
  for (const [lang, width] of [["en", 1440], ["fr", 375], ["es", 320], ["es", 768]]) {
    const context = await browser.newContext({ viewport: { width, height: 950 } })
    const page = await context.newPage(), guide = setupCopy[lang], copy = messages[lang]
    const errors = [], writes = []
    let currency = null, product = null, stocked = false, sold = false, saveFailed = false, lookupFailed = false
    let fallback = false, refreshFailed = false
    const receiptAttempts = []
    const sites = [{ id: 9, name: "Main store", active: true, primaryLocation: true },
      { id: 10, name: "Second site", active: true, primaryLocation: false },
      { id: 11, name: "Retired", active: false, primaryLocation: false }]
    page.on("pageerror", error => errors.push(error.message))
    await page.addInitScript(language => {
      localStorage.setItem("camelyon_token", "local-test")
      localStorage.setItem("cameleyon-ui-language", language)
    }, lang)
    await page.route("**/api/**", async route => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname, method = req.method()
      if (!path.startsWith("/api/")) return route.continue()
      const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type, Idempotency-Key",
        "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS" }
      const reply = (json, status = 200) => route.fulfill({ status, headers, json })
      if (method === "OPTIONS") return route.fulfill({ status: 204, headers })
      if (path === "/api/auth/me") {
        if (refreshFailed) { refreshFailed = false; return reply({ message: "offline" }, 503) }
        return reply({ id: 5, companyId: 7, role: "ADMIN", termsAccepted: true, companyOwner: true,
          companyCurrencyCode: currency, companyTimeZoneId: "Etc/GMT+5", locations: sites, companyName: "Local test" })
      }
      if (path === "/api/dashboard/setup-status") return reply({
        hasCurrency: !!currency, hasProduct: !!product, hasActiveProduct: !!product?.active,
        hasRecordedStock: stocked, hasEverCompletedSale: sold, hasAccessibleSite: true,
        needsInventoryReview: false, openingStockTarget: product ? { productId: product.id } : null, saleSiteIds: stocked ? [10] : [],
      })
      if (path === "/api/dashboard/summary") return reply({ totalSales: 0, totalTax: 0, totalProfit: 0, totalCost: 0, totalTransactions: 0, lowStockProducts: 0, outOfStockProducts: 0 })
      if (path.startsWith("/api/dashboard/")) return reply([])
      if (path.startsWith("/api/forecasts/")) return reply({ status: "DISABLED" })
      if (path === "/api/company/subscription") return reply({ status: "ACTIVE", planCode: "BASIC", paymentProvider: "NONE" })
      if (path.startsWith("/api/company/locations")) return reply(sites)
      if (path === "/api/company/users" || path === "/api/customers") return reply([])
      if (path === "/api/auth/email-consent") return reply({ productUpdates: false })
      if (path === "/api/company/profile") {
        if (method === "PUT") {
          writes.push("profile")
          if (saveFailed) { saveFailed = false; return reply({ message: "Invalid test currency" }, 400) }
          currency = req.postDataJSON().currencyCode
          if (lang === "en" && fallback) refreshFailed = true
        }
        return reply({ companyId: 7, name: "Local test", active: true, currencyCode: currency, timeZoneId: "Etc/GMT+5" })
      }
      if (path === "/api/products" && method === "POST") {
        writes.push("product")
        if (!currency) return reply({ code: "COMPANY_CURRENCY_REQUIRED" }, 409)
        product = { ...req.postDataJSON(), id: 42, sku: "RIGHT-42", currentStock: 0 }
        return reply(product, 201)
      }
      if (path === "/api/products/42") return reply(product)
      if (path === "/api/products/sku/RIGHT-42") {
        if (lookupFailed) { lookupFailed = false; return reply({ message: "offline" }, 503) }
        return reply({ ...product, currentStock: Number(url.searchParams.get("locationId")) === 10 ? 6 : 0 })
      }
      if (path === "/api/products") return reply(product ? [{ ...product, id: 99, sku: "WRONG-99" }, product] : [])
      if (path === "/api/cost-rubrics") return reply([{ id: 1, code: "COST_OF_GOODS", name: "Purchase price", active: true }])
      if (path === "/api/inventory/receipts/active") return reply([])
      if (path === "/api/inventory/receipts" && method === "POST") {
        const draft = req.postDataJSON()
        assert.equal(draft.productId, 42)
        assert.equal(draft.locationId, 10)
        assert.equal(draft.costConfirmation.type, "ZERO_TOTAL")
        assert.ok(req.headers()["idempotency-key"])
        receiptAttempts.push({ draft, key: req.headers()["idempotency-key"] })
        if (lang === "en" && receiptAttempts.length === 1) return route.abort("connectionreset")
        writes.push("receipt")
        stocked = true
        return reply({ id: 77, productId: 42, locationId: 10 }, 201)
      }
      if (path === "/api/sales/product-lookup") return reply([])
      if (path === "/api/sales" && method === "POST") { writes.push("unexpected sale"); return reply({}, 500) }
      throw new Error("Unexpected mock request " + method + " " + path)
    })
    const named = name => page.getByRole("button", { name, exact: true })
    async function go(label) {
      if (await named(copy.common.menu).isVisible()) await named(copy.common.menu).click()
      await page.locator(".sidebar").getByRole("button", { name: label, exact: true }).click()
    }
    await page.goto(origin + "/")
    await named(guide.currency).waitFor()
    const card = page.getByRole("region", { name: guide.title })
    assert.equal(await card.evaluate(el => el.scrollWidth <= el.clientWidth), true)
    if (output) await card.screenshot({ path: `${output}/setup-${lang}-${width}.png` })
    await named(guide.hide).click()
    await page.reload()
    await named(guide.show).click()
    await named(guide.currency).click()
    const currencyInput = page.locator('input[aria-describedby="setup-currency-reason"]')
    await currencyInput.waitFor()
    await page.waitForFunction(() => document.activeElement?.id === document.querySelector('input[aria-describedby="setup-currency-reason"]')?.id
      && document.activeElement?.getAttribute("aria-describedby") === "setup-currency-reason")
    await currencyInput.fill("USD")
    const profileSave = page.locator(".profile-section").filter({ has: currencyInput }).locator('button[type=submit]')
    saveFailed = true
    await profileSave.click()
    await page.getByRole("alertdialog").waitFor()
    await page.keyboard.press("Escape")
    assert.equal(await named(guide.back).count(), 0)
    await profileSave.click()
    await named(guide.back).click()
    await named(guide.product).click()
    const name = page.getByRole("textbox", { name: guide.name, exact: true })
    await name.waitFor()
    assert.equal(await name.evaluate(el => document.activeElement === el), true)
    await name.fill("Coffee")
    await page.getByRole("combobox", { name: copy.productsPage.unit, exact: true }).fill("kg")
    await page.getByRole("spinbutton", { name: new RegExp(guide.price) }).fill("12")
    await named(guide.options).click()
    const barcode = page.locator("#product-barcode")
    await barcode.fill("123")
    if (lang === "en") {
      fallback = true
      currency = null
      await named(copy.productsPage.create).click()
      await named(guide.currency).click()
      await currencyInput.fill("USD")
      await profileSave.click()
      await page.getByText(guide.refreshSession, { exact: true }).waitFor()
      await named(guide.retry).click()
      await named(guide.resume).click()
      assert.equal(await name.inputValue(), "Coffee")
      assert.equal(await barcode.inputValue(), "123")
    }
    await named(copy.productsPage.create).click()
    await named(guide.opening).waitFor()
    const dialog = page.getByRole("dialog")
    assert.equal(await dialog.getByRole("heading", { name: guide.created }).count(), 1)
    assert.equal(await dialog.getByRole("button", { name: guide.opening, exact: true })
      .evaluate(button => document.activeElement === button), true)
    if (output) await dialog.screenshot({ path: `${output}/created-${lang}-${width}.png` })
    lookupFailed = true
    if (lang === "en") {
      await dialog.getByRole("button", { name: guide.opening, exact: true }).click()
    } else {
      await page.keyboard.press("Escape")
      await dialog.waitFor({ state: "detached" })
      assert.equal(writes.includes("receipt"), false)
      await go(copy.sidebar.dashboard)
      await named(guide.opening).click()
    }
    await page.getByText(guide.unavailable, { exact: true }).waitFor()
    await named(guide.retry).click()
    const site = page.getByRole("combobox", { name: guide.site, exact: true })
    await named(copy.inventoryPage.receiveStock).waitFor()
    await page.getByRole("spinbutton", { name: copy.inventoryPage.receivedQuantity, exact: true }).fill("2")
    await site.selectOption("10")
    await page.getByRole("dialog").getByRole("button", { name: guide.switchSite }).click()
    await page.getByText("RIGHT-42", { exact: false }).last().waitFor()
    await named(copy.inventoryPage.receiveStock).click()
    await named(copy.inventoryPage.confirmCosts).click()
    if (lang === "en") {
      await page.getByRole("alertdialog").getByText(copy.inventoryPage.receiptOutcomeUnknown, { exact: true }).waitFor()
      await page.keyboard.press("Escape")
      await go(copy.sidebar.dashboard)
      await named(guide.opening).click()
      await named(copy.inventoryPage.retryReceipt).click()
      await page.getByText(copy.inventoryPage.receiptSuccess(77), { exact: true }).waitFor()
      assert.deepEqual(receiptAttempts[1], receiptAttempts[0])
    }
    await page.getByText(copy.inventoryPage.receiptSuccess(77), { exact: true }).waitFor()
    await go(copy.sidebar.dashboard)
    await named(guide.sale).click()
    await page.getByRole("heading", { name: copy.newSalePage.title, exact: true }).waitFor()
    assert.equal(await page.locator(".page-title-site-filter select").inputValue(), "10")
    assert.equal(writes.includes("unexpected sale"), false)
    sold = true
    const checked = page.waitForResponse(response => response.url().includes("/dashboard/setup-status"))
    await go(copy.sidebar.dashboard)
    await checked
    assert.equal(await card.count(), 0)
    assert.equal(await named(guide.show).count(), 0)
    assert.deepEqual(errors, [])
    console.log("PASS", lang, width, "setup, modal, opening stock and first sale")
    await context.close()
  }
} finally { await browser.close() }
