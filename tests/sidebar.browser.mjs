import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { messages } from "../src/i18n/messages.ts"
import { internalCopy } from "../src/i18n/internalCopy.ts"
import { calendarCopy } from "../src/components/profile/calendarCopy.ts"

const { chromium } = createRequire(import.meta.url)("playwright")
const origin = process.env.SIDEBAR_PREVIEW_URL || "http://127.0.0.1:5203"
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error("Browser tests require a local server")
const browser = await chromium.launch({ headless: true, channel: "msedge" })
try {
  for (const language of ["en", "fr", "es"]) for (const width of [1280, 390]) for (const role of ["ADMIN", "CASHIER"]) {
    const copy = messages[language]
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    const page = await context.newPage()
    const errors = []
    page.on("pageerror", error => errors.push(error.message))
    await page.addInitScript(lang => { localStorage.setItem("camelyon_token", "sidebar-test"); localStorage.setItem("cameleyon-ui-language", lang) }, language)
    await page.route("**/*", async route => {
      const url = new URL(route.request().url())
      if (url.pathname.startsWith("/api/")) {
        const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type" }
        if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers })
        if (url.pathname === "/api/auth/me") return route.fulfill({ headers, json: {
          id: 5, firstName: "Demo", lastName: "User", role, companyId: 7, companyName: "CAMELEYON Demo",
          companySidebarColor: "#e1eef8", companyPrimaryColor: "#683fb0", companyLogoUrl: origin + "/src/assets/homepage-logo.png",
        } })
        if (url.pathname === "/api/company/subscription") return route.fulfill({ headers, json: { status: "ACTIVE" } })
        throw new Error("Unmocked endpoint " + url.pathname)
      }
      return url.origin === origin ? route.continue() : route.abort()
    })
    await page.goto(origin + "/tests/fixtures/sidebar.html")
    await page.locator("#selected-page").waitFor()
    const menu = page.getByRole("button", { name: copy.common.menu, exact: true })
    const dialog = page.getByRole("dialog", { name: internalCopy[language].navigation })
    const sidebar = page.locator(".workspace-sidebar:visible")
    const mobile = width <= 768
    if (mobile) {
      await menu.focus()
      await page.keyboard.press("Enter")
      await dialog.waitFor()
      assert.equal(await page.evaluate(() => document.activeElement.textContent), internalCopy[language].closeMenu)
      await page.keyboard.press("Escape")
      await dialog.waitFor({ state: "hidden" })
      assert.equal(await menu.evaluate(node => document.activeElement === node), true)
      await menu.click()
    }
    assert.equal(await sidebar.evaluate(node => getComputedStyle(node).backgroundColor), "rgb(225, 238, 248)")
    assert.equal(await sidebar.evaluate(node => getComputedStyle(node).color), "rgb(0, 0, 0)")
    assert.equal(await sidebar.locator(".sidebar-company-logo").count(), 1)
    assert.equal(await page.locator(".internal-shell").evaluate(node => getComputedStyle(node).getPropertyValue("--workspace-action")), "#683fb0")
    assert.equal(await sidebar.locator(".sidebar-nav button").count(), role === "ADMIN" ? 9 : 2)
    assert.equal(await sidebar.evaluate(node => node.scrollWidth <= node.clientWidth), true)
    const target = role === "ADMIN" ? calendarCopy[language].settings : copy.sidebar.salesHistory
    await sidebar.getByRole("button", { name: target, exact: true }).click()
    assert.equal(await page.locator("#selected-page").textContent(), role === "ADMIN" ? "settings" : "sales-history")
    if (mobile) {
      await dialog.waitFor({ state: "hidden" })
      assert.equal(await menu.getAttribute("aria-expanded"), "false")
      await menu.click()
    }
    assert.equal(await sidebar.getByRole("button", { name: target, exact: true }).getAttribute("aria-current"), "page")
    await sidebar.getByRole("button", { name: copy.common.logout, exact: true }).click()
    await page.locator("#signed-out").waitFor()
    assert.equal(await page.evaluate(() => localStorage.getItem("camelyon_token")), null)
    assert.deepEqual(errors, [])
    await context.close()
    console.log("PASS sidebar", language, width, role)
  }
} finally { await browser.close() }
