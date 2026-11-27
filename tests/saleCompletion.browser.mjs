import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { mkdir } from "node:fs/promises"
import { messages } from "../src/i18n/messages.ts"
const { chromium } = createRequire(import.meta.url)("playwright")
const browser = await chromium.launch({ channel: "msedge", headless: true })
const origin = process.env.PRODUCT_SEARCH_PREVIEW_URL || "http://127.0.0.1:5203"
const screenshots = process.env.SALES_SCREENSHOTS
if (screenshots) await mkdir(screenshots, { recursive: true })
try {
  for (const [language, width, add, create, close, email, print, retry] of [
    ["en", 1440, "Add to cart", "Create sale", "Close", "Send by email", "Print invoice", "Retry"],
    ["fr", 375, "Ajouter au panier", "Créer la vente", "Fermer", "Envoyer par e-mail", "Imprimer la facture", "Réessayer"],
    ["es", 320, "Agregar al carrito", "Crear la venta", "Cerrar", "Enviar por correo", "Imprimir factura", "Reintentar"],
  ]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } })
    const page = await context.newPage()
    const copy = messages[language], text = copy.newSalePage
    let creates = 0, emails = 0, failDetail = false, failEmail = false, lastPayload
    const errors = []
    page.on("pageerror", e => errors.push(e.message))
    await page.addInitScript(lang => {
      localStorage.setItem("camelyon_token", "isolated-sale-confirmation")
      localStorage.setItem("cameleyon-ui-language", lang)
      window.open = () => null
      window.print = () => window.dispatchEvent(new Event("afterprint"))
    }, language)
    const product = { id: 1, sku: "P1", name: "Test product", active: true, unitPrice: 5, currentStock: 20, quantityType: "INTEGER",
      unitName: "bag", priceTiers: [{ minQuantity: 3, unitPrice: 4, label: "Fixture price tier" }] }
    const sale = { id: 11, saleNumber: "SALE-TEST", soldAt: "2026-11-22T10:00:00", locationName: "Site", customerName: "Test customer",
      customerEmail: "test@example.invalid", paymentMethod: "CASH", subtotalAmount: 5, taxAmount: 0.5,
      totalAmount: 5.5, status: "COMPLETED", items: [{ productId: 1, productName: "Test product", quantity: 1, unitPrice: 5, lineTotal: 5 }] }
    await page.route("**/api/**", async route => {
      const req = route.request(), path = new URL(req.url()).pathname
      if (!path.startsWith("/api/")) return route.continue()
      const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type" }
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers })
      let json
      if (path === "/api/auth/me") json = { id: 8, companyId: 7, role: "ADMIN", companyName: "Test store" }
      else if (path === "/api/company/locations") json = [{ id: 9, name: "Site", active: true, primaryLocation: true }]
      else if (path === "/api/customers") json = [{ id: 21, name: "Test customer", email: "test@example.invalid", active: true }]
      else if (path === "/api/sales/product-lookup") json = [product]
      else if (path.startsWith("/api/sales/product-lookup/sku/")) json = product
      else if (path === "/api/sales/product-lookup/barcode/885555") json = product
      else if (path === "/api/company/subscription") json = { invoiceEmailEnabled: true }
      else if (path === "/api/sales" && req.method() === "POST") { lastPayload = req.postDataJSON(); creates++; json = sale }
      else if (path === "/api/sales/11") {
        if (failDetail) return route.fulfill({ status: 503, headers, json: { message: "Unavailable" } })
        json = sale
      } else if (path === "/api/sales/11/send-invoice-email") {
        emails++
        if (failEmail) return route.fulfill({ status: 503, headers, json: { message: "Email unavailable" } })
        json = { message: "Sent" }
      } else throw Error("Unexpected request " + path)
      return route.fulfill({ headers, json })
    })
    await page.goto(origin + "/tests/fixtures/sales-workspace.html")
    async function selectProduct() {
      await page.locator("input[role=combobox]").first().fill("Test")
      await page.getByRole("listbox").getByRole("option").first().click()
    }
    const control = name => page.getByRole("button", { name, exact: true })
    async function reviewDraft() {
      const query = page.locator("input[role=combobox]").first()
      await query.fill("885555")
      await query.press("Enter")
      const quantity = page.locator("#sale-quantity")
      await quantity.waitFor()
      await quantity.fill("1.5")
      await control(add).click()
      await page.getByText(copy.common.wholeNumberQuantity, { exact: true }).waitFor()
      await quantity.fill("21")
      await control(add).click()
      const alert = page.getByRole("alertdialog")
      await alert.getByText(text.quantityExceedsStock, { exact: true }).waitFor()
      await page.keyboard.press("Escape")
      await alert.waitFor({ state: "hidden" })
      await quantity.fill("2")
      await control(add).click()
      await selectProduct()
      await control(add).click()
      assert.equal(await page.locator(".cart-item-row").count(), 1)
      assert.match(await page.locator(".sales-summary").innerText(), /12\.00/)
      await control(copy.cartTable.remove).click()
      await page.locator(".cart-line-table").getByText(copy.cartTable.empty, { exact: true }).waitFor()
      const customer = page.getByPlaceholder(text.searchCustomerPlaceholder)
      await customer.fill("Test customer")
      await control("Test customer").waitFor()
      if (width === 1440) {
        await customer.press("Tab")
        assert.equal(await control("Test customer").evaluate(el => el === document.activeElement), true)
        await page.keyboard.press("Enter")
      } else {
        await control("Test customer").click()
      }
      await control(text.debitCard).click()
      await control(text.creditCard).click()
    }
    await reviewDraft()
    async function createSale() {
      await selectProduct()
      await page.getByRole("button", { name: add, exact: true }).click()
      const summary = page.locator(".sales-summary")
      assert.match(await summary.innerText(), /5\.00/)
      assert.doesNotMatch(await summary.innerText(), /5\.50/)
      const jump = page.locator(".sales-summary-jump")
      if (await jump.isVisible()) {
        await jump.click()
        assert.equal(await page.evaluate(() => document.activeElement.id), "sale-summary-heading")
        assert.match(await summary.innerText(), /5\.00/)
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      if (screenshots && !creates) {
        const expand = await page.addStyleTag({ content: ".app-shell.internal-shell { height:auto; min-height:100vh; overflow:visible } .internal-shell .workspace-main > .app-content { overflow:visible }" })
        await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector("main")?.scrollTo(0, 0) })
        await page.screenshot({ path: `${screenshots}/new-sale-${language}-${width}.png`, fullPage: true })
        await expand.evaluate(element => element.remove())
      }
      if (!creates) {
        await control(create).click()
        const alert = page.getByRole("alertdialog")
        await alert.getByText(text.manualCardConfirmationRequired, { exact: true }).waitFor()
        assert.equal(creates, 0)
        await page.keyboard.press("Escape")
        await alert.waitFor({ state: "hidden" })
        await page.getByPlaceholder(text.paymentReferencePlaceholder).fill("REF-LOCAL")
        await page.getByPlaceholder(text.authorizationCodePlaceholder).fill("AUTH-LOCAL")
        await page.getByRole("checkbox", { name: text.manualCardConfirmation }).check()
      }
      await page.getByRole("button", { name: create, exact: true }).evaluate(button => { button.click(); button.click() })
      await page.getByRole("dialog").waitFor()
      assert.match(await page.getByRole("dialog").innerText(), /SALE-TEST[\s\S]*Site[\s\S]*5\.50/)
    }
    await createSale()
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("button", { name: print, exact: true }).waitFor()
    assert.equal(creates, 1)
    assert.deepEqual(lastPayload.items, [{ productId: 1, quantity: 1 }])
    assert.equal(lastPayload.customerId, 21)
    assert.equal(lastPayload.paymentMethod, "CREDIT_CARD")
    assert.equal(lastPayload.paymentReference, "REF-LOCAL")
    assert.equal(lastPayload.paymentAuthorizationCode, "AUTH-LOCAL")
    assert.equal(lastPayload.paymentConfirmedManually, true)
    if (screenshots) await page.screenshot({ path: `${screenshots}/sale-recorded-${language}-${width}.png` })
    assert.equal(await page.locator(".printable-invoice:visible").count(), 0)
    assert.equal(emails, 0)
    await dialog.getByRole("button", { name: close, exact: true }).click()
    assert.equal(await page.locator(".printable-invoice").count(), 0)
    await createSale()
    const send = dialog.getByRole("button", { name: email, exact: true })
    await send.waitFor()
    await send.click()
    await dialog.locator(".success").waitFor()
    assert.equal(emails, 1)
    assert.equal(await dialog.locator(".printable-invoice:visible").count(), 1)
    assert.ok(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1))
    await page.screenshot({ path: process.env.TEMP + `/sale-confirmation-${language}.png` })
    await dialog.getByRole("button", { name: close, exact: true }).click()
    failDetail = true
    await createSale()
    await dialog.getByRole("button", { name: retry, exact: true }).waitFor()
    if (screenshots) await page.screenshot({ path: `${screenshots}/receipt-unavailable-${language}-${width}.png` })
    const before = creates
    failDetail = false
    await dialog.getByRole("button", { name: retry, exact: true }).click()
    await dialog.getByRole("button", { name: print, exact: true }).click()
    assert.equal(creates, before, "receipt retries never recreate a sale")
    assert.equal(await dialog.locator(".printable-invoice:visible").count(), 1)
    failEmail = true
    await dialog.getByRole("button", { name: email, exact: true }).click()
    await dialog.locator(".error").waitFor()
    assert.equal(await dialog.locator(".printable-invoice:visible").count(), 1)
    assert.deepEqual(errors, [])
    await context.close()
    console.log("PASS", language, width, "confirmation, close, email, print, failed receipt retry and failed email")
  }
} finally { await browser.close() }
