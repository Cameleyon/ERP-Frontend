import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { mkdir } from "node:fs/promises"

const { chromium } = createRequire(import.meta.url)("playwright")
const origin = process.env.HISTORY_PREVIEW_URL || "http://127.0.0.1:5203"
const browser = await chromium.launch({ headless: true, channel: "msedge" })
try {
  for (const [language, width, title, tab, monday, opens, closes, overnight, saveHours, event, type, saveDate, saved] of [
    ["en", 1100, "Settings", "Opening days and hours", "Monday", "Opens", "Closes", "Closing time is on the following day", "Save opening hours", "Special event", "Day status", "Save date", "Saved."],
    ["fr", 390, "Paramètres", "Jours et heures d’ouverture", "lundi", "Ouverture", "Fermeture", "L’heure de fermeture est le lendemain", "Enregistrer les horaires", "Événement particulier", "Statut du jour", "Enregistrer la date", "Enregistré."],
    ["es", 390, "Configuración", "Días y horas de apertura", "lunes", "Apertura", "Cierre", "La hora de cierre corresponde al día siguiente", "Guardar horario", "Evento especial", "Estado del día", "Guardar fecha", "Guardado."],
  ]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    await page.addInitScript(lang => localStorage.setItem("cameleyon-ui-language", lang), language)
    const settings = { locationId: 9, effectiveFrom: null, weekdays: [], dates: [], schedules: [] }
    let hoursPayload
    let datePayload
    let hoursWrites = 0
    let failNextHours = false
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
          hoursWrites++
          hoursPayload = request.postDataJSON()
          if (failNextHours) { failNextHours = false; status = 500 }
          else {
            settings.effectiveFrom = hoursPayload.effectiveFrom
            settings.weekdays = hoursPayload.weekdays
            settings.schedules = [hoursPayload]
          }
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
    const edit = language === "fr" ? "Modifier les horaires" : language === "es" ? "Editar horario" : "Edit opening hours"
    const cancel = language === "fr" ? "Annuler" : language === "es" ? "Cancelar" : "Cancel"
    const close = language === "fr" ? "Fermer" : language === "es" ? "Cerrar" : "Close"
    const mondayCheckbox = page.getByRole("checkbox", { name: monday, exact: true })
    const opensInput = page.getByLabel(monday + " " + opens, { exact: true })
    const saveButton = page.getByRole("button", { name: saveHours, exact: true })
    await page.getByRole("button", { name: edit, exact: true }).waitFor()
    assert.equal(await page.locator(".opening-hours-header").getByRole("button", { name: edit, exact: true }).count(), 1)
    assert.equal(await page.locator(".opening-hours-header").getByRole("button", { name: saveHours, exact: true }).count(), 1)
    const headerAlignment = await page.locator(".opening-hours-header").evaluate(node => {
      const header = node.getBoundingClientRect(), actions = node.querySelector(".form-actions").getBoundingClientRect()
      return Math.abs(header.right - actions.right) < 2
    })
    assert.equal(headerAlignment, true)
    assert.equal(await mondayCheckbox.isDisabled(), true)
    assert.equal(await opensInput.isDisabled(), true)
    assert.equal(await page.locator("input[type=date]").isDisabled(), true)
    assert.equal(await saveButton.isDisabled(), true)
    await page.getByRole("button", { name: edit, exact: true }).click()
    assert.equal(await mondayCheckbox.isDisabled(), false)
    assert.equal(await saveButton.isDisabled(), true)
    await opensInput.fill("21:00")
    assert.equal(await saveButton.isDisabled(), false)
    await opensInput.fill("22:00")
    assert.equal(await saveButton.isDisabled(), true)
    await opensInput.fill("21:00")
    await page.getByRole("button", { name: cancel, exact: true }).click()
    assert.equal(await opensInput.inputValue(), "22:00")
    assert.equal(await opensInput.isDisabled(), true)
    assert.equal(hoursWrites, 1)
    await page.getByRole("button", { name: edit, exact: true }).click()
    await opensInput.fill("21:00")
    failNextHours = true
    await saveButton.click()
    await page.getByRole("alertdialog").waitFor()
    await page.getByRole("button", { name: close, exact: true }).click()
    assert.equal(await opensInput.isDisabled(), false)
    assert.equal(await opensInput.inputValue(), "21:00")
    assert.equal(await saveButton.isDisabled(), false)
    await saveButton.click()
    await page.getByRole("button", { name: edit, exact: true }).waitFor()
    assert.equal(await opensInput.isDisabled(), true)
    assert.equal(hoursWrites, 3)
    assert.equal(settings.weekdays[0].opensAt, "21:00")
    await page.reload()
    await page.getByRole("button", { name: tab, exact: true }).click()
    await page.getByRole("button", { name: edit, exact: true }).waitFor()
    assert.equal(await opensInput.isDisabled(), true)
    assert.equal(await opensInput.inputValue(), "21:00")
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
