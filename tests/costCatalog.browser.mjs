import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { readFile, mkdir } from "node:fs/promises"
const { chromium } = createRequire(import.meta.url)("playwright")
const catalog = JSON.parse(await readFile(process.env.COST_CATALOG_FIXTURE
  || new URL("../../CAMELEYON-ERP/src/main/resources/inventory/cost-catalog.json", import.meta.url), "utf8"))
const origin = process.env.COST_CATALOG_PREVIEW_URL || "http://127.0.0.1:5203"
const shots = process.env.COST_CATALOG_SCREENSHOTS || "docs/screenshots/cost-catalog"
await mkdir(shots, { recursive: true })
const browser = await chromium.launch({ channel: "msedge", headless: true })
const words = {
  en: { add: "Add", remove: "Remove", category: "Category", costs: "Costs", select: "Selected costs", cancel: "Cancel" },
  fr: { add: "Ajouter", remove: "Retirer", category: "Catégorie", costs: "Coûts", select: "Coûts sélectionnés", cancel: "Annuler" },
  es: { add: "Añadir", remove: "Retirar", category: "Categoría", costs: "Costos", select: "Costos seleccionados", cancel: "Cancelar" },
}
try {
  for (const [language, width] of [["en", 1440], ["fr", 375], ["es", 768]]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } })
    const page = await context.newPage(), errors = [], writes = []
    let failSave = false
    const rows = catalog.filter(entry => entry.defaultSelected).map((entry, index) => ({
      id: index + 1, code: entry.code, name: entry.names.en, active: true, system: true,
      description: null, catalog: entry, displayOrder: index,
    }))
    const purchase = rows.find(row => row.code === "COST_OF_GOODS")
    const purchaseId = purchase.id
    const t = words[language]
    page.on("pageerror", error => errors.push(error.message))
    await page.addInitScript(lang => {
      localStorage.setItem("camelyon_token", "isolated-cost-catalog")
      localStorage.setItem("cameleyon-ui-language", lang)
    }, language)
    await page.route("**/api/**", async route => {
      const request = route.request(), url = new URL(request.url()), path = url.pathname
      if (!path.startsWith("/api/")) return route.continue()
      const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS" }
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers })
      let body
      if (path === "/api/auth/me") body = { id: 8, role: "ADMIN", companyId: 7, email: "test@example.invalid" }
      else if (path === "/api/cost-rubrics/catalog") body = catalog
      else if (path === "/api/cost-rubrics" && request.method() === "GET") body = rows
      else if (path.match(/^\/api\/cost-rubrics\/\d+\/active$/) && request.method() === "PATCH") {
        const id = Number(path.split("/")[3])
        const row = rows.find(item => item.id === id)
        row.active = request.postDataJSON().active
        writes.push({ method: "PATCH", id, active: row.active })
        body = row
      } else if (path === "/api/cost-rubrics/selection" && request.method() === "POST") {
        if (failSave) return route.fulfill({ status: 503, headers, json: { message: "Test save failure" } })
        const selection = request.postDataJSON()
        writes.push({ method: "POST", ...selection })
        for (const code of selection.codes) {
          let row = rows.find(item => item.catalog?.code === code)
          if (!row) {
            const entry = catalog.find(item => item.code === code)
            assert.notEqual(entry.treatment, "DEDUCT")
            row = { id: rows.length + 1, code, name: entry.names.en, catalog: entry, description: null, system: true, displayOrder: 50 }
            rows.push(row)
          }
          row.active = true
        }
        body = rows
      } else throw Error("Unexpected request " + request.method() + " " + path)
      await route.fulfill({ headers, json: body })
    })
    await page.goto(origin + "/tests/fixtures/cost-catalog.html")
    await page.getByRole("rowheader", { name: purchase.catalog.names[language], exact: true }).waitFor()
    assert.equal(await page.locator("details").count(), 0, "custom rubric creation section is removed")
    assert.equal(await page.locator(".cost-rubric-form").count(), 0)
    assert.equal(await page.locator("tbody tr").count(), 11)
    await page.getByRole("button", { name: t.remove, exact: true }).click()
    await page.getByRole("button", { name: t.remove + ": " + purchase.catalog.names[language], exact: true }).click()
    await page.waitForFunction(() => document.querySelectorAll("tbody tr").length === 10)
    assert.equal(purchase.active, false)
    await page.reload()
    await page.getByRole("button", { name: t.add, exact: true }).waitFor({ state: "visible" })
    await page.waitForFunction(() => document.querySelectorAll("tbody tr").length === 10)
    await page.getByRole("button", { name: t.add, exact: true }).click()
    const dialog = page.locator("dialog.cost-catalog-dialog")
    await dialog.getByRole("button", { name: t.costs, exact: true }).click()
    const discount = catalog.find(entry => entry.code === "TRADE_DISCOUNTS")
    assert.equal(await dialog.getByRole("checkbox", { name: new RegExp(discount.names[language]) }).isDisabled(), true)
    await dialog.getByRole("checkbox", { name: purchase.catalog.names[language], exact: true }).check()
    await dialog.getByLabel(t.category, { exact: true }).selectOption("LOGISTICS")
    await dialog.getByRole("button", { name: t.costs, exact: true }).click()
    const freight = catalog.find(entry => entry.code === "INTERNATIONAL_FREIGHT")
    await dialog.getByRole("checkbox", { name: freight.names[language], exact: true }).hover()
    assert.ok((await dialog.locator(".cost-catalog-help").innerText()).includes(freight.descriptions[language]))
    await dialog.getByRole("checkbox", { name: freight.names[language], exact: true }).check()
    assert.equal(await dialog.locator(".cost-catalog-selected li").count(), 2)
    await page.screenshot({ path: shots + "/" + language + "-" + width + ".png", fullPage: true })
    assert.equal(await dialog.evaluate(element => element.scrollWidth > element.clientWidth), false)
    failSave = true
    await dialog.getByRole("button", { name: t.add, exact: true }).click()
    await page.getByRole("alertdialog").waitFor()
    assert.equal(await dialog.locator(".cost-catalog-selected li").count(), 2)
    await page.getByRole("alertdialog").getByRole("button").click()
    failSave = false
    await dialog.getByRole("button", { name: t.add, exact: true }).click()
    await dialog.waitFor({ state: "hidden" })
    assert.equal(await page.locator("tbody tr").count(), 12)
    assert.equal(purchase.id, purchaseId)
    assert.equal(purchase.active, true)
    await page.getByRole("button", { name: t.add, exact: true }).click()
    await dialog.getByRole("button", { name: t.cancel, exact: true }).click()
    assert.equal(writes.filter(write => write.method === "POST").length, 1)
    assert.deepEqual(errors, [])
    console.log("PASS", language, width, "default list, remove/reload/restore, multi-select, descriptions, disabled deductions, save failure, cancel")
    await context.close()
  }
} finally { await browser.close() }
