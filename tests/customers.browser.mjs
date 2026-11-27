import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { mkdir } from "node:fs/promises"
import { messages } from "../src/i18n/messages.ts"
import { customerWorkspaceCopy } from "../src/components/customers/customerWorkspaceCopy.ts"

const { chromium } = createRequire(import.meta.url)("playwright")
const origin = process.env.PRODUCT_SEARCH_PREVIEW_URL || "http://127.0.0.1:5250"
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) throw Error("Use a local preview")
const screenshots = process.env.CUSTOMER_SCREENSHOTS
if (screenshots) await mkdir(screenshots, { recursive: true })
const browser = await chromium.launch({ channel: "msedge", headless: true })

try {
  for (const [language, width] of [["en", 1440], ["en", 390], ["fr", 390], ["es", 320]]) {
    const context = await browser.newContext({ viewport: { width, height: 940 } })
    const page = await context.newPage(), errors = [], requests = []
    const copy = messages[language], text = copy.customersPage, history = copy.salesHistoryPage
    const labels = customerWorkspaceCopy[language]
    let failHistory = false, cancelled = false, failCancel = false, failDetail = false, directoryEmpty = false
    const sale = { id: 1, saleNumber: "SALE-1", soldAt: "2026-11-22T10:00:00", locationName: "Main site", totalAmount: 10,
      subtotalAmount: 10, taxAmount: 0, customerName: "Émile Laurent", paymentMethod: "CASH", status: "COMPLETED",
      items: [{ productId: 1, productName: "Test purchase item", quantity: 1, unitPrice: 10, lineTotal: 10 }] }
    const clients = [
      { id: 1, name: "Émile Laurent", phone: "111", email: "one@example.invalid", emailOptIn: false },
      { id: 2, name: "Émile Laurent", phone: "222", email: "two@example.invalid", emailOptIn: true },
      { id: 3, name: "María Fernanda de la Cruz Montemayor", phone: null,
        email: "maria.fernanda.delacruz.montemayor@example.invalid", emailOptIn: false },
    ]
    const button = (name, root = page) => root.getByRole("button", { name, exact: true })
    const count = (method, path) => requests.filter(item => item.method === method && item.path === path).length
    const screenshot = async state => {
      if (screenshots) await page.screenshot({ path: `${screenshots}/${state}-${language}-${width}.png` })
    }
    const fits = async () => assert.ok(await page.locator("main").evaluate(el =>
      el.scrollWidth <= el.clientWidth && document.documentElement.scrollWidth <= innerWidth))
    page.on("pageerror", e => errors.push(e.message))
    await page.addInitScript(lang => {
      localStorage.setItem("camelyon_token", "synthetic-customer-directory")
      localStorage.setItem("cameleyon-ui-language", lang)
    }, language)
    await page.route("**/api/**", async route => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname, method = req.method()
      if (!path.startsWith("/api/")) return route.continue()
      const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS" }
      if (method === "OPTIONS") return route.fulfill({ status: 204, headers })
      requests.push({ path, method, url, body: req.postDataJSON() })
      const reply = (json, status = 200) => route.fulfill({ json, headers, status })
      if (path === "/api/auth/me") return reply({ id: 8, companyId: 7, role: "ADMIN", companyName: "Cameleyon Demo Store",
        companyCurrencyCode: "USD", companyTimeZoneId: "Etc/GMT+5" })
      if (path === "/api/company/locations") return reply([])
      if (path === "/api/company/subscription") return reply({ invoiceEmailEnabled: false })
      if (path === "/api/customers" && method === "GET") return reply(directoryEmpty ? [] : clients)
      if (path === "/api/customers" && method === "POST") {
        const body = req.postDataJSON()
        if (body.name === "Server rejection") return reply({ message: "Fixture customer rejection" }, 400)
        const created = { ...body, id: 4 }
        clients.push(created)
        return reply(created, 201)
      }
      if (path === "/api/customers/2" && method === "PUT") {
        Object.assign(clients[1], req.postDataJSON())
        return reply(clients[1])
      }
      if (path === "/api/customers/2" && method === "DELETE") return reply({ message: "Fixture: customer has sales" }, 409)
      if (path === "/api/customers/4" && method === "DELETE") {
        clients.splice(clients.findIndex(customer => customer.id === 4), 1)
        return route.fulfill({ status: 204, headers })
      }
      if (path === "/api/sales/1") return failDetail ? reply({ message: "Fixture detail failure" }, 503)
        : reply({ ...sale, status: cancelled ? "CANCELLED" : "COMPLETED" })
      if (path === "/api/sales/1/cancel") {
        assert.equal(method, "POST")
        if (failCancel) return reply({ message: "Fixture cancellation failure" }, 503)
        cancelled = true
        return reply({ ...sale, status: "CANCELLED" })
      }
      if (path.startsWith("/api/sales/customer/")) {
        if (failHistory) return reply({ message: "Fixture unavailable" }, 503)
        const number = Number(url.searchParams.get("page"))
        assert.equal(url.searchParams.get("size"), "20")
        const empty = path.endsWith("/3") || path.endsWith("/4")
        return reply({ items: empty ? [] : [{ ...sale, id: number + 1, saleNumber: `SALE-${number + 1}`,
          status: cancelled && number === 0 ? "CANCELLED" : "COMPLETED" }], total: empty ? 0 : 21, size: 20, page: number })
      }
      throw Error("Unexpected request " + method + " " + path)
    })
    await page.goto(origin + "/tests/fixtures/customers.html")
    const input = page.getByRole("combobox", { name: labels.search })
    const directory = page.locator(".customer-directory-table")
    const record = page.locator(".customer-record")
    const editor = page.locator(".customer-editor")
    const purchases = page.locator(".customer-purchases")
    await directory.waitFor()
    assert.equal(await directory.locator("tbody tr").count(), 3, "The directory is visible before typing")
    assert.equal(await editor.count(), 0)
    await fits()
    await screenshot("directory")
    await input.fill("emile")
    assert.equal(await directory.locator("tbody tr").count(), 2)
    const options = page.getByRole("listbox").getByRole("option")
    assert.equal(await options.count(), 2)
    assert.match(await options.nth(1).innerText(), /222[\s\S]*two@example/)
    await screenshot("same-name-search")
    await input.press("ArrowDown"); await input.press("ArrowDown"); await input.press("Enter")
    await record.getByRole("heading", { name: "Émile Laurent", exact: true }).waitFor()
    await purchases.getByRole("rowheader", { name: "SALE-1", exact: true }).waitFor()
    assert.ok(requests.some(item => item.path === "/api/sales/customer/2"))
    assert.ok(!requests.some(item => item.path === "/api/sales/customer/1"))
    assert.match(await record.innerText(), /#2[\s\S]*222[\s\S]*two@example/)
    assert.equal(await editor.count(), 0, "Details are read-only until Edit")
    await fits()
    await screenshot("customer-details")
    const purchase = purchases.getByRole("row").filter({ hasText: "SALE-1" })
    await button(history.viewDetails, purchase).click()
    const invoice = page.locator(".customer-purchase-details")
    await invoice.getByRole("cell", { name: "Test purchase item", exact: true }).waitFor()
    await page.keyboard.press("Escape")
    await invoice.waitFor({ state: "hidden" })
    failDetail = true
    await button(history.viewDetails, purchase).click()
    await invoice.getByRole("alert").waitFor()
    failDetail = false
    await button(history.viewDetails, invoice.getByRole("alert")).click()
    await invoice.getByRole("cell", { name: "Test purchase item", exact: true }).waitFor()
    await page.keyboard.press("Escape")
    await invoice.waitFor({ state: "hidden" })
    page.once("dialog", dialog => dialog.dismiss())
    await button(history.cancel, purchase).click()
    assert.equal(count("POST", "/api/sales/1/cancel"), 0)
    failCancel = true
    page.once("dialog", dialog => dialog.accept())
    await button(history.cancel, purchase).click()
    const purchaseError = page.getByRole("alertdialog")
    await purchaseError.waitFor()
    await purchaseError.getByRole("button").click()
    await purchaseError.waitFor({ state: "hidden" })
    failCancel = false
    page.once("dialog", dialog => dialog.accept())
    await button(history.cancel, purchase).click()
    await purchase.locator(".status-cancelled").waitFor()
    assert.equal(await button(history.cancel, purchase).count(), 0)
    assert.equal(count("POST", "/api/sales/1/cancel"), 2)

    await button(history.nextPage, purchases).click()
    await purchases.getByRole("rowheader", { name: "SALE-2", exact: true }).waitFor()
    await button(text.editCustomer).click()
    const name = editor.getByRole("textbox", { name: text.name, exact: true })
    await name.fill("Updated Client")
    assert.equal(await editor.locator("input[type=tel]").inputValue(), "222")
    assert.equal(await editor.getByRole("checkbox").isChecked(), true)
    await screenshot("edit")
    await button(text.updateCustomer, editor).click()
    await record.getByRole("heading", { name: "Updated Client", exact: true }).waitFor()
    assert.equal(count("PUT", "/api/customers/2"), 1)
    await purchases.getByRole("rowheader", { name: "SALE-2", exact: true }).waitFor()
    await screenshot("updated-customer")
    await button(labels.delete).click()
    const confirm = page.getByRole("dialog")
    await confirm.waitFor()
    assert.match(await confirm.innerText(), /Updated Client[\s\S]*#2[\s\S]*222/)
    assert.equal(await button(labels.delete, confirm).evaluate(node => getComputedStyle(node).backgroundColor), "rgb(158, 37, 48)")
    await screenshot("delete")
    await page.keyboard.press("Escape")
    await confirm.waitFor({ state: "hidden" })
    assert.equal(count("DELETE", "/api/customers/2"), 0)
    await button(labels.delete).click()
    await button(labels.delete, confirm).click()
    await confirm.getByRole("alert").getByText("Fixture: customer has sales").waitFor()
    assert.equal(count("DELETE", "/api/customers/2"), 1)
    await button(text.cancel, confirm).click()
    await button(labels.back).click()
    await input.fill("missing name")
    await page.getByText(text.emptyFiltered, { exact: true }).waitFor()

    failHistory = true
    await input.fill("Updated")
    await input.press("Enter")
    await purchases.getByRole("alert").waitFor()
    await record.getByText("two@example.invalid", { exact: true }).waitFor()
    await screenshot("purchase-error")
    failHistory = false
    await button(labels.retry, purchases).click()
    await purchases.getByRole("rowheader", { name: "SALE-1", exact: true }).waitFor()
    await button(labels.back).click()
    await button(text.newCustomer).click()
    await editor.waitFor()
    assert.equal(await editor.getByRole("checkbox").isChecked(), false)
    assert.equal(await editor.locator("input[required]").count(), 1)
    await screenshot("new-customer")
    await name.fill("Server rejection")
    const email = editor.locator("input[type=email]")
    await email.fill("invalid")
    await button(text.createCustomer, editor).click()
    assert.equal(await email.evaluate(el => el.validity.typeMismatch), true)
    assert.equal(count("POST", "/api/customers"), 0)
    assert.equal(await name.inputValue(), "Server rejection")
    await screenshot("invalid-email")
    await email.fill("")
    await button(text.createCustomer, editor).click()
    await editor.getByRole("alert").getByText("Fixture customer rejection").waitFor()
    assert.equal(await name.inputValue(), "Server rejection")
    await name.fill("Émile Laurent")
    await button(text.createCustomer, editor).click()
    await page.getByRole("status").getByText(text.createSuccess, { exact: true }).waitFor()
    const posted = requests.filter(item => item.method === "POST" && item.path === "/api/customers").at(-1).body
    assert.deepEqual(posted, { name: "Émile Laurent", phone: "", email: "", emailOptIn: false })
    await screenshot("created-customer")
    await button(labels.view).click()
    await record.getByText(new RegExp("#4$")).waitFor()
    await purchases.getByText(labels.noPurchases, { exact: true }).waitFor()
    await button(labels.delete).click()
    await button(labels.delete, confirm).click()
    await page.getByRole("status").getByText(text.deleteSuccess, { exact: true }).waitFor()
    assert.equal(count("DELETE", "/api/customers/4"), 1)
    assert.equal(clients.filter(client => client.id === 2).length, 1)
    await fits()
    directoryEmpty = true
    await page.reload()
    await page.getByText(text.empty, { exact: true }).waitFor()
    await screenshot("empty-directory")
    assert.deepEqual(errors, [])
    console.log("PASS", language, width, "directory, same names, create, validation, details, edit, purchase actions/paging/retry, deletion")
    await context.close()
  }
} finally { await browser.close() }
