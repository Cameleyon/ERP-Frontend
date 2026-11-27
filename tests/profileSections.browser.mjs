import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { mkdir } from "node:fs/promises"

const { chromium } = createRequire(import.meta.url)("playwright")
const origin = process.env.PROFILE_PREVIEW_URL || "http://127.0.0.1:5203"
const screenshots = process.env.PROFILE_SCREENSHOT_DIR
const browser = await chromium.launch({ headless: true, channel: "msedge" })
if (screenshots) await mkdir(screenshots, { recursive: true })
const testUser = { id: 6, firstName: "Test", lastName: "Cashier", email: "cashier@example.invalid", role: "CASHIER", active: true, locations: [] }
const testSite = { id: 9, name: "Main site", active: true, timeZoneId: "Etc/GMT+5" }
async function setup(language, width, { role = "ADMIN", owner = true, currency = false, plan = "TRIAL", empty = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 1000 } })
  const page = await context.newPage(), errors = [], writes = []
  page.on("pageerror", error => errors.push(error.message))
  await page.addInitScript(lang => {
    localStorage.setItem("camelyon_token", "isolated-profile-sections")
    localStorage.setItem("cameleyon-ui-language", lang)
  }, language)
  const account = { id: 5, firstName: "Demo", lastName: "Owner", email: "owner@example.invalid", role, companyOwner: owner,
    companyId: 7, companyName: "Cameleyon Demos Store", preferredLanguage: null, locations: [] }
  await page.route("**/api/**", async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (!path.startsWith("/api/")) return route.continue()
    const method = request.method()
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS" }
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers })
    let body, status = 200
    if (method !== "GET") {
      const data = request.postDataJSON()
      writes.push({ path, data })
      if (path === "/api/company/users/6/status") body = { ...testUser, active: data.active }
      else if (path === "/api/company/users") body = { ...testUser, ...data, id: 8, locations: [] }
      else if (path === "/api/company/locations") body = { ...testSite, ...data, id: 10 }
      else if (path === "/api/auth/profile") { Object.assign(account, data); body = { ...account, user: account, token: "isolated-profile-sections" } }
      else if (path === "/api/auth/change-password") status = 204
      else throw new Error("Unexpected write: " + path)
    } else if (path === "/api/auth/me") body = account
    else if (path === "/api/company/profile") body = { companyId: 7, name: account.companyName, active: true, currencyCode: "HTG", timeZoneId: "Etc/GMT+5" }
    else if (path === "/api/company/subscription") {
      if (plan === "EXPIRED") { status = 403; body = { message: "Company subscription access has expired" } }
      else body = { companyId: 7, planName: "Basic", planCode: "BASIC", status: plan, autoRenew: plan !== "TRIAL",
        paymentProvider: plan === "TRIAL" ? "NONE" : "STRIPE", accessStartAt: "2026-11-01T12:00:00Z", accessEndAt: "2027-01-30T12:00:00Z" }
    } else if (path === "/api/company/users") body = empty ? [] : [testUser]
    else if (path === "/api/company/locations/all") body = empty ? [] : [testSite]
    else if (path === "/api/auth/email-consent") body = { productUpdates: false }
    else if (path.endsWith("/payment-method")) body = { provider: "STRIPE", hasPaymentMethod: true, cardBrand: "Visa", cardLast4: "4242" }
    else throw new Error("Unmocked profile endpoint " + path)
    await route.fulfill({ status, contentType: "application/json", headers, body: status === 204 ? "" : JSON.stringify(body) })
  })
  await page.goto(origin + "/tests/fixtures/profile.html" + (currency ? "?currency=1" : ""))
  await page.locator(".admin-workspace h1").waitFor()
  return { context, page, errors, writes }
}
async function pick(page, key) {
  const button = page.locator(`button[aria-controls="profile-${key}"]`)
  await button.focus()
  await page.keyboard.press("Enter")
  assert.equal(await button.getAttribute("aria-pressed"), "true")
  await page.locator("#profile-" + key).waitFor()
}
async function capture(page, name) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  if (screenshots) await page.screenshot({ path: screenshots + "/" + name + ".png", fullPage: true })
}
try {
  for (const [language, width] of [["en", 1440], ["fr", 390], ["es", 320]]) {
    const { context, page, errors } = await setup(language, width)
    await page.locator("#profile-account").waitFor()
    await capture(page, "profile-account-" + language)
    for (const key of ["sites", "users", "company", "billing"]) {
      await pick(page, key)
      if (key === "sites") await page.locator("#profile-sites table").getByText("Main site", { exact: true }).waitFor()
      if (key === "users") await page.getByText("cashier@example.invalid", { exact: true }).waitFor()
      await capture(page, "profile-" + key + "-" + language)
    }
    await pick(page, "users")
    const add = page.locator("#profile-users summary")
    await add.click()
    await page.locator("#profile-users input[type=text]").first().fill("Unsaved name")
    await pick(page, "sites")
    await pick(page, "users")
    assert.equal(await page.locator("#profile-users input[type=text]").first().inputValue(), "Unsaved name")
    assert.deepEqual(errors, [])
    await context.close()
    console.log("PASS Profile sections and responsive layout", language, width)
  }
  for (const [role, owner] of [["ADMIN", false], ["CASHIER", false]]) {
    const { context, page } = await setup("en", 1280, { role, owner, empty: true })
    await page.locator("#profile-account").waitFor()
    assert.equal(await page.locator("#profile-users summary").count(), 0)
    assert.equal(await page.locator("#profile-company").count(), role === "ADMIN" ? 1 : 0)
    if (role === "ADMIN") {
      await pick(page, "sites")
      await page.getByText("No sites found.", { exact: true }).waitFor()
      await pick(page, "users")
      await page.getByText("No users found.", { exact: true }).waitFor()
    }
    await context.close()
  }
  const currency = await setup("en", 1280, { currency: true })
  const field = currency.page.getByPlaceholder("USD, HTG, CAD...")
  await field.waitFor()
  assert.equal(await field.isEnabled(), true)
  await currency.page.waitForFunction(() => document.activeElement?.getAttribute("aria-describedby") === "setup-currency-reason")
  await currency.context.close()

  const owner = await setup("en", 1440)
  const { page, writes } = owner
  await pick(page, "account")
  await page.getByRole("button", { name: "Edit First name", exact: true }).click()
  await page.getByRole("textbox", { name: "First name", exact: true }).fill("Updated")
  await page.getByRole("button", { name: "Save profile", exact: true }).click()
  await page.getByText("Updated", { exact: true }).waitFor()
  assert.equal(writes.at(-1).data.firstName, "Updated")
  await pick(page, "users")
  const deactivate = page.getByRole("button", { name: "Deactivate", exact: true })
  page.once("dialog", dialog => dialog.dismiss())
  await deactivate.click()
  assert.equal(writes.length, 1)
  page.once("dialog", dialog => dialog.accept())
  await deactivate.click()
  await page.getByRole("button", { name: "Reactivate", exact: true }).click()
  await deactivate.waitFor()
  assert.deepEqual(writes.slice(1).map(write => write.data.active), [false, true])
  await page.locator("#profile-users summary").click()
  const createUser = page.locator("#profile-users form")
  for (const [name, value] of [["First name", "New"], ["Last name", "Clerk"], ["Email", "new@example.invalid"], ["Password", "test-password-123"]]) {
    await createUser.getByLabel(name, { exact: true }).fill(value)
  }
  await createUser.getByRole("button", { name: "Add user", exact: true }).click()
  await page.getByRole("alertdialog").waitFor()
  assert.equal(writes.length, 3)
  await page.getByRole("button", { name: "Close", exact: true }).click()
  await createUser.getByRole("checkbox", { name: /5 USD/ }).check()
  await createUser.getByRole("button", { name: "Add user", exact: true }).click()
  await page.getByText("new@example.invalid", { exact: true }).waitFor()
  assert.deepEqual(writes.at(-1).data.locationIds, [])
  assert.equal(writes.at(-1).data.feeConsentAccepted, true)
  await pick(page, "sites")
  await page.locator("#profile-sites summary").click()
  const createSite = page.locator("#profile-sites form")
  await createSite.locator("input").first().fill("North site")
  await createSite.getByRole("button", { name: "Add site", exact: true }).click()
  await page.getByRole("alertdialog").waitFor()
  assert.equal(writes.length, 4)
  await page.getByRole("button", { name: "Close", exact: true }).click()
  await createSite.getByRole("checkbox", { name: /9.99 USD/ }).check()
  await createSite.getByRole("button", { name: "Add site", exact: true }).click()
  await page.locator("#profile-sites table").getByText("North site", { exact: true }).waitFor()
  assert.equal(writes.at(-1).data.feeConsentAccepted, true)
  assert.deepEqual(owner.errors, [])
  await owner.context.close()
  console.log("PASS Profile edits, owner fee consent, and user activation safeguards")

  for (const [plan, width] of [["TRIAL", 390], ["ACTIVE", 1440], ["EXPIRED", 320]]) {
    const { context, page, writes } = await setup("en", width, { plan })
    if (plan === "EXPIRED") {
      await page.getByRole("heading", { name: "Your subscription access has ended." }).waitFor()
      assert.equal(await page.getByRole("link", { name: "Contact support" }).getAttribute("href"), "https://www.cameleyondynamics.com/contact")
      assert.equal(await page.locator("#profile-billing").count(), 0)
    } else {
      await pick(page, "billing")
      await page.getByRole("button", { name: plan === "ACTIVE" ? "Open billing portal" : "Register credit card" }).waitFor()
      assert.equal(await page.getByText("Trial ends:", { exact: true }).count(), plan === "TRIAL" ? 1 : 0)
    }
    assert.equal(writes.length, 0)
    await capture(page, "subscription-" + plan.toLowerCase())
    await context.close()
  }
  console.log("PASS Profile permissions, currency handoff, and trial/paid/expired billing")
} finally { await browser.close() }
