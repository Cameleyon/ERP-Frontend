import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { mkdir } from "node:fs/promises"
const { chromium } = createRequire(import.meta.url)("playwright")
const origin = process.env.PROFILE_PREVIEW_URL || "http://127.0.0.1:5203"
const screenshots = process.env.PROFILE_SCREENSHOT_DIR
const browser = await chromium.launch({ headless: true, channel: "msedge" })
if (screenshots) await mkdir(screenshots, { recursive: true })
try {
  for (const [language, width, title, userTitle, companyTitle] of [
    ["es", 1280, "Perfil", "Perfil de usuario", "Información de la empresa"],
    ["es", 390, "Perfil", "Perfil de usuario", "Información de la empresa"],
    ["fr", 1280, "Profil", "Profil utilisateur", "Informations de l'entreprise"],
    ["en", 1280, "Profile", "User profile", "Company information"],
  ]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } })
    const page = await context.newPage()
    await page.addInitScript(lang => { localStorage.setItem("camelyon_token", "isolated-profile-test"); localStorage.setItem("cameleyon-ui-language", lang) }, language)
    const errors = []
    page.on("pageerror", error => errors.push(error.message))
    await page.route("**/api/**", async route => {
      const path = new URL(route.request().url()).pathname
      if (!path.startsWith("/api/")) return route.continue()
      const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, OPTIONS" }
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers })
      assert.equal(route.request().method(), "GET", "translation checks must not mutate an account")
      let body
      if (path === "/api/auth/me") body = { id: 5, firstName: "Demo", lastName: "Owner", email: "owner@example.invalid", role: "ADMIN", companyOwner: true,
        companyId: 7, companyName: "Tienda de prueba", preferredLanguage: null, termsAccepted: true, locations: [] }
      else if (path === "/api/company/profile") body = { companyId: 7, name: "Tienda de prueba", active: true, currencyCode: "HTG", timeZoneId: "Etc/GMT+5" }
      else if (path === "/api/company/users") body = [{ id: 6, firstName: "Demo", lastName: "User", email: "user@example.invalid", role: "CASHIER", active: true, locations: [], feeConsentAccepted: true, feeConsentAcceptedAt: "2026-11-18T12:00:00Z", feeAmountUsd: "5.00" }]
      else if (path === "/api/company/locations/all") body = [{ id: 9, name: "Tienda de prueba", active: true, timeZoneId: "Etc/GMT+5", feeConsentAccepted: true }]
      else if (path === "/api/company/subscription") body = { companyId: 7, planName: "Basic", planCode: "BASIC", status: "TRIAL", billingMode: "AUTOMATIC_CARD", billingCycle: "MONTHLY",
        paymentCollectionMethod: "CARD", paymentProvider: "NONE", accessStartAt: "2026-11-01T12:00:00Z", accessEndAt: "2027-01-30T12:00:00Z", autoRenew: false, requiresPaymentMethod: false, notes: null }
      else if (path === "/api/auth/email-consent") body = { productUpdates: false }
      else throw new Error("Unmocked profile endpoint: " + path)
      await route.fulfill({ status: 200, headers, contentType: "application/json", body: JSON.stringify(body) })
    })
    await page.goto(origin + "/tests/fixtures/profile.html")
    await page.getByRole("heading", { name: title, exact: true }).waitFor()
    await page.getByRole("heading", { name: userTitle, exact: true }).waitFor()
    const accountContent = await page.locator("#profile-account").innerText()
    const open = key => page.locator(`button[aria-controls="profile-${key}"]`).click()
    await open("company")
    await page.getByRole("heading", { name: companyTitle, exact: true }).waitFor()
    if (language === "es") {
      await open("users")
      await page.getByRole("heading", { name: "Usuarios", exact: true }).waitFor()
      const usersContent = await page.locator("#profile-users").innerText()
      await open("sites")
      await page.getByRole("heading", { name: "Sedes", exact: true }).waitFor()
      await open("billing")
      for (const heading of ["Suscripción", "Método de pago"]) await page.getByRole("heading", { name: heading, exact: true }).waitFor()
      assert.equal(await page.getByRole("button", { name: "Configuración", exact: true }).count(), 0)
      await page.getByRole("button", { name: "Registrar tarjeta de crédito", exact: true }).waitFor()
      await page.getByText("Detalles de facturación", { exact: true }).click()
      const content = [accountContent, usersContent, await page.locator("main").innerText()].join(" ")
      for (const translated of ["Administrador", "Cajero", "Período de prueba", "Mensual", "Pago automático con tarjeta", "Renovación automática", "Preferencias de correo electrónico"]) assert.ok(content.includes(translated), translated)
      for (const untranslated of ["Company information", "User profile", "Fee impact", "Payment method required", "Register credit card", "Subscription"]) assert.ok(!content.includes(untranslated), untranslated)
      await open("account")
      const passwordRow = page.locator(".profile-edit-row").filter({ has: page.locator("strong", { hasText: /^Contraseña:/ }) })
      await passwordRow.getByRole("button", { name: "Editar", exact: true }).click()
      await page.getByPlaceholder("Contraseña actual", { exact: true }).fill("current-password")
      await page.getByPlaceholder("Nueva contraseña", { exact: true }).fill("new-password-one")
      await page.getByPlaceholder("Confirmar contraseña", { exact: true }).fill("new-password-two")
      if (screenshots) await page.screenshot({ path: `${screenshots}/profile-password-es-${width}.png` })
      await page.getByRole("button", { name: "Cambiar contraseña", exact: true }).click()
      await page.getByText("Las nuevas contraseñas no coinciden", { exact: true }).waitFor()
    }
    assert.deepEqual(errors, [])
    await context.close()
    console.log("PASS profile localization", language, width)
  }
} finally { await browser.close() }
