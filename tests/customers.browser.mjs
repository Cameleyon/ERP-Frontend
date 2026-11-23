import assert from "node:assert/strict"
import { createRequire } from "node:module"
const { chromium } = createRequire(import.meta.url)("playwright")
const browser = await chromium.launch({ channel: "msedge", headless: true })
const origin = process.env.PRODUCT_SEARCH_PREVIEW_URL || "http://127.0.0.1:5203"
try {
  for (const [lang, width] of [["en", 1440], ["fr", 375], ["es", 768]]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } })
    const page = await context.newPage(), errors = [], requests = []
    let fail = false
    const clients = [
      { id: 1, name: "Émile Client", phone: "111", email: "one@example.invalid", emailOptIn: false },
      { id: 2, name: "Émile Client", phone: "222", email: "two@example.invalid", emailOptIn: true },
      { id: 3, name: "Other", phone: null, email: null, emailOptIn: false },
    ]
    page.on("pageerror", e => errors.push(e.message))
    await page.addInitScript(language => {
      localStorage.setItem("camelyon_token", "isolated-client-search")
      localStorage.setItem("cameleyon-ui-language", language)
    }, lang)
    await page.route("**/api/**", async route => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname
      if (!path.startsWith("/api/")) return route.continue()
      const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS" }
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers })
      requests.push(path)
      let json
      if (path === "/api/auth/me") json = { id: 8, companyId: 7, role: "ADMIN", companyTimeZoneId: "Etc/GMT+5" }
      else if (path === "/api/customers") json = clients
      else if (path === "/api/customers/2" && req.method() === "PUT") {
        Object.assign(clients[1], req.postDataJSON()); json = clients[1]
      } else if (path.startsWith("/api/sales/customer/")) {
        if (fail) return route.fulfill({ status: 503, headers, json: { message: "Unavailable" } })
        const number = Number(url.searchParams.get("page"))
        json = { items: path.endsWith("/3") ? [] : [{ id: number + 1, saleNumber: `SALE-${number + 1}`,
          soldAt: "2026-11-22T10:00:00", locationName: "Site A", totalAmount: 10, status: "COMPLETED" }],
          total: path.endsWith("/3") ? 0 : 21, size: 20, page: number }
      } else throw Error("Unexpected request " + req.method() + " " + path)
      return route.fulfill({ json, headers })
    })
    await page.goto(origin + "/tests/fixtures/customers.html")
    const input = page.getByRole("combobox")
    await input.fill("emile")
    assert.equal(await page.locator("table").count(), 0, "no directory table")
    const options = page.getByRole("listbox").getByRole("option")
    assert.equal(await options.count(), 2)
    assert.ok((await options.nth(1).innerText()).includes("222"))
    await input.press("ArrowDown"); await input.press("ArrowDown"); await input.press("Enter")
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("cell", { name: "SALE-1", exact: true }).waitFor()
    assert.ok(requests.includes("/api/sales/customer/2"), "same-name selection uses customer ID")
    const labels = dialog.locator("form label")
    assert.equal(await labels.nth(1).locator("input").inputValue(), "222")
    await labels.first().locator("input").fill("Updated Client")
    await dialog.locator("form button").first().click()
    await dialog.getByRole("status").waitFor()
    await dialog.locator(".customer-purchase-pagination button").last().click()
    await dialog.getByRole("cell", { name: "SALE-2", exact: true }).waitFor()
    assert.ok(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1))
    await page.screenshot({ path: process.env.TEMP + `/clients-${lang}.png` })
    await page.keyboard.press("Escape")
    assert.equal(await page.locator("dialog").count(), 0)
    assert.equal(await input.inputValue(), "Updated Client")
    await input.fill("Other"); await page.getByRole("option").click()
    await dialog.locator("h3").waitFor()
    await page.waitForTimeout(100)
    assert.equal(await dialog.locator("table").count(), 0)
    await page.keyboard.press("Escape")
    fail = true
    await input.fill("emile"); await page.getByRole("option").click()
    await dialog.getByRole("alert").waitFor()
    fail = false
    await dialog.getByRole("alert").getByRole("button").click()
    await dialog.getByRole("cell", { name: "SALE-1", exact: true }).waitFor()
    assert.deepEqual(errors, [])
    console.log("PASS", lang, width, "suggestions, ID selection, editing, pagination, empty history, retry")
    await context.close()
  }
} finally { await browser.close() }
