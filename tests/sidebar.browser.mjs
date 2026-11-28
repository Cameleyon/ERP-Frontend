import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { mkdir } from "node:fs/promises"
import { messages } from "../src/i18n/messages.ts"
import { internalCopy } from "../src/i18n/internalCopy.ts"
import { calendarCopy } from "../src/components/profile/calendarCopy.ts"

const { chromium } = createRequire(import.meta.url)("playwright")
const origin = process.env.SIDEBAR_PREVIEW_URL || "http://127.0.0.1:5203"
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error("Browser tests require a local server")
const screenshots = process.env.SIDEBAR_SCREENSHOT_DIR
if (screenshots) await mkdir(screenshots, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: "msedge" })
try {
  for (const language of ["en", "fr", "es"]) for (const width of [1280, 390, 320]) for (const role of ["ADMIN", "CASHIER"]) {
    const copy = messages[language]
    const theme = {
      en: { custom: undefined, background: "rgb(6, 46, 73)", text: "rgb(255, 255, 255)", icon: "rgb(229, 247, 239)" },
      fr: { custom: "#e1eef8", background: "rgb(225, 238, 248)", text: "rgb(0, 0, 0)", icon: "rgb(0, 0, 0)" },
      es: { custom: "#332054", background: "rgb(51, 32, 84)", text: "rgb(255, 255, 255)", icon: "rgb(255, 255, 255)" },
    }[language]
    const context = await browser.newContext({ viewport: { width, height: 520 } })
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
          companySidebarColor: theme.custom, companyPrimaryColor: "#683fb0", companyLogoUrl: origin + "/src/assets/homepage-logo.png",
        } })
        if (url.pathname === "/api/company/subscription") return route.fulfill({ headers, json: { status: "ACTIVE" } })
        if (url.pathname === "/api/company/locations") return route.fulfill({ headers, json: [
          { id: 9, name: "Main site", active: true },
          { id: 10, name: "Second site", active: true },
        ] })
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
    assert.equal(await sidebar.evaluate(node => getComputedStyle(node).backgroundColor), theme.background)
    assert.equal(await sidebar.evaluate(node => getComputedStyle(node).color), theme.text)
    assert.equal(await sidebar.locator(".sidebar-company-logo").count(), 1)
    assert.equal(await page.locator(".internal-shell").evaluate(node => getComputedStyle(node).getPropertyValue("--workspace-action")), "#683fb0")
    const saleLabels = [copy.sidebar.newSale, copy.sidebar.salesHistory]
    const labels = role === "ADMIN" ? [
      copy.sidebar.dashboard, ...saleLabels, copy.sidebar.customers, copy.sidebar.products,
      copy.sidebar.inventory, copy.sidebar.costRubrics, copy.common.profile, calendarCopy[language].settings,
    ] : saleLabels
    const buttons = sidebar.locator(".sidebar-nav button")
    assert.deepEqual(await buttons.allTextContents(), labels)
    const shapes = new Set()
    for (const label of labels) {
      const button = sidebar.getByRole("button", { name: label, exact: true })
      const icon = button.locator("svg")
      for (const [attr, expected] of Object.entries({
        "aria-hidden": "true", focusable: "false", viewBox: "0 0 24 24", stroke: "currentColor",
        "stroke-width": "1.75", "stroke-linecap": "round", "stroke-linejoin": "round",
      })) assert.equal(await icon.getAttribute(attr), expected)
      const { width: iconWidth, height: iconHeight, color, shape } = await icon.evaluate(el => ({
        width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height,
        color: getComputedStyle(el).color, shape: el.innerHTML,
      }))
      assert.deepEqual([iconWidth, iconHeight], [22, 22])
      assert.equal(color, await button.getAttribute("aria-current") === "page" ? "rgb(6, 46, 73)" : theme.icon)
      assert.ok(shape && !shapes.has(shape), "Each destination has a distinct drawing")
      shapes.add(shape)
    }
    await buttons.first().focus()
    await page.keyboard.press("Tab")
    assert.deepEqual(await buttons.nth(1).evaluate(el => ({
      focused: document.activeElement === el, visible: el.matches(":focus-visible"),
      outline: getComputedStyle(el).outlineStyle, color: getComputedStyle(el).outlineColor,
    })), { focused: true, visible: true, outline: "solid", color: theme.text })
    assert.equal(await sidebar.evaluate(node => node.scrollWidth <= node.clientWidth), true)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    if (mobile && language === "fr") {
      const history = sidebar.getByRole("button", { name: copy.sidebar.salesHistory, exact: true })
      const dimensions = await history.evaluate(button => {
        button.style.width = "140px"
        try {
          const icon = button.querySelector("svg").getBoundingClientRect()
          const label = button.querySelector(".workspace-nav-label")
          return { icon: icon.width, wraps: label.getBoundingClientRect().height > parseFloat(getComputedStyle(label).lineHeight),
            fits: button.scrollWidth <= button.clientWidth }
        } finally { button.style.removeProperty("width") }
      })
      assert.deepEqual(dimensions, { icon: 22, wraps: true, fits: true })
    }
    if (role === "ADMIN") {
      const header = sidebar.locator(".workspace-sidebar-header")
      const site = header.locator(".workspace-menu-site select")
      await site.waitFor()
      const scroller = sidebar.locator(".workspace-sidebar-scroll")
      const before = await header.boundingBox()
      const logout = sidebar.getByRole("button", { name: copy.common.logout, exact: true })
      assert.equal(await scroller.evaluate(el => el.scrollHeight > el.clientHeight), true)
      assert.equal(await scroller.evaluate(el => getComputedStyle(el, "::-webkit-scrollbar").width), "9px")
      assert.equal(await scroller.evaluate(el => getComputedStyle(el, "::-webkit-scrollbar-track").backgroundColor), theme.background)
      assert.equal(await scroller.evaluate(el => getComputedStyle(el, "::-webkit-scrollbar-thumb").borderRadius), "100px")
      await scroller.evaluate(el => { el.scrollTop = el.scrollHeight })
      assert.ok(await scroller.evaluate(el => el.scrollTop > 0))
      const after = await header.boundingBox()
      assert.ok(Math.abs(after.y - before.y) < 1, "Logo and site panel stay fixed during menu scrolling")
      const last = await logout.boundingBox()
      const visible = await scroller.boundingBox()
      assert.ok(last.y + last.height <= visible.y + visible.height + 1, "The footer remains reachable")
      await site.selectOption("10")
      assert.equal(await header.locator(".workspace-menu-site strong").textContent(), "Second site")
    }
    const target = role === "ADMIN" ? calendarCopy[language].settings : copy.sidebar.salesHistory
    await sidebar.getByRole("button", { name: target, exact: true }).click()
    assert.equal(await page.locator("#selected-page").textContent(), role === "ADMIN" ? "settings" : "sales-history")
    if (mobile) {
      await dialog.waitFor({ state: "hidden" })
      assert.equal(await menu.getAttribute("aria-expanded"), "false")
      await menu.click()
    }
    assert.equal(await sidebar.getByRole("button", { name: target, exact: true }).getAttribute("aria-current"), "page")
    const active = sidebar.getByRole("button", { name: target, exact: true })
    assert.deepEqual(await active.evaluate(el => [getComputedStyle(el).backgroundColor, getComputedStyle(el.querySelector("svg")).color]),
      ["rgb(138, 239, 203)", "rgb(6, 46, 73)"])
    await active.focus()
    await page.keyboard.press("Shift+Tab")
    await page.keyboard.press("Tab")
    assert.deepEqual(await active.evaluate(el => [el.matches(":focus-visible"), getComputedStyle(el).outlineColor]),
      [true, "rgb(6, 46, 73)"])
    if (screenshots && role === "ADMIN" && (language === "en" || width === 390)) {
      await page.setViewportSize({ width, height: 940 })
      await sidebar.locator(".workspace-sidebar-scroll").evaluate(el => { el.scrollTop = 0 })
      await page.mouse.move(width - 1, 0)
      const view = mobile ? page : sidebar
      await view.screenshot({ path: `${screenshots}/sidebar-${language}-${width}.png` })
    }
    await sidebar.getByRole("button", { name: copy.common.logout, exact: true }).click()
    await page.locator("#signed-out").waitFor()
    assert.equal(await page.evaluate(() => localStorage.getItem("camelyon_token")), null)
    assert.deepEqual(errors, [])
    await context.close()
    console.log("PASS sidebar", language, width, role)
  }
} finally { await browser.close() }
