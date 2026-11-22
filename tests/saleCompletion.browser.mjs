import assert from "node:assert/strict"
import { createRequire } from "node:module"
const { chromium } = createRequire(import.meta.url)("playwright")
const browser = await chromium.launch({ channel: "msedge", headless: true })
const origin = process.env.PRODUCT_SEARCH_PREVIEW_URL || "http://127.0.0.1:5203"
try {
  for (const [language, width, add, create, close, email, print, retry] of [
    ["en", 1440, "Add to cart", "Create sale", "Close", "Send by email", "Print invoice", "Retry"],
    ["fr", 375, "Ajouter au panier", "Créer la vente", "Fermer", "Envoyer par e-mail", "Imprimer la facture", "Réessayer"],
    ["es", 768, "Agregar al carrito", "Crear la venta", "Cerrar", "Enviar por correo", "Imprimir factura", "Reintentar"],
  ]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } })
    const page = await context.newPage()
    let creates = 0, emails = 0, failDetail = false, failEmail = false
    const errors = []
    page.on("pageerror", e => errors.push(e.message))
    await page.addInitScript(lang => {
      localStorage.setItem("camelyon_token", "isolated-sale-confirmation")
      localStorage.setItem("cameleyon-ui-language", lang)
      window.open = () => null
      window.print = () => window.dispatchEvent(new Event("afterprint"))
    }, language)
    const product = { id: 1, sku: "P1", name: "Test product", active: true, unitPrice: 5, currentStock: 20, quantityType: "INTEGER", priceTiers: [] }
    const sale = { id: 11, saleNumber: "SALE-TEST", soldAt: "2026-11-22T10:00:00", customerName: "Test customer",
      customerEmail: "test@example.invalid", paymentMethod: "CASH", subtotalAmount: 5, taxAmount: 0,
      totalAmount: 5, status: "COMPLETED", items: [{ productId: 1, productName: "Test product", quantity: 1, unitPrice: 5, lineTotal: 5 }] }
    await page.route("**/api/**", async route => {
      const req = route.request(), path = new URL(req.url()).pathname
      if (!path.startsWith("/api/")) return route.continue()
      const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type" }
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers })
      let json
      if (path === "/api/auth/me") json = { id: 8, companyId: 7, role: "ADMIN", companyName: "Test store" }
      else if (path === "/api/company/locations") json = [{ id: 9, name: "Site", active: true, primaryLocation: true }]
      else if (path === "/api/customers") json = []
      else if (path === "/api/products") json = [product]
      else if (path.startsWith("/api/products/sku/")) json = product
      else if (path === "/api/company/subscription") json = { invoiceEmailEnabled: true }
      else if (path === "/api/sales" && req.method() === "POST") { creates++; json = sale }
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
    await page.goto(origin + "/tests/fixtures/product-name-sale.html")
    async function createSale() {
      await page.locator("input[role=combobox]").first().fill("Test")
      await page.getByRole("listbox").getByRole("option").first().click()
      await page.getByRole("button", { name: add, exact: true }).click()
      await page.getByRole("button", { name: create, exact: true }).click()
      await page.getByRole("dialog").waitFor()
    }
    await createSale()
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("button", { name: print, exact: true }).waitFor()
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
