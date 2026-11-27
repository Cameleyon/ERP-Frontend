import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { mkdir } from "node:fs/promises"
import { messages } from "../src/i18n/messages.ts"
import { formatReceiptDateTime } from "../src/utils/format.ts"
import { receiptErrorMessage } from "../src/i18n/inventoryReceiptMessages.ts"
const { chromium } = createRequire(import.meta.url)("playwright")
const origin = process.env.PRODUCT_SEARCH_PREVIEW_URL || "http://127.0.0.1:5203"
const screenshots = process.env.PRODUCT_SEARCH_SCREENSHOTS || "docs/screenshots/product-search"
const inventory = process.env.PRODUCT_SEARCH_MODE === "inventory"
const lookupPath = inventory ? "/api/products" : "/api/sales/product-lookup"
await mkdir(screenshots, { recursive: true })
const browser = await chromium.launch({ channel: "msedge", headless: true })
const products = [
  { id: 1, sku: "CAFE-A", name: "Café moulu", active: true },
  { id: 2, sku: "CAFE-B", name: "Café moulu", active: true },
  { id: 3, sku: "RETIRED", name: "Café retiré", active: false },
].map(p => ({ ...p, barcode: p.id === 1 ? "1234567890" : null, unitPrice: 5, costPrice: 2, currentStock: 10, minimumStock: 1,
  unitName: "Unit", quantityType: inventory && p.id === 1 ? "DECIMAL" : "INTEGER", description: "", category: "", priceTiers: [] }))
const labels = { en: "Product name, barcode or SKU", fr: "Nom du produit, code-barres ou SKU", es: "Nombre del producto, código de barras o SKU" }

try {
  for (const [language, width] of [["en", 1440], ["fr", 375], ["es", 768]]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, timezoneId: "America/Los_Angeles" })
    const page = await context.newPage(), requests = [], errors = []
    let mismatch = false
    let receiptResult
    let failReceiptRefresh = false
    let patchStatus = 400
    const submissions = []
    page.on("pageerror", e => errors.push(e.message))
    await page.addInitScript(lang => {
      localStorage.setItem("camelyon_token", "isolated-product-search")
      localStorage.setItem("cameleyon-ui-language", lang)
    }, language)
    await page.route("**/api/**", async route => {
      const request = route.request(), url = new URL(request.url())
      if (!url.pathname.startsWith("/api/")) return route.continue()
      const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type, Idempotency-Key",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS" }
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers })
      if (inventory && url.pathname === "/api/inventory/receipts") {
        assert.equal(request.method(), "POST")
        assert.ok(receiptResult)
        const key = request.headers()["idempotency-key"], body = request.postDataJSON()
        assert.match(key, /^[a-f\d-]{36}$/i)
        submissions.push({ key, body })
        if (receiptResult === "lost") {
          await new Promise(resolve => setTimeout(resolve, 250))
          return route.abort("connectionreset")
        }
        if (receiptResult === "saved") {
          return route.fulfill({ status: 201, headers, json: { id: 42, productId: body.productId, locationId: body.locationId } })
        }
        return route.fulfill({ ...receiptResult, headers })
      }
      if (inventory && url.pathname === "/api/inventory/receipts/1/quantity") {
        assert.equal(request.method(), "PATCH")
        assert.deepEqual(request.postDataJSON(), { receivedQuantity: 8 })
        return route.fulfill({ status: patchStatus, headers, json: { code: patchStatus === 400 ? "RECEIPT_QUANTITY_HISTORY_LOCKED" : "UNRECOGNIZED",
          message: "private SQL diagnostic" } })
      }
      assert.equal(request.method(), "GET", "search and cart must not create sales")
      requests.push(url.pathname + url.search)
      let body
      if (url.pathname === "/api/auth/me") body = { id: 8, companyId: 7, role: inventory ? "ADMIN" : "CASHIER",
        email: "test@example.invalid", firstName: "Test", lastName: "Owner", companyOwner: true }
      else if (url.pathname === "/api/customers") body = []
      else if (url.pathname === "/api/cost-rubrics") body = [
        { id: 1, code: "COST_OF_GOODS", name: "Purchase price", active: true, displayOrder: 0 },
        { id: 2, code: "TRANSPORT", name: "Transportation and delivery", active: true, displayOrder: 10 },
        { id: 3, code: "HANDLING", name: "Handling", active: true, displayOrder: 20 },
        { id: 4, code: "STORAGE", name: "Inactive cost", active: false, displayOrder: 30 },
      ]
      else if (url.pathname === "/api/inventory/receipts/active" && failReceiptRefresh) {
        return route.fulfill({ status: 503, headers, json: { message: "List test failure" } })
      } else if (url.pathname === "/api/inventory/receipts/active") body = [{
        id: 1, productName: "Test receipt", receivedQuantity: 10, remainingQuantity: 6,
        totalCostAmount: 100, lastAction: "CREATION", createdAt: "2026-11-23T10:00:00", quantityType: "DECIMAL",
        receivedAtInstant: "2026-04-04T14:30:00Z", receivedAtZoneId: "Pacific/Auckland",
      }, { id: 2, productName: "Legacy receipt", receivedQuantity: 8, remainingQuantity: 8, totalCostAmount: 85,
        lastAction: "CREATION", createdAt: "2026-03-08T02:30:00", quantityType: "INTEGER" }]
      else if (url.pathname === "/api/company/locations") body = [
        { id: 9, name: "Site A", active: true, primaryLocation: true },
        { id: 10, name: "Site B", active: true, primaryLocation: false },
      ]
      else if (url.pathname === lookupPath) body = products
      else if (url.pathname.startsWith(lookupPath + "/barcode/") || url.pathname.startsWith(lookupPath + "/sku/")) {
        body = products.find(p => p.sku === decodeURIComponent(url.pathname.split("/").at(-1)))
        assert.ok(body)
        if (mismatch) body = products[0]
      } else throw Error("Unexpected API " + url.pathname)
      await route.fulfill({ json: body, headers })
    })
    await page.goto(origin + "/tests/fixtures/product-name-" + (inventory ? "inventory" : "sale") + ".html")
    const input = page.getByRole("combobox", { name: labels[language] })
    assert.equal(await page.locator(".product-lookup-card input").count(), 1)
    assert.equal(await page.locator(".product-lookup-card button[type=submit]").count(), 0)
    await input.fill("cafe")
    const options = page.getByRole("listbox").getByRole("option")
    await options.first().waitFor()
    assert.equal(await options.count(), 2)
    assert.equal(await options.first().evaluate(element => {
      const rect = element.getBoundingClientRect()
      return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2))
    }), true, "suggestions must not be clipped or hidden behind the cart")
    await page.screenshot({ path: screenshots + "/" + language + "-" + width + ".png", fullPage: true })
    await input.press("ArrowDown")
    await input.press("ArrowDown")
    await input.press("Enter")
    await page.waitForFunction(() => document.body.textContent.includes("CAFE-B") && document.body.textContent.includes("Café moulu"))
    await page.waitForTimeout(150)
    assert.ok(requests.includes(lookupPath + "/sku/CAFE-B?locationId=9"))
    assert.equal(await input.inputValue(), "Café moulu")
    assert.equal(await options.count(), 0)
    const site = page.locator(inventory ? ".stock-heading .workspace-page-site" : ".page-title-site-filter select")
    await site.selectOption("10")
    await input.fill("moulu")
    await options.first().click()
    await page.waitForTimeout(150)
    assert.ok(requests.includes(lookupPath + "/sku/CAFE-A?locationId=10"))
    if (inventory) await page.locator("#receipt-cost-1").fill("25")
    await input.fill("CAFE-B")
    assert.equal(await page.locator(inventory ? ".stock-context" : "p").filter({ hasText: inventory ? /CAFE-A/ : /^SKU:/ }).count(), 0, "editing must clear the old selection")
    await options.first().click()
    await page.waitForTimeout(150)
    assert.ok(requests.includes(lookupPath + "/sku/CAFE-B?locationId=10"))
    assert.equal(await input.inputValue(), "Café moulu")
    if (inventory) assert.equal(await page.locator("#receipt-cost-1").inputValue(), "", "draft costs must not transfer to another product")
    await input.fill("1234567890")
    await options.first().waitFor()
    await input.press("Enter")
    await page.waitForFunction(() => document.querySelector('[role="combobox"]').value === "Café moulu")
    assert.ok(requests.includes(lookupPath + "/sku/CAFE-A?locationId=10"))
    await input.fill("no matching product")
    await page.getByRole("status").waitFor()
    assert.equal(await options.count(), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    mismatch = true
    await input.fill("CAFE-B")
    await options.first().click()
    const lookupError = inventory
      ? ({ en: "Lookup failed", fr: "Échec de la recherche", es: "La búsqueda falló" })[language]
      : ({ en: "Lookup failed", fr: "La recherche a échoué", es: "La búsqueda falló" })[language]
    await page.getByText(lookupError, { exact: true }).waitFor()
    assert.equal(await page.locator(inventory ? ".stock-context" : "p").filter({ hasText: inventory ? /CAFE-B/ : /^SKU:/ }).count(), 0, "a mismatched product must never be selected")
    if (inventory) {
      const copy = messages[language].inventoryPage
      await page.keyboard.press("Escape")
      await page.locator(".stock-view-switch").getByRole("button", { name: copy.activeReceipts, exact: true }).click()
      const table = page.locator(".inventory-open-receipts")
      const verified = table.getByRole("row").filter({ hasText: "Test receipt" })
      const legacy = table.getByRole("row").filter({ hasText: "Legacy receipt" })
      const locale = { en: "en-CA", fr: "fr-CA", es: "es" }[language]
      await verified.getByText(formatReceiptDateTime("2026-04-04T14:30:00Z", locale, "Pacific/Auckland"), { exact: true }).waitFor()
      assert.ok((await legacy.innerText()).includes(copy.receiptZoneUnverified))
      const precisionQuantity = receiptErrorMessage("INVALID_INVENTORY_QUANTITY_PRECISION", language, "")
      await verified.getByRole("button", { name: copy.withdraw, exact: true }).click()
      await verified.getByRole("spinbutton").fill("0.005")
      await verified.getByRole("button", { name: copy.confirm, exact: true }).click()
      await verified.getByRole("alert").filter({ hasText: precisionQuantity }).waitFor()
      await verified.getByRole("button", { name: copy.cancel, exact: true }).click()
      await verified.getByRole("button", { name: copy.edit, exact: true }).click()
      await table.getByRole("spinbutton").fill("8.005")
      await table.getByRole("button", { name: copy.save, exact: true }).click()
      await verified.getByRole("alert").filter({ hasText: precisionQuantity }).waitFor()
      await table.getByRole("spinbutton").fill("8")
      await table.getByRole("button", { name: copy.save, exact: true }).click()
      const alert = page.getByRole("alertdialog")
      await alert.getByText(copy.receiptQuantityHistoryLocked, { exact: true }).waitFor()
      assert.ok(!(await alert.innerText()).includes("private SQL diagnostic"))
      await page.keyboard.press("Escape")
      for (const [status, label] of [[403, receiptErrorMessage("RECEIPT_ACCESS_DENIED", language, "")], [500, copy.receiptUpdateError]]) {
        patchStatus = status
        await table.getByRole("button", { name: copy.save, exact: true }).click()
        await alert.getByText(label, { exact: true }).waitFor()
        assert.ok(!(await alert.innerText()).includes("private SQL diagnostic"))
        await page.keyboard.press("Escape")
      }
      mismatch = false
      await page.locator(".stock-view-switch button").first().click()
      await input.fill("CAFE-A")
      await options.first().click()
      const cost = page.locator("#receipt-cost-1")
      const transport = page.locator("#receipt-cost-2")
      const additional = page.locator("#receipt-cost-3")
      const quantity = page.locator("#receipt-quantity")
      const receive = page.getByRole("button", { name: copy.receiveStock, exact: true })
      const precisionCost = receiptErrorMessage("INVALID_RECEIPT_COST_PRECISION", language, "")
      for (const invalid of ["1.234", "0.005", "0.0049"]) {
        await quantity.fill(invalid)
        await receive.click()
        await page.getByRole("alert").filter({ hasText: precisionQuantity }).waitFor()
        assert.equal(await quantity.inputValue(), invalid)
        assert.equal(await quantity.getAttribute("aria-invalid"), "true")
        assert.equal(await page.getByRole("dialog").count(), 0)
        assert.equal(submissions.length, 0)
      }
      await quantity.fill("1.2500")
      await cost.fill("25")
      await page.getByRole("button", { name: copy.showMoreCosts }).click()
      await additional.fill("0.000049")
      await page.getByRole("button", { name: copy.hideMoreCosts }).click()
      await receive.click()
      await page.locator("#receipt-cost-3-error").waitFor()
      assert.equal(await page.locator("#receipt-cost-3-error").innerText(), precisionCost)
      assert.equal(await additional.inputValue(), "0.000049")
      assert.equal(await additional.getAttribute("aria-invalid"), "true")
      assert.equal(await page.getByRole("button", { name: copy.hideMoreCosts }).getAttribute("aria-expanded"), "true")
      assert.equal(await page.getByRole("dialog").count(), 0)
      assert.equal(submissions.length, 0)
      await cost.fill("25")
      await transport.fill("5")
      await additional.fill("3")
      await page.getByRole("button", { name: copy.hideMoreCosts }).click()
      assert.equal(await additional.isVisible(), true, "filled additional costs remain visible")
      assert.equal(await page.locator("#receipt-cost-4").count(), 0)
      const retry = page.getByRole("button", { name: copy.retryReceipt, exact: true })
      for (const [code, message] of [
        ["DUPLICATE_RECEIPT_COST_RUBRIC", copy.duplicateReceiptCostRubric],
        ["INACTIVE_RECEIPT_PRODUCT", copy.inactiveReceiptProduct],
      ]) {
        receiptResult = { status: 400, json: { code, message: "Internal test detail", operationRejected: true } }
        await receive.click()
        await alert.getByText(message, { exact: true }).waitFor()
        assert.ok(!(await alert.innerText()).includes("Internal test detail"))
        await page.keyboard.press("Escape")
        assert.equal(await cost.inputValue(), "25")
      }
      await cost.fill("27")
      receiptResult = "lost"
      await receive.evaluate(button => { button.click(); button.click() })
      await alert.getByText(copy.receiptOutcomeUnknown, { exact: true }).waitFor()
      assert.equal(submissions.length, 3, "a double click sends only one request")
      assert.equal(new Set(submissions.map(x => x.key)).size, 3, "definitive rejections release their keys")
      assert.deepEqual(submissions[2].body.costLines, [
        { companyCostRubricId: 1, amount: "27" }, { companyCostRubricId: 2, amount: "5" },
        { companyCostRubricId: 3, amount: "3" },
      ])
      assert.equal(submissions[2].body.costConfirmation, undefined)
      assert.equal(submissions[2].body.receivedQuantity, 1.25)
      assert.equal(await cost.inputValue(), "27")
      await page.keyboard.press("Escape")
      assert.equal(await input.isDisabled(), true)
      assert.equal(await site.isDisabled(), true)
      assert.equal(await cost.isDisabled(), true)
      await page.reload()
      await retry.waitFor()
      assert.equal(await site.isDisabled(), true)
      assert.equal(await input.isDisabled(), true)
      receiptResult = "saved"
      failReceiptRefresh = true
      await retry.click()
      await page.getByText(copy.receiptSuccess(42), { exact: true }).waitFor()
      await page.getByText(copy.receiptRefreshWarning, { exact: true }).waitFor()
      assert.deepEqual(submissions[3], submissions[2], "retry after reload sends the exact key and payload")
      assert.equal(await retry.count(), 0)
      assert.equal(await alert.count(), 0)
      failReceiptRefresh = false
      await input.fill("CAFE-A")
      await options.first().click()
      await cost.fill("27")
      await transport.fill("5")
      await page.getByRole("button", { name: copy.showMoreCosts }).click()
      await additional.fill("3")
      await receive.click()
      await page.getByText(copy.receiptSuccess(42), { exact: true }).waitFor()
      assert.notEqual(submissions[4].key, submissions[3].key)
      assert.equal(await page.getByText(copy.receiptRefreshWarning, { exact: true }).count(), 0)

      await input.fill("CAFE-A")
      await options.first().click()
      const dialog = page.getByRole("dialog")
      const review = dialog.getByRole("button", { name: copy.reviewCosts, exact: true })
      const confirm = dialog.getByRole("button", { name: copy.confirmCosts, exact: true })
      assert.equal(await cost.getAttribute("id"), "receipt-cost-1")
      await page.getByText(copy.totalPurchasePrice, { exact: true }).waitFor()
      await receive.click()
      await dialog.getByRole("heading", { name: copy.zeroCostsTitle }).waitFor()
      await dialog.getByText(copy.zeroCostsMessage, { exact: true }).waitFor()
      assert.equal(await review.evaluate(button => document.activeElement === button), true)
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press("Tab")
        assert.equal(await page.evaluate(() => document.activeElement === document.body
          || document.activeElement.closest("dialog[open]") !== null), true)
      }
      assert.ok(await dialog.evaluate(el => {
        const rect = el.getBoundingClientRect()
        return rect.left >= 0 && rect.right <= innerWidth && rect.height < innerHeight
      }))
      await page.screenshot({ path: screenshots + "/zero-cost-" + language + ".png" })
      await page.keyboard.press("Escape")
      await dialog.waitFor({ state: "detached" })
      assert.equal(submissions.length, 5, "Escape must not submit")
      assert.equal(await cost.inputValue(), "")
      await cost.fill("0")
      await transport.fill("0")
      await receive.click()
      await dialog.getByRole("heading", { name: copy.zeroCostsTitle }).waitFor()
      await review.click()
      assert.equal(await cost.inputValue(), "0")
      assert.equal(await transport.inputValue(), "0")
      await cost.fill("31.25")
      await transport.fill("8.75")
      assert.equal(await additional.count(), 0, "unfilled additional cost starts collapsed")
      await receive.click()
      await dialog.getByRole("heading", { name: copy.partialCostsTitle }).waitFor()
      await dialog.getByText(copy.partialCostsMessage, { exact: true }).waitFor()
      await page.screenshot({ path: screenshots + "/partial-cost-" + language + ".png" })
      await review.click()
      await additional.waitFor()
      assert.equal(await cost.inputValue(), "31.25")
      assert.equal(await transport.inputValue(), "8.75")
      assert.equal(submissions.length, 5)
      receiptResult = "lost"
      await receive.click()
      await confirm.evaluate(button => { button.click(); button.click() })
      await alert.getByText(copy.receiptOutcomeUnknown, { exact: true }).waitFor()
      assert.equal(submissions.length, 6, "Confirm submits just once")
      assert.deepEqual(submissions[5].body.costConfirmation, {
        type: "PARTIAL_COST", amounts: { 1: "31.25", 2: "8.75", 3: "0" },
      })
      await page.keyboard.press("Escape")
      receiptResult = "saved"
      await retry.click()
      await page.getByText(copy.receiptSuccess(42), { exact: true }).waitFor()
      assert.deepEqual(submissions[6], submissions[5], "retry preserves the confirmation and operation key")

      await input.fill("CAFE-A")
      await options.first().click()
      await receive.click()
      await dialog.getByRole("heading", { name: copy.zeroCostsTitle }).waitFor()
      await confirm.click()
      await page.getByText(copy.receiptSuccess(42), { exact: true }).waitFor()
      assert.deepEqual(submissions[7].body.costConfirmation, { type: "ZERO_TOTAL", amounts: { 1: "0", 2: "0", 3: "0" } })
    }
    assert.deepEqual(errors, [])
    console.log("PASS", language, width, "suggestions, keyboard, site lookup, empty state, layout")
    await context.close()
  }
} finally { await browser.close() }
