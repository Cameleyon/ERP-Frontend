import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { mkdir } from "node:fs/promises"
import { messages } from "../src/i18n/messages.ts"
import { salesWorkspaceCopy } from "../src/components/sales/salesWorkspaceCopy.ts"

const { chromium } = createRequire(import.meta.url)("playwright")
const origin = process.env.SALES_PREVIEW_URL || "http://127.0.0.1:5248"
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) throw Error("Use a local preview")
const screenshots = process.env.SALES_SCREENSHOTS
if (screenshots) await mkdir(screenshots, { recursive: true })
const browser = await chromium.launch({ channel: "msedge", headless: true })

try {
  for (const [language, width, role, plan, operation] of [
    ["en", 1440, "ADMIN", "BASIC", "cancel"],
    ["fr", 390, "ADMIN", "STANDARD", "approve"],
    ["es", 320, "ADMIN", "STANDARD", "reject"],
    ["es", 320, "CASHIER", "STANDARD", "request"],
    ["fr", 390, "CASHIER", "BASIC", null],
  ]) {
    const context = await browser.newContext({ viewport: { width, height: 960 } })
    const page = await context.newPage()
    const errors = [], writes = [], reads = []
    page.on("pageerror", error => errors.push(error.message))
    const text = messages[language].salesHistoryPage, labels = salesWorkspaceCopy[language]
    const button = (name, root = page) => root.getByRole("button", { name, exact: true })
    const sale = { id: 11, saleNumber: "SALE-001024", locationId: 9, locationName: "Main site",
      soldAt: "2026-11-27T10:42:00", customerName: "Marie Pierre", customerEmail: "fixture@example.invalid",
      paymentMethod: "CREDIT_CARD", paymentReference: "TEST-12", subtotalAmount: 79, taxAmount: 7.9, totalAmount: 86.9,
      totalCostAmount: 61, totalProfitAmount: 18, status: "COMPLETED",
      cancellationRequestStatus: role === "ADMIN" && plan === "STANDARD" ? "PENDING" : null,
      items: [{ productId: 1, productName: "Jasmine rice", quantity: 2, unitName: "bag", unitPrice: 32, lineTotal: 64 },
        { productId: 2, productName: "Black beans", quantity: 1, unitName: "bag", unitPrice: 15, lineTotal: 15 }] }
    const entry = () => ({ ...sale, id: 91, saleId: sale.id, status: sale.cancellationRequestStatus,
      saleStatus: sale.status, requestedByName: "Fixture cashier" })
    const screenshot = async state => {
      if (screenshots) await page.screenshot({ path: `${screenshots}/${state}-${language}-${width}-${role}-${plan}.png` })
    }
    const checkOverflow = async () => assert.ok(await page.evaluate(() =>
      document.documentElement.scrollWidth <= innerWidth && document.querySelector(".sales-workspace").scrollWidth <= document.querySelector(".sales-workspace").clientWidth))
    await page.addInitScript(lang => {
      localStorage.setItem("camelyon_token", "local-sales-workspace")
      localStorage.setItem("cameleyon-ui-language", lang)
    }, language)
    await page.route("**/api/**", async route => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname
      if (!path.startsWith("/api/")) return route.continue()
      const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type" }
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers })
      const reply = json => route.fulfill({ json, headers })
      if (req.method() === "GET") reads.push(url)
      else writes.push(path)
      if (path === "/api/auth/me") return reply({ id: 7, role, companyId: 9, companyName: "Cameleyon Demo Store",
        companyCurrencyCode: "USD", companyTimeZoneId: "Etc/GMT+5", termsAccepted: true })
      if (path === "/api/company/subscription") return reply({ planCode: plan, invoiceEmailEnabled: plan === "STANDARD" })
      if (path === "/api/company/locations") return reply([{ id: 9, name: "Main site", active: true, primaryLocation: true },
        { id: 10, name: "Second site", active: true }])
      if (path === "/api/sales") return reply(url.searchParams.get("locationId") === "10" ? [] : [sale])
      if (path === "/api/sales/11") return reply(sale)
      if (path === "/api/sales/cancellation-requests") return reply(sale.cancellationRequestStatus === "PENDING" ? [entry()] : [])
      if (path === "/api/sales/11/cancel" || path.endsWith("/91/approve")) {
        sale.status = "CANCELLED"
        if (path.endsWith("/approve")) sale.cancellationRequestStatus = "APPROVED"
        return reply(path.endsWith("/approve") ? entry() : sale)
      }
      if (path === "/api/sales/11/cancellation-request") { sale.cancellationRequestStatus = "PENDING"; return reply(entry()) }
      if (path === "/api/sales/cancellation-requests/91/reject") { sale.cancellationRequestStatus = "REJECTED"; return reply(entry()) }
      throw Error("Unexpected isolated API " + path)
    })
    await page.goto(origin + "/tests/fixtures/sales-workspace.html?history")
    const view = button(text.viewDetails)
    await view.waitFor()
    await checkOverflow()
    await screenshot("sales-history")
    const site = page.locator(".page-title-site-filter select")
    await site.selectOption("10")
    await page.getByText(text.emptySales, { exact: true }).waitFor()
    await site.selectOption("9")
    await view.waitFor()
    assert.ok(reads.some(url => url.pathname === "/api/sales" && url.searchParams.get("locationId") === "10"))
    const dates = page.locator(".sales-filter-form input[type=date]")
    assert.equal(await dates.first().isDisabled(), role === "CASHIER")
    if (role === "CASHIER") assert.equal(await dates.first().inputValue(), await dates.last().inputValue())
    else {
      if (width < 769) await page.locator("details summary").click()
      await button(text.applyFilter).click()
      await view.waitFor()
    }
    await screenshot("history-table")
    await (role === "ADMIN" && plan === "STANDARD" ? button(labels.review) : view).click()
    await page.getByRole("heading", { name: sale.saleNumber, exact: true }).waitFor()
    await checkOverflow()
    assert.match(await page.locator(".sales-totals").innerText(), /79\.00[\s\S]*7\.90[\s\S]*86\.90/)
    assert.equal(await page.locator(".sale-invoice-actions .printable-invoice:visible").count(), 0)
    assert.equal(await page.locator(".sale-invoice-actions button").first().isDisabled(), plan === "BASIC")
    await screenshot("sale-details")
    assert.equal(await button(text.cancel).count(), role === "ADMIN" ? 1 : 0)
    assert.equal(await button(text.approveCancellation).count(), role === "ADMIN" && plan === "STANDARD" ? 1 : 0)
    assert.equal(await button(text.requestCancellation).count(), role === "CASHIER" && plan === "STANDARD" ? 1 : 0)
    if (operation) {
      const action = { cancel: text.cancel, request: text.requestCancellation, approve: text.approveCancellation, reject: text.rejectCancellation }[operation]
      await button(action).click()
      const dialog = page.getByRole("dialog")
      await dialog.waitFor()
      assert.match(await dialog.innerText(), /SALE-001024[\s\S]*Main site[\s\S]*86\.90/)
      await screenshot("confirmation-" + operation)
      await page.keyboard.press("Escape")
      await dialog.waitFor({ state: "hidden" })
      assert.deepEqual(writes, [])
      await button(action).click()
      const expectedPath = { cancel: "/api/sales/11/cancel", request: "/api/sales/11/cancellation-request",
        approve: "/api/sales/cancellation-requests/91/approve", reject: "/api/sales/cancellation-requests/91/reject" }[operation]
      await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === expectedPath && response.ok()),
        button(action, dialog).click()])
      await page.getByText({ cancel: text.cancelSuccess, request: text.cancellationRequestSuccess, approve: text.cancellationApproveSuccess,
        reject: text.cancellationRejectSuccess }[operation], { exact: true }).waitFor()
      assert.deepEqual(writes, [expectedPath])
      const status = messages[language].common[operation === "cancel" || operation === "approve" ? "statusCancelled" : "statusCompleted"]
      await page.locator(".stock-heading").getByText(status, { exact: true }).waitFor()
      if (operation === "request") await page.locator(".sales-layout").getByText(text.cancellationRequested, { exact: true }).waitFor()
      await screenshot("result-" + operation)
    }
    await button(labels.back).click()
    await view.waitFor()
    assert.deepEqual(errors, [])
    console.log("PASS", language, width, role, plan, operation || "restrictions", "site, history, details and recorded totals")
    await context.close()
  }
} finally { await browser.close() }
