import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { mkdir } from "node:fs/promises"
const { chromium } = createRequire(import.meta.url)("playwright")
const origin = process.env.SIDEBAR_PREVIEW_URL || "http://127.0.0.1:5203"
const browser = await chromium.launch({ headless: true, channel: "msedge" })
await mkdir("docs/screenshots/sidebar", { recursive: true })
try {
  for (const [language, logout, profile, settings, menu, admin] of [
    ["en", "Logout", "Profile", "Settings", "Menu", "Administrator"],
    ["fr", "Déconnexion", "Profil", "Paramètres", "Menu", "Administrateur"],
    ["es", "Cerrar sesión", "Perfil", "Configuración", "Menú", "Administrador"],
  ]) for (const width of [1280, 390]) for (const role of ["ADMIN", "CASHIER"]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    const page = await context.newPage()
    const errors = []
    page.on("pageerror", error => errors.push(error.message))
    await page.addInitScript(lang => { localStorage.setItem("camelyon_token", "isolated-sidebar-test"); localStorage.setItem("cameleyon-ui-language", lang) }, language)
    await page.route("**/api/**", async route => {
      const path = new URL(route.request().url()).pathname
      if (!path.startsWith("/api/")) return route.continue()
      const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, OPTIONS" }
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers })
      assert.equal(route.request().method(), "GET")
      let body
      if (path === "/api/auth/me") body = { id: 5, firstName: "Demo", lastName: "User", email: "demo@example.invalid", role,
        companyId: 7, companyName: "CAMELEYON Demo", preferredLanguage: null, locations: [] }
      else if (path === "/api/company/subscription") body = { status: "ACTIVE" }
      else throw new Error("Unmocked endpoint " + path)
      await route.fulfill({ status: 200, contentType: "application/json", headers, body: JSON.stringify(body) })
    })
    await page.goto(origin + "/tests/fixtures/sidebar.html")
    await page.locator("#selected-page").waitFor()
    async function openMobile() { if (width < 768) await page.getByRole("button", { name: menu, exact: true }).click() }
    await openMobile()
    const sidebar = page.locator("aside.sidebar")
    const logoutButton = sidebar.getByRole("button", { name: logout, exact: true })
    assert.equal(await sidebar.locator(".sidebar-user-actions").getByRole("button", { name: logout, exact: true }).count(), 1)
    assert.equal(await sidebar.locator(".sidebar-footer").getByRole("button", { name: logout, exact: true }).count(), 0)
    const profileButton = sidebar.locator(".sidebar-footer-actions").getByRole("button", { name: profile, exact: true })
    assert.equal(await profileButton.count(), 1)
    const settingsButton = sidebar.locator(".sidebar-footer-actions").getByRole("button", { name: settings, exact: true })
    assert.equal(await settingsButton.count(), role === "ADMIN" ? 1 : 0)
    if (role === "ADMIN") {
      await sidebar.getByText(admin, { exact: true }).waitFor()
      const positions = await sidebar.locator(".sidebar-user-actions").evaluate(node => {
        const a = node.querySelector("span").getBoundingClientRect(), b = node.querySelector("button").getBoundingClientRect()
        return { aligned: Math.abs(a.y + a.height / 2 - b.y - b.height / 2) < 2, separated: a.right <= b.left }
      })
      assert.deepEqual(positions, { aligned: true, separated: true })
      assert.ok((await profileButton.boundingBox()).x < (await settingsButton.boundingBox()).x)
      await settingsButton.click()
      assert.equal(await page.locator("#selected-page").textContent(), "settings")
      if (width < 768) assert.equal(await sidebar.evaluate(node => node.classList.contains("sidebar-open")), false)
      await openMobile()
      assert.ok((await settingsButton.getAttribute("class")).includes("active"))
      assert.ok(!(await profileButton.getAttribute("class")).includes("active"))
    }
    await profileButton.click()
    assert.equal(await page.locator("#selected-page").textContent(), "profile")
    await openMobile()
    assert.ok((await profileButton.getAttribute("class")).includes("active"))
    assert.equal(await sidebar.evaluate(node => node.scrollWidth <= node.clientWidth), true)
    if (role === "ADMIN") await page.screenshot({ path: `docs/screenshots/sidebar/${language}-${width}.png` })
    await logoutButton.click()
    await page.locator("#signed-out").waitFor()
    assert.equal(await page.evaluate(() => localStorage.getItem("camelyon_token")), null)
    assert.deepEqual(errors, [])
    await context.close()
    console.log("PASS sidebar", language, width, role)
  }
} finally { await browser.close() }
