import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { mkdir } from "node:fs/promises"

const { chromium } = createRequire(import.meta.url)("playwright")
const origin = process.env.HISTORY_PREVIEW_URL || "http://127.0.0.1:5203"
const browser = await chromium.launch({ headless: true, channel: "msedge" })
try {
  for (const [language, width, title, tab, monday, opens, closes, overnight, saveHours, event, type, saveDate, saved] of [
    ["en", 1100, "Settings", "Opening days and hours", "Monday", "Opens", "Closes", "Closes next day", "Save opening hours", "Special event", "Day status", "Save date", "Saved."],
    ["fr", 390, "Paramètres", "Jours et heures d’ouverture", "lundi", "Ouverture", "Fermeture", "Ferme le lendemain", "Enregistrer les horaires", "Événement particulier", "Statut du jour", "Enregistrer la date", "Enregistré."],
    ["es", 390, "Configuración", "Días y horas de apertura", "lunes", "Apertura", "Cierre", "Cierra al día siguiente", "Guardar horario", "Evento especial", "Estado del día", "Guardar fecha", "Guardado."],
  ]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    await page.addInitScript(lang => localStorage.setItem("cameleyon-ui-language", lang), language)
    const settings = { locationId: 9, effectiveFrom: null, weekdays: [], dates: [], schedules: [] }
    let hoursPayload
    let datePayload
    await page.route("**/api/**", async route => {
      const request = route.request()
      const path = new URL(request.url()).pathname
      if (!path.startsWith("/api/")) return route.continue()
      let result = null
      let status = 200
      if (path.endsWith("/company/locations")) result = [{ id: 9, name: "Test site" }]
      if (path.endsWith("/company/profile")) result = { currencyCode: "HTG", timeZoneId: "Etc/GMT+5" }
      if (request.method() === "PUT") {
        status = 204
        if (path.endsWith("/hours")) {
          hoursPayload = request.postDataJSON()
          settings.effectiveFrom = hoursPayload.effectiveFrom
          settings.weekdays = hoursPayload.weekdays
          settings.schedules = [hoursPayload]
        } else {
          datePayload = request.postDataJSON()
          const date = path.split("/").at(-1)
          settings.dates = settings.dates.filter(row => row.date !== date)
          if (datePayload.dayType !== "REGULAR" || datePayload.eventDescription) settings.dates.push({ date, ...datePayload })
        }
      } else if (path.endsWith("/history/calendar")) result = { businessTimeZone: "Etc/GMT+5", calendar: settings }
      await route.fulfill({ status, contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "GET, PUT, OPTIONS" }, body: status === 204 ? "" : JSON.stringify(result) })
    })
    await page.goto(origin + "/tests/fixtures/calendar-settings.html")
    await page.getByRole("heading", { name: title, exact: true }).waitFor()
    assert.equal(await page.locator(".settings-tabs button").count(), 2)
    const month = page.locator("input[type=month]")
    await month.waitFor()
    await month.fill("2026-11")
    await page.getByRole("button", { name: "2026-11-20", exact: true }).click()
    await page.getByLabel(type, { exact: true }).selectOption("CLOSED")
    await page.getByRole("textbox", { name: new RegExp(event) }).fill("Local festival")
    await page.getByRole("button", { name: saveDate, exact: true }).click()
    await page.getByRole("status").filter({ hasText: saved }).waitFor()
    assert.deepEqual(datePayload, { dayType: "CLOSED", eventDescription: "Local festival" })
    await page.getByRole("button", { name: "2026-11-20: Local festival", exact: true }).waitFor()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    if (process.env.HISTORY_SCREENSHOT_DIR) {
      await mkdir(process.env.HISTORY_SCREENSHOT_DIR, { recursive: true })
      await page.screenshot({ path: process.env.HISTORY_SCREENSHOT_DIR + "/calendar-settings-" + language + ".png", fullPage: true })
    }
    await page.getByRole("button", { name: tab, exact: true }).click()
    await page.locator("input[type=date]").fill("2026-11-01")
    await page.getByRole("checkbox", { name: monday, exact: true }).check()
    await page.getByLabel(monday + " " + opens, { exact: true }).fill("22:00")
    await page.getByLabel(monday + " " + closes, { exact: true }).fill("02:00")
    await page.locator(".opening-hours-row").first().getByRole("checkbox", { name: overnight, exact: true }).check()
    await page.getByRole("button", { name: saveHours, exact: true }).click()
    await page.getByRole("status").filter({ hasText: saved }).waitFor()
    assert.equal(hoursPayload.weekdays.length, 7)
    assert.deepEqual(hoursPayload.weekdays[0], { weekday: 1, open: true, opensAt: "22:00", closesAt: "02:00", closesNextDay: true })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await page.getByRole("checkbox", { name: monday, exact: true }).waitFor()
    if (process.env.HISTORY_SCREENSHOT_DIR) {
      await page.screenshot({ path: process.env.HISTORY_SCREENSHOT_DIR + "/calendar-hours-" + language + ".png", fullPage: true })
    }
    const back = language === "fr" ? "Retour au profil" : language === "es" ? "Volver al perfil" : "Back to Profile"
    await page.getByRole("button", { name: back, exact: true }).click()
    assert.equal(await page.title(), "Back to Profile")
    await page.close()
    console.log("Settings calendar and hours passed:", language, width)
  }
} finally { await browser.close() }
