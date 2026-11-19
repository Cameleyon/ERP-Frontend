import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { mkdir } from "node:fs/promises"
const { chromium } = createRequire(import.meta.url)("playwright")
const origin = process.env.PROFILE_PREVIEW_URL || "http://127.0.0.1:5203"
const browser = await chromium.launch({ headless: true, channel: "msedge" })
await mkdir("docs/screenshots/profile-sections", { recursive: true })
const copy = {
  en: { company: "Company", users: "Users", addUser: "Add user", sites: "Sites", addSite: "Add a site", noUsers: "No users found.", noSites: "No sites found.", info: "Company information" },
  fr: { company: "Entreprise", users: "Utilisateurs", addUser: "Ajouter un utilisateur", sites: "Sites", addSite: "Ajouter un site", noUsers: "Aucun utilisateur trouvé.", noSites: "Aucun site trouvé.", info: "Informations de l'entreprise" },
  es: { company: "Empresa", users: "Usuarios", addUser: "Añadir un usuario", sites: "Sedes", addSite: "Añadir una sede", noUsers: "No se encontraron usuarios.", noSites: "No se encontraron sedes.", info: "Información de la empresa" },
}
async function setup(language, width, { empty = true, role = "ADMIN", owner = true, currency = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 1000 } })
  const page = await context.newPage(), errors = []
  page.on("pageerror", error => errors.push(error.message))
  await page.addInitScript(lang => { localStorage.setItem("camelyon_token", "isolated-profile-sections"); localStorage.setItem("cameleyon-ui-language", lang) }, language)
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith("/api/")) return route.continue()
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, OPTIONS" }
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers })
    assert.equal(route.request().method(), "GET")
    let body
    if (path === "/api/auth/me") body = { id: 5, firstName: "Demo", lastName: "Owner", email: "owner@example.invalid", role, companyOwner: owner, companyId: 7, companyName: "Cameleyon demos store", preferredLanguage: null, locations: [] }
    else if (path === "/api/company/profile") body = { companyId: 7, name: "Cameleyon demos store", active: true, currencyCode: "HTG", timeZoneId: "Etc/GMT+5" }
    else if (path === "/api/company/subscription") body = { companyId: 7, planName: "Basic", planCode: "BASIC", status: "TRIAL", paymentProvider: "NONE", accessStartAt: "2026-11-01T12:00:00Z", accessEndAt: "2027-01-30T12:00:00Z" }
    else if (path === "/api/company/users") body = empty ? [] : [{ id: 6, firstName: "Test", lastName: "Cashier", email: "cashier@example.invalid", role: "CASHIER", active: true, locations: [] }]
    else if (path === "/api/company/locations/all") body = empty ? [] : [{ id: 9, name: "Main site", active: true, timeZoneId: "Etc/GMT+5" }]
    else if (path === "/api/auth/email-consent") body = { productUpdates: false }
    else throw new Error("Unmocked profile endpoint " + path)
    await route.fulfill({ status: 200, contentType: "application/json", headers, body: JSON.stringify(body) })
  })
  await page.goto(origin + "/tests/fixtures/profile.html" + (currency ? "?currency=1" : ""))
  await page.waitForFunction(count => document.querySelectorAll(".profile-section").length === count, role === "ADMIN" ? owner ? 10 : 8 : 2)
  const panel = title => page.locator(".profile-section").filter({ has: page.locator("summary h3", { hasText: new RegExp("^" + title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$") }) })
  return { context, page, errors, panel }
}
try {
  for (const language of ["en", "fr", "es"]) for (const width of [1280, 390]) {
    const text = copy[language]
    const t = await setup(language, width, { empty: width === 390 })
    assert.equal(await t.page.locator(".profile-section[open]").count(), 0)
    await t.page.screenshot({ path: `docs/screenshots/profile-sections/${language}-${width}-collapsed.png` })
    const company = t.panel(text.company), users = t.panel(text.users), userForm = t.panel(text.addUser), sites = t.panel(text.sites), siteForm = t.panel(text.addSite)
    assert.equal(await company.locator(".detail-grid").isVisible(), false)
    await company.locator("summary").focus(); await t.page.keyboard.press("Enter")
    assert.equal(await company.locator(".detail-grid").isVisible(), true)
    assert.ok((await company.innerText()).includes("Cameleyon demos store"))
    await users.locator("summary").click(); await sites.locator("summary").click()
    assert.equal(await users.locator("table").isVisible(), true)
    assert.equal(await users.locator("form").count(), 0)
    assert.equal(await sites.locator("form").count(), 0)
    assert.equal(await userForm.locator("table").count(), 0)
    assert.equal(await siteForm.locator("table").count(), 0)
    const bars = await t.page.locator(".profile-section > summary").allTextContents()
    assert.ok(bars.findIndex(title => title.trim() === text.users) < bars.findIndex(title => title.trim() === text.addUser))
    assert.ok(bars.findIndex(title => title.trim() === text.sites) < bars.findIndex(title => title.trim() === text.addSite))
    if (width === 390) {
      await users.getByText(text.noUsers, { exact: true }).waitFor()
      await sites.getByText(text.noSites, { exact: true }).waitFor()
    } else {
      await users.getByText("Test", { exact: true }).waitFor()
      await sites.getByText("Main site", { exact: true }).waitFor()
    }
    assert.equal(await t.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await t.page.screenshot({ path: `docs/screenshots/profile-sections/${language}-${width}-lists.png`, fullPage: true })
    await userForm.locator("summary").click()
    await userForm.locator("input[type=text]").first().fill("Unsaved name")
    await userForm.locator("summary").click(); await userForm.locator("summary").click()
    assert.equal(await userForm.locator("input[type=text]").first().inputValue(), "Unsaved name")
    await siteForm.locator("summary").click()
    assert.equal(await siteForm.locator("form").isVisible(), true)
    assert.equal(await users.locator("table").isVisible(), true, "opening a form must not remove the list")
    assert.deepEqual(t.errors, [])
    await t.context.close()
    console.log("PASS profile sections", language, width)
  }
  for (const [role, owner] of [["ADMIN", false], ["CASHIER", false]]) {
    const t = await setup("en", 1280, { role, owner })
    assert.equal(await t.panel(copy.en.addUser).count(), 0)
    assert.equal(await t.panel(copy.en.info).count(), role === "ADMIN" ? 1 : 0)
    assert.equal(await t.panel(copy.en.addSite).count(), role === "ADMIN" ? 1 : 0)
    await t.context.close()
  }
  const currency = await setup("en", 1280, { currency: true })
  const field = currency.page.getByPlaceholder("USD, HTG, CAD...")
  await field.waitFor()
  assert.equal(await currency.panel(copy.en.info).getAttribute("open"), "")
  assert.equal(await field.isEnabled(), true)
  assert.equal(await field.evaluate(node => node === document.activeElement), true)
  await currency.context.close()
  console.log("PASS profile permissions and direct currency setup")
} finally { await browser.close() }
