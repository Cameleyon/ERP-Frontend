import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { mkdir } from "node:fs/promises"
import { messages } from "../src/i18n/messages.ts"
import { setupCopy } from "../src/i18n/setupCopy.ts"
import { stockWorkspaceCopy } from "../src/i18n/stockWorkspaceCopy.ts"

const { chromium } = createRequire(import.meta.url)("playwright")
const origin = process.env.STOCK_WORKSPACE_PREVIEW_URL || "http://127.0.0.1:5246"
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error("Browser tests require a local server")
const output = process.env.STOCK_WORKSPACE_SCREENSHOTS
if (output) await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: "msedge", headless: true })
const sites = [{ id: 9, name: "Main site", active: true, primaryLocation: true }, { id: 10, name: "Second site", active: true }]
const rubrics = [
  { id: 1, code: "COST_OF_GOODS", name: "Purchase price", active: true, system: true },
  { id: 2, code: "TRANSPORT", name: "Transportation and delivery", active: true, system: true },
  { id: 3, code: "OTHER_COST", name: "Other cost", active: true, system: false },
]
const fixture = (id, name, barcode) => ({ id, name, sku: "SKU-" + id, barcode: barcode || null, unitName: "bag",
  quantityType: "INTEGER", currentStock: id === 1 ? 18 : 0, minimumStock: 0, active: true, unitPrice: 32,
  description: "", category: id === 1 ? "Food" : "Other", priceTiers: [], costPrice: id === 1 ? 24 : null })

async function capture(page, name, modal = false) {
  if (!output) return
  const expand = !modal && await page.addStyleTag({ content: `
    .app-shell.internal-shell { height: auto; min-height: 100vh; overflow: visible; }
    .internal-shell .workspace-main > .app-content { overflow: visible; }
  ` })
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: !modal, animations: "disabled" })
  if (expand) await expand.evaluate(node => node.remove())
}

try {
  for (const [language, width] of [["en", 1440], ["en", 390], ["fr", 1440], ["fr", 390], ["es", 1440], ["es", 320]]) {
    const copy = messages[language], text = copy.productsPage, inventory = copy.inventoryPage
    const labels = stockWorkspaceCopy[language], guide = setupCopy[language]
    const page = await browser.newPage({ viewport: { width, height: 920 } })
    const prefix = `${language}-${width <= 768 ? "mobile" : "desktop"}`
    const products = [fixture(1, "Jasmine rice", "1234567890"), ...Array.from({ length: 13 }, (_, i) => fixture(i + 2, "Demo item " + (i + 2)))]
    let receipt, nextId = 100
    const errors = [], writes = []
    page.on("pageerror", error => errors.push(error.message))
    await page.addInitScript(() => localStorage.setItem("camelyon_token", "stock-workspace-fixture"))
    await page.route("**/*", async route => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname, method = req.method()
      if (!path.startsWith("/api/")) return url.origin === origin ? route.continue() : route.abort()
      const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type, Idempotency-Key",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS" }
      if (method === "OPTIONS") return route.fulfill({ status: 204, headers })
      const reply = (json, status = 200) => route.fulfill({ json, headers, status })
      if (method !== "GET") writes.push({ path, method, body: req.postDataJSON(), key: req.headers()["idempotency-key"] })
      if (path === "/api/auth/me") return reply({ id: 8, companyId: 7, companyName: "Cameleyon Demo Store", companyOwner: true,
        role: "ADMIN", termsAccepted: true, companyCurrencyCode: "USD", companyTimeZoneId: "Etc/GMT+5", locations: sites })
      if (path === "/api/company/locations") return reply(sites)
      if (path === "/api/company/subscription") return reply({ status: "ACTIVE" })
      if (path === "/api/dashboard/summary") return reply({ totalSales: 0, totalCost: 0, totalProfit: 0, totalTax: 0,
        totalTransactions: 0, lowStockProducts: 0, outOfStockProducts: 0 })
      if (path === "/api/dashboard/setup-status") return reply({ hasCurrency: true, hasProduct: true, hasActiveProduct: true,
        hasRecordedStock: true, hasEverCompletedSale: true, hasAccessibleSite: true, needsInventoryReview: false, saleSiteIds: [9] })
      if (path.startsWith("/api/dashboard/") || path.startsWith("/api/forecasts/")) return reply([])
      if (path === "/api/products" && method === "GET") return reply(products)
      if (path === "/api/products" && method === "POST") {
        const body = req.postDataJSON()
        if (body.name === "Rejected row") return reply({ message: "Synthetic rejected row" }, 422)
        const item = { ...fixture(nextId++, body.name), ...body }
        products.push(item)
        return reply(item, 201)
      }
      if (/^\/api\/products\/\d+$/.test(path)) {
        const item = products.find(product => product.id === Number(path.split("/").at(-1)))
        if (method === "PUT") Object.assign(item, req.postDataJSON())
        return reply(item)
      }
      if (path.startsWith("/api/products/sku/")) return reply(products.find(item => item.sku === path.split("/").at(-1)))
      if (path === "/api/cost-rubrics") return reply(rubrics)
      if (path === "/api/cost-rubrics/catalog") return reply([])
      if (path === "/api/inventory/receipts/active") {
        return reply(receipt && url.searchParams.get("locationId") === String(receipt.locationId) ? [receipt] : [])
      }
      if (path === "/api/inventory/receipts" && method === "POST") {
        const body = req.postDataJSON()
        assert.equal(body.locationId, 10)
        assert.equal(body.receivedQuantity, 5)
        assert.equal(body.costConfirmation.type, "PARTIAL_COST")
        assert.ok(req.headers()["idempotency-key"])
        receipt = { id: 200, locationId: 10, locationName: sites[1].name, productId: body.productId,
          productName: products.find(item => item.id === body.productId).name, quantityType: "INTEGER", totalCostAmount: 120, unitCost: 24,
          receivedQuantity: 5, remainingQuantity: 5, createdAt: "2026-11-26T11:30:00", lastAction: "CREATION", costLines: [] }
        return reply(receipt, 201)
      }
      if (path === "/api/inventory/receipts/200/quantity") {
        receipt.receivedQuantity = req.postDataJSON().receivedQuantity
        receipt.remainingQuantity = receipt.receivedQuantity
        receipt.lastAction = "MODIFICATION"
        return reply(receipt)
      }
      if (path === "/api/inventory/receipts/200/withdrawals") {
        receipt.remainingQuantity -= req.postDataJSON().quantity
        receipt.lastAction = "WITHDRAWAL"
        return reply(receipt)
      }
      throw Error("Unmocked stock fixture endpoint " + method + " " + path)
    })

    async function nav(label) {
      const menu = page.locator(".mobile-menu-button")
      if (await menu.isVisible()) await menu.click()
      await page.locator(".workspace-sidebar:visible").getByRole("button", { name: label, exact: true }).click()
    }
    async function fits() {
      assert.ok(await page.locator("main").evaluate(node => node.scrollWidth <= node.clientWidth), prefix + " main overflow")
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), prefix + " page overflow")
    }
    const button = (name, within = page) => within.getByRole("button", { name, exact: true })
    await page.goto(origin + "/" + language)
    await page.locator(".internal-dashboard h1").waitFor()
    assert.equal(await page.locator("html").getAttribute("lang"), language)
    await nav(copy.sidebar.products)
    const list = page.locator(".product-list-card")
    const search = list.locator(".stock-search input")
    await button(labels.view, list).first().waitFor()
    assert.equal(await button(labels.view, list).count(), 12)
    await fits()
    await capture(page, prefix + "-products")
    await button(text.nextPage, list).click()
    assert.equal(await button(labels.view, list).count(), 2)
    assert.equal(await list.getByRole("combobox", { name: labels.sortBy, exact: true }).count(), 0)
    const mobileList = width <= 950
    const nameSort = button(text.name, list)
    const names = list.locator(mobileList ? ".stock-product-cards h4" : ".stock-product-table tbody th")
    const firstName = async () => (await names.first().innerText()).split("\n")[0]
    const sortState = () => mobileList
      ? nameSort.getAttribute("aria-description")
      : list.getByRole("columnheader", { name: text.name, exact: true }).getAttribute("aria-sort")
    await nameSort.click()
    assert.equal(await sortState(), mobileList ? labels.ascending : "ascending")
    assert.equal(await button(labels.view, list).count(), 12)
    assert.equal(await firstName(), "Demo item 2")
    await nameSort.click()
    assert.equal(await sortState(), mobileList ? labels.descending : "descending")
    assert.equal(await firstName(), "Jasmine rice")
    assert.equal((await names.nth(1).innerText()).split("\n")[0], "Demo item 14")
    await nameSort.click()
    assert.equal(await sortState(), mobileList ? labels.defaultSort : null)
    assert.equal((await names.nth(1).innerText()).split("\n")[0], "Demo item 2")
    await list.locator(".product-filters select").first().selectOption("Food")
    assert.equal(await button(labels.view, list).count(), 1)
    await search.fill("1234567890")
    await button(labels.view, list).click()
    await page.getByRole("heading", { name: "Jasmine rice", exact: true }).waitFor()
    assert.ok((await page.locator("main").innerText()).includes("SKU-1"))
    await fits()
    await capture(page, prefix + "-details")
    await button(labels.edit).click()
    const editor = page.locator("form.product-form-grid")
    assert.equal(await editor.locator("select").first().isDisabled(), true)
    await capture(page, prefix + "-edit")
    await editor.locator('input[type="number"]').first().fill("34")
    await editor.locator('button[type="submit"]').click()
    await page.getByText(text.updateSuccess, { exact: true }).waitFor()
    assert.ok(!("quantityType" in writes.find(write => write.method === "PUT").body))
    await button(labels.backProducts).click()

    await button(text.scannerTitle, list).click()
    const tools = page.locator(".stock-tools")
    await button(text.openScanner, tools).click()
    await tools.locator(".scanner-container").waitFor()
    await button(text.closeScanner, tools).click()
    const barcode = tools.locator('input:not([type="file"])')
    await barcode.fill("1234567890")
    await button(labels.findBarcode, tools).click()
    assert.equal(await search.inputValue(), "1234567890")
    await button(text.csvImportButton, page.locator(".stock-heading")).click()
    const csv = tools.locator('input[type="file"]')
    const upload = contents => csv.setInputFiles({ name: "fixtures.csv", mimeType: "text/csv", buffer: Buffer.from(contents) })
    const csvHeader = "name,category,unit,unitPrice\n"
    await upload(csvHeader + "Valid row,Food,bag,12\nInvalid row,Food,bag,\n")
    await page.getByRole("alertdialog").waitFor()
    await page.keyboard.press("Escape")
    await page.getByRole("alertdialog").waitFor({ state: "hidden" })
    await page.getByText(labels.csvFix, { exact: true }).waitFor()
    assert.equal(await button(text.csvImportButton, tools).isDisabled(), true)
    assert.equal(writes.filter(write => write.method === "POST").length, 0)
    await fits()
    await capture(page, prefix + "-tools")
    const download = page.waitForEvent("download")
    await button(text.csvTemplateDownload, tools).click()
    assert.match((await download).suggestedFilename(), /\.csv$/i)
    await upload(csvHeader + "Valid row,Food,bag,12\nRejected row,Food,bag,12\n")
    await button(text.csvImportButton, tools).click()
    await page.getByText(/Synthetic rejected row/).waitFor()
    assert.equal(writes.filter(write => write.path === "/api/products" && write.method === "POST").length, 2)

    await barcode.fill("246813579")
    await button(labels.assignBarcode, tools).click()
    assert.equal(await editor.locator("#product-barcode").inputValue(), "246813579")
    await button(guide.options, editor).click()
    await editor.locator('input[type="text"]').first().fill("Opening stock product")
    await editor.locator('input[list="product-unit-options"]').fill("bag")
    await editor.locator("select").first().selectOption("INTEGER")
    await editor.locator('input[type="number"]').first().fill("30")
    await fits()
    await capture(page, prefix + "-new")
    await editor.locator('button[type="submit"]').click()
    const created = page.getByRole("dialog")
    await created.getByRole("heading", { name: guide.created, exact: true }).waitFor()
    await button(guide.opening, created).click()
    const receiptEditor = page.locator("#stock-receiving-view")
    await receiptEditor.getByText("Opening stock product", { exact: true }).first().waitFor()
    const inventorySite = page.locator(".stock-heading").getByRole("combobox", { name: guide.site, exact: true })
    await inventorySite.selectOption("10")
    await receiptEditor.locator("#receipt-quantity").fill("5")
    await receiptEditor.locator("#receipt-cost-1").fill("100")
    await receiptEditor.locator("#receipt-cost-2").fill("20")
    if (width <= 768) await page.locator(".mobile-menu-button").click()
    await page.locator(".workspace-sidebar:visible .workspace-menu-site select").selectOption("9")
    if (width <= 768) {
      await page.keyboard.press("Escape")
      await page.locator(".workspace-menu-dialog").waitFor({ state: "hidden" })
    }
    assert.equal(await inventorySite.inputValue(), "10", "Changing the menu site must not move a receipt draft")
    assert.match(await receiptEditor.locator(".stock-receive-summary").innerText(), /120\.00/)
    assert.match(await receiptEditor.locator(".stock-receive-summary").innerText(), /24\.00/)
    await fits()
    await capture(page, prefix + "-receive")
    await button(inventory.receiveStock, receiptEditor).click()
    const review = page.getByRole("dialog")
    await review.getByRole("heading", { name: inventory.partialCostsTitle, exact: true }).waitFor()
    assert.match(await review.innerText(), /Second site[\s\S]*120\.00[\s\S]*24\.00/)
    await capture(page, prefix + "-review", true)
    await button(inventory.reviewCosts, review).click()
    assert.equal(await receiptEditor.locator("#receipt-cost-1").inputValue(), "100")
    await button(inventory.receiveStock, receiptEditor).click()
    await button(inventory.confirmCosts, review).click()
    const active = page.locator("#stock-active-view")
    await active.waitFor()
    assert.equal(await inventorySite.inputValue(), "10")
    assert.equal(await active.locator(".inventory-receipt-filter input").inputValue(), "Opening stock product")
    const row = active.getByRole("row").filter({ hasText: "Opening stock product" })
    await row.waitFor()
    assert.match(await row.innerText(), /120\.00/)
    await fits()
    await capture(page, prefix + "-active")
    await button(inventory.edit, row).click()
    await row.getByRole("spinbutton").fill("6")
    await button(inventory.save, row).click()
    await button(inventory.withdraw, row).click()
    await row.getByRole("spinbutton").fill("1")
    await row.getByPlaceholder(inventory.reasonPlaceholder).fill("Fixture withdrawal")
    await button(inventory.confirm, row).click()
    await button(inventory.edit, row).waitFor()
    await nav(copy.sidebar.costRubrics)
    await page.locator(".cost-catalog-table tbody tr").first().waitFor()
    assert.equal(await page.locator(".cost-catalog-table tbody tr").count(), 3)
    await fits()
    await capture(page, prefix + "-rubrics")
    assert.deepEqual(errors, [])
    console.log("PASS stock workspace", language, width)
    await page.close()
  }
} finally { await browser.close() }
