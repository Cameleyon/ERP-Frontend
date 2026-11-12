import assert from "node:assert/strict"
import { pathToFileURL } from "node:url"
import { mkdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href : "playwright")
const origin = process.env.SIGNUP_TEST_ORIGIN || "http://127.0.0.1:5208"
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error("Browser tests require a local server")
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH })
const screenshots = join(tmpdir(), "cameleyon-signup-errors")
await mkdir(screenshots, { recursive: true })
const token = "12345678-1234-4234-8234-123456789012"
const labels = {
  en: { signup: "Sign up", submit: "Create my account", confirm: "Confirm code", resend: "Resend code" },
  fr: { signup: "S'inscrire", submit: "Créer mon compte", confirm: "Confirmer le code", resend: "Renvoyer le code" },
  es: { signup: "Registrarse", submit: "Crear mi cuenta", confirm: "Confirmar código", resend: "Reenviar el código" },
}
try {
  for (const language of ["en", "fr", "es"]) {
    for (const width of [375, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } })
      const page = await context.newPage()
      const events = []
      const runtimeErrors = []
      let mode = "internal"
      let confirmation = "incorrect"
      let resend = "cooldown"
      let submissionCount = 0
      page.on("pageerror", error => runtimeErrors.push(error.message))
      await page.route("**/*", async route => {
        const request = route.request()
        const url = new URL(request.url())
        if (url.hostname === "js.stripe.com") {
          return route.fulfill({ contentType: "application/javascript",
            body: "window.Stripe = function () { return { _registerWrapper() {}, registerAppInfo() {} } }" })
        }
        if (url.pathname === "/api/analytics/visit") {
          events.push(request.postDataJSON())
          return route.fulfill({ status: 204 })
        }
        if (url.pathname.endsWith("/signup-company/resend")) {
          return route.fulfill(resend === "cooldown" ? { status: 429, json: { code: "RESEND_COOLDOWN" } }
            : { json: { pendingSignupId: token, adminEmail: "owner@example.com", attemptsRemaining: 2, expiresAt: "2026-11-10T12:00:00" } })
        }
        if (url.pathname.endsWith("/signup-company/confirm")) {
          if (confirmation !== "success") {
            return route.fulfill({ json: { verified: false, expired: confirmation === "expired",
              requiresRestart: false, attemptsRemaining: 2, signup: null,
              errorCode: confirmation === "expired" ? "CODE_EXPIRED" : "INVALID_CODE" } })
          }
          return route.fulfill({ json: { verified: true, expired: false, requiresRestart: false,
            attemptsRemaining: 3, signup: { companyId: 40, adminEmail: "owner@example.com" } } })
        }
        if (url.pathname.endsWith("/signup-company")) {
          submissionCount++
          return route.fulfill(mode === "internal"
            ? { status: 500, json: { message: "SQL secret password=hidden owner@example.com", code: "INTERNAL_ERROR", reference: token } }
            : { status: 201, json: { pendingSignupId: token, adminEmail: "owner@example.com", attemptsRemaining: 3, expiresAt: "2026-11-10T12:00:00" } })
        }
        if (url.pathname.startsWith("/api/")) return route.fulfill({ json: [] })
        if (url.origin !== origin) return route.abort()
        return route.continue()
      })
      await page.goto(origin + "/" + language)
      await page.locator(".public-nav-primary").click()
      await page.getByRole("button", { name: labels[language].submit, exact: true }).click()
      const alert = page.locator(".public-signup-form [role=alert]")
      await alert.waitFor()
      for (const code of ["COMPANY_NAME_REQUIRED", "EMAIL_REQUIRED", "PASSWORD_REQUIRED", "TERMS_REQUIRED"]) {
        assert.ok((await alert.innerText()).includes(code))
      }
      assert.equal(submissionCount, 0)
      assert.equal(await page.locator("input[aria-invalid=true]").count(), 4)
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      await page.screenshot({ path: join(screenshots, language + "-" + width + "-fields.png"), fullPage: true })
      await page.locator('input[autocomplete="organization"]').fill("Example business")
      await page.locator('input[type="email"]').fill("owner@example.com")
      await page.locator('input[type="password"]').fill("password123")
      await page.locator('input[type="checkbox"]').check()
      await page.getByRole("button", { name: labels[language].submit, exact: true }).click()
      const errorDialog = page.getByRole("alertdialog").filter({ hasText: "INTERNAL_ERROR" })
      await errorDialog.waitFor()
      assert.ok((await errorDialog.innerText()).includes(token))
      assert.ok(!(await errorDialog.innerText()).includes("SQL secret"))
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      await page.screenshot({ path: join(screenshots, language + "-" + width + "-internal.png"), fullPage: true })
      assert.equal(await page.locator('input[autocomplete="organization"]').inputValue(), "Example business")
      await page.keyboard.press("Escape")
      await errorDialog.waitFor({ state: "detached" })
      mode = "success"
      await page.getByRole("button", { name: labels[language].submit, exact: true }).click()
      const dialog = page.locator("dialog[open]")
      await dialog.waitFor()
      assert.equal(await dialog.locator("#signup-resend-hint").isVisible(), true)
      await dialog.getByRole("button", { name: labels[language].resend, exact: true }).click()
      await page.waitForFunction(() => document.querySelector("dialog [role=alert]")?.textContent.includes("RESEND_COOLDOWN"))
      await dialog.locator('input[autocomplete="one-time-code"]').fill("abc")
      await dialog.getByRole("button", { name: labels[language].confirm, exact: true }).click()
      await page.waitForFunction(() => document.querySelector("dialog [role=alert]")?.textContent.includes("CODE_FORMAT_INVALID"))
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      await page.screenshot({ path: join(screenshots, language + "-" + width + ".png"), fullPage: true })
      await dialog.locator('input[autocomplete="one-time-code"]').fill("000000")
      await dialog.getByRole("button", { name: labels[language].confirm, exact: true }).click()
      await page.waitForFunction(() => document.querySelector("dialog [role=alert]")?.textContent.includes("INVALID_CODE"))
      assert.ok((await dialog.locator("strong").innerText()).includes("2"))
      confirmation = "expired"
      await dialog.getByRole("button", { name: labels[language].confirm, exact: true }).click()
      await page.waitForFunction(() => document.querySelector("dialog [role=alert]")?.textContent.includes("CODE_EXPIRED"))
      assert.equal(await dialog.getByRole("button", { name: labels[language].confirm, exact: true }).isDisabled(), true)
      resend = "success"
      await dialog.getByRole("button", { name: labels[language].resend, exact: true }).click()
      await dialog.getByRole("status").waitFor()
      assert.ok((await dialog.locator("strong").innerText()).includes("2"))
      confirmation = "success"
      await dialog.locator('input[autocomplete="one-time-code"]').fill("123456")
      await Promise.all([
        page.waitForResponse(response => new URL(response.url()).pathname === "/api/analytics/visit"
          && response.request().postDataJSON()?.eventType === "COMPLETED"),
        dialog.getByRole("button", { name: labels[language].confirm, exact: true }).click(),
      ])
      await page.locator(".login-card, .login-page").first().waitFor()
      assert.equal(await page.locator('input[type=email]').inputValue(), "owner@example.com")
      assert.equal(events.filter(event => event.eventType === "COMPLETED").length, 1)
      for (const reason of ["COMPANY_NAME_REQUIRED", "EMAIL_REQUIRED", "PASSWORD_REQUIRED", "TERMS_REQUIRED", "INTERNAL_ERROR", "RESEND_COOLDOWN", "CODE_FORMAT_INVALID", "INVALID_CODE", "CODE_EXPIRED"]) {
        assert.ok(events.some(event => event.reasonCode === reason), reason)
      }
      assert.ok(events.every(event => !JSON.stringify(event).includes("owner@example.com") && !JSON.stringify(event).includes("password123")))
      assert.deepEqual(runtimeErrors, [])
      await context.close()
      console.log("PASS signup flow " + language + " " + width)
    }
  }
  console.log("Screenshots: " + screenshots)
} finally { await browser.close() }
