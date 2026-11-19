import assert from "node:assert/strict"
import { createRequire } from "node:module"

const { chromium } = createRequire(import.meta.url)("playwright")
const browser = await chromium.launch({ headless: true, channel: "msedge" })
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } })
  await page.addInitScript(() => localStorage.setItem("cameleyon-ui-language", "fr"))
  const apiRequests = []
  const errors = []
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) apiRequests.push(request.url()) })
  page.on("pageerror", error => errors.push(error.message))
  await page.goto("http://127.0.0.1:5203/tests/fixtures/calendar-settings.html?demo=1")
  await page.getByRole("heading", { name: "Paramètres", exact: true }).waitFor()
  await page.getByText("Local demo site", { exact: true }).waitFor({ state: "attached" })
  assert.equal(await page.locator(".settings-tabs button").count(), 2)
  await page.locator("input[type=month]").fill("2026-11")
  await page.getByRole("button", { name: "2026-11-20", exact: true }).click()
  await page.getByLabel("Statut du jour", { exact: true }).selectOption("CLOSED")
  await page.getByRole("button", { name: "Enregistrer la date", exact: true }).click()
  await page.getByRole("status").filter({ hasText: "Enregistré." }).waitFor()
  await page.getByRole("button", { name: "Jours et heures d’ouverture", exact: true }).click()
  await page.getByRole("checkbox", { name: "lundi", exact: true }).waitFor()
  assert.deepEqual(apiRequests, [])
  assert.deepEqual(errors, [])
  console.log("Self-contained local settings preview passed: no backend requests or browser errors")
} finally { await browser.close() }
