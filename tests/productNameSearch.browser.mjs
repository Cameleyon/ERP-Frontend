import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { mkdir } from "node:fs/promises"
const { chromium } = createRequire(import.meta.url)("playwright")
const origin = process.env.PRODUCT_SEARCH_PREVIEW_URL || "http://127.0.0.1:5203"
const screenshots = process.env.PRODUCT_SEARCH_SCREENSHOTS || "docs/screenshots/product-search"
const inventory = process.env.PRODUCT_SEARCH_MODE === "inventory"
await mkdir(screenshots, { recursive: true })
const browser = await chromium.launch({ channel: "msedge", headless: true })
const products = [
  { id: 1, sku: "CAFE-A", name: "Café moulu", active: true },
  { id: 2, sku: "CAFE-B", name: "Café moulu", active: true },
  { id: 3, sku: "RETIRED", name: "Café retiré", active: false },
].map(p => ({ ...p, barcode: p.id === 1 ? "1234567890" : null, unitPrice: 5, costPrice: 2, currentStock: 10, minimumStock: 1,
  unitName: "Unit", quantityType: "INTEGER", description: "", category: "", priceTiers: [] }))
const labels = { en: "Product name, barcode or SKU", fr: "Nom du produit, code-barres ou SKU", es: "Nombre del producto, código de barras o SKU" }

try {
  for (const [language, width] of [["en", 1440], ["fr", 375], ["es", 768]]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } })
    const page = await context.newPage(), requests = [], errors = []
    let mismatch = false
    page.on("pageerror", e => errors.push(e.message))
    await page.addInitScript(lang => {
      localStorage.setItem("camelyon_token", "isolated-product-search")
      localStorage.setItem("cameleyon-ui-language", lang)
    }, language)
    await page.route("**/api/**", async route => {
      const request = route.request(), url = new URL(request.url())
      if (!url.pathname.startsWith("/api/")) return route.continue()
      const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type" }
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers })
      assert.equal(request.method(), "GET", "search and cart must not create sales")
      requests.push(url.pathname + url.search)
      let body
      if (url.pathname === "/api/auth/me") body = { id: 8, companyId: 7, role: "ADMIN",
        email: "test@example.invalid", firstName: "Test", lastName: "Owner", companyOwner: true }
      else if (url.pathname === "/api/customers") body = []
      else if (url.pathname === "/api/cost-rubrics") body = [
        { id: 1, code: "COST_OF_GOODS", name: "Purchase price", active: true, displayOrder: 0 },
      ]
      else if (url.pathname === "/api/inventory/receipts/active") body = []
      else if (url.pathname === "/api/company/locations") body = [
        { id: 9, name: "Site A", active: true, primaryLocation: true },
        { id: 10, name: "Site B", active: true, primaryLocation: false },
      ]
      else if (url.pathname === "/api/products") body = products
      else if (url.pathname.startsWith("/api/products/barcode/") || url.pathname.startsWith("/api/products/sku/")) {
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
    assert.ok(requests.includes("/api/products/sku/CAFE-B?locationId=9"))
    assert.equal(await input.inputValue(), "Café moulu")
    assert.equal(await options.count(), 0)
    const site = page.locator(".page-title-site-filter select")
    await site.selectOption("10")
    await input.fill("moulu")
    await options.first().click()
    await page.waitForTimeout(150)
    assert.ok(requests.includes("/api/products/sku/CAFE-A?locationId=10"))
    if (inventory) await page.locator("#receipt-cost-1").fill("25")
    await input.fill("CAFE-B")
    assert.equal(await page.locator("p").filter({ hasText: /^SKU:/ }).count(), 0, "editing must clear the old selection")
    await options.first().click()
    await page.waitForTimeout(150)
    assert.ok(requests.includes("/api/products/sku/CAFE-B?locationId=10"))
    assert.equal(await input.inputValue(), "Café moulu")
    if (inventory) assert.equal(await page.locator("#receipt-cost-1").inputValue(), "", "draft costs must not transfer to another product")
    await input.fill("1234567890")
    await options.first().waitFor()
    await input.press("Enter")
    await page.waitForFunction(() => document.querySelector('[role="combobox"]').value === "Café moulu")
    assert.ok(requests.includes("/api/products/sku/CAFE-A?locationId=10"))
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
    assert.equal(await page.locator("p").filter({ hasText: /^SKU:/ }).count(), 0, "a mismatched product must never be selected")
    assert.deepEqual(errors, [])
    console.log("PASS", language, width, "suggestions, keyboard, site lookup, empty state, layout")
    await context.close()
  }
} finally { await browser.close() }
