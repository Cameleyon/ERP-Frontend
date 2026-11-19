import assert from "node:assert/strict"
import { test } from "node:test"
import { companyToday, currentWeek, presetRange, forecastView, mergeTrend, kpiForecastPeriod, kpiForecastValue, ForecastSessionCache, formatBusinessDate } from "../src/utils/dashboardForecast.ts"
import { forecastCopy } from "../src/components/dashboard/forecastCopy.ts"
import { forecastFixture, actualFixture, today, weekStart, weekEnd } from "./fixtures/forecast-data.mjs"
const week = { startDate: weekStart, endDate: weekEnd }
const expected = { week, zone: "Etc/GMT+5", currency: "USD", siteIds: [9], selectedSite: 9 }

test("business calendar week is Monday-Sunday across browser time zones and year boundaries", () => {
  assert.equal(companyToday("Etc/GMT+5", new Date("2026-11-23T03:30:00Z")), "2026-11-22")
  assert.deepEqual(currentWeek("2026-11-22"), { startDate: "2026-11-16", endDate: "2026-11-22" })
  assert.deepEqual(currentWeek("2027-01-01"), { startDate: "2026-12-28", endDate: "2027-01-03" })
  assert.deepEqual(presetRange("this-week", today), week)
  assert.deepEqual(presetRange("this-month", today), { startDate: "2026-11-01", endDate: today })
  assert.deepEqual(presetRange("today", today), { startDate: today, endDate: today })
})
test("weekly/daily KPI forecasts use API totals/points, preserve zero and negative profit", () => {
  const response = forecastFixture(), view = forecastView(response, expected)
  assert.equal(kpiForecastPeriod(week, today), "weekly")
  assert.equal(kpiForecastValue(view.sales, "weekly", today), response.totals[0].total)
  assert.equal(kpiForecastValue(view.profit, "daily", today), -5)
  assert.equal(kpiForecastValue(view.sales, "daily", weekStart), 0)
  assert.equal(kpiForecastValue(null, "daily", today), null)
  assert.equal(kpiForecastPeriod(presetRange("this-month", today), today), null)
  assert.equal(kpiForecastPeriod({ startDate: "2026-10-01", endDate: "2026-10-31" }, today), null)
  assert.equal(kpiForecastValue(view.sales, null, today), null)
  assert.equal(kpiForecastPeriod({ startDate: "2026-11-01", endDate: "2026-11-01" }, "2026-11-01", "this-month"), null)
})
test("chart joins by date, keeps completed forecasts and genuine zeros, never invents future actuals", () => {
  const view = forecastView(forecastFixture(), expected)
  const rows = mergeTrend([...actualFixture].reverse(), view, week, today)
  assert.equal(rows.length, 7)
  assert.equal(rows[0].totalSales, 100); assert.equal(rows[0].forecastSales, 0)
  assert.equal(rows[1].totalSales, 0); assert.equal(rows[2].incomplete, true)
  assert.equal(rows[3].totalSales, null); assert.equal(rows[3].totalCost, null); assert.equal(rows[3].totalProfit, null)
  assert.equal(rows[6].forecastProfit, -5)
  assert.equal(rows.at(-1).date, weekEnd)
  assert.deepEqual(actualFixture[0].totalSales, 100)
})
test("monthly and custom charts clip forecast overlap; unrelated history and one-day ranges stay bounded", () => {
  const view = forecastView(forecastFixture(), expected)
  const month = mergeTrend(actualFixture, view, presetRange("this-month", today), today)
  assert.equal(month.length, 3)
  assert.equal(month.at(-1).date, today)
  assert.equal(mergeTrend(actualFixture, view, { startDate: "2026-10-01", endDate: "2026-10-31" }, today).length, 0)
  const daily = mergeTrend(actualFixture, view, { startDate: today, endDate: today }, today)
  assert.equal(daily.length, 1); assert.equal(daily[0].forecastProfit, -5)
  const fullMonth = mergeTrend(actualFixture, view, { startDate: "2026-11-01", endDate: "2026-11-30" }, today)
  assert.equal(fullMonth.at(-1).date, weekEnd)
  assert.ok(fullMonth.filter(row => row.date > today).every(row => row.totalSales === null))
  const missing = mergeTrend([], null, week, today)
  assert.equal(missing.length, 7); assert.ok(missing.every(row => row.totalSales === null && row.forecastSales === null))
})
test("sales and profit availability are independent; aggregate never silently excludes sites", () => {
  const data = forecastFixture([9, 10], "partial"); data.scope = "COMPANY"
  const view = forecastView(data, { ...expected, siteIds: [9, 10], selectedSite: null })
  assert.ok(view.sales); assert.equal(view.profit, null)
  const incomplete = forecastFixture([9, 10]); incomplete.scope = "COMPANY"; incomplete.totals[0].complete = false
  const result = forecastView(incomplete, { ...expected, siteIds: [9, 10], selectedSite: null })
  assert.equal(result.sales, null); assert.ok(result.profit); assert.ok(result.notices.includes("aggregate"))
})
test("all unavailable enums stay nonnumeric; disabled/not-generated stays silent", () => {
  for (const mode of ["insufficient", "pending", "deferred", "stale", "invalid", "no-sales", "disabled", "limit", "failed", "data"]) {
    const view = forecastView(forecastFixture([9], mode), expected)
    assert.equal(view.sales, null, mode); assert.equal(view.profit, null, mode)
    if (mode === "disabled") assert.equal(view.notices.length, 0)
    else assert.ok(view.notices.length > 0, mode)
  }
  const provisional = forecastView(forecastFixture([9], "provisional"), expected)
  assert.equal(provisional.sales.provisional, true); assert.ok(provisional.notices.includes("limited"))
  assert.ok(forecastView(forecastFixture([9], "new-data"), expected).sales)
  const disabledPending = forecastFixture([9], "pending"); disabledPending.enabled = false
  assert.deepEqual(forecastView(disabledPending, expected), { sales: null, profit: null, notices: [] })
})
test("reject foreign site scopes, wrong weeks, currencies/zones and malformed forecast dates/amounts", () => {
  for (const mutate of [data => { data.siteIds = [10] }, data => { data.scope = "COMPANY" }, data => { data.currency = "HTG" },
    data => { data.timeZone = "UTC" }, data => { data.weekStart = "2026-11-16" },
    data => { data.sites[0].targets[0].days[0].date = "2026-11-30" },
    data => { data.sites[0].targets[0].days[0].value = NaN }]) {
    const data = forecastFixture(); mutate(data)
    assert.equal(forecastView(data, expected).sales, null)
  }
  assert.equal(forecastView(forecastFixture(), { ...expected, week: currentWeek("2026-11-30") }).sales, null)
})
test("session-local cache deduplicates in-flight calls, expires, separates locations and failures", async () => {
  let time = 0, calls = 0
  const cache = new ForecastSessionCache(60, () => time)
  let finish
  const fetch = () => { calls++; return new Promise(resolve => { finish = resolve }) }
  const first = cache.load("site9", fetch), duplicate = cache.load("site9", fetch)
  await Promise.resolve(); assert.equal(calls, 1); assert.equal(first, duplicate)
  finish("data"); await first
  time = 55; assert.equal(cache.remainingFreshness("site9"), 5)
  assert.equal(cache.isFresh("site9"), true)
  assert.equal(await cache.load("site9", () => { calls++; return Promise.resolve("bad") }), "data")
  time = 61
  assert.equal(cache.isFresh("site9"), false)
  assert.equal(await cache.load("site9", () => { calls++; return Promise.resolve("fresh") }), "fresh")
  assert.equal(await cache.load("site10", () => Promise.resolve("other site")), "other site")
  const otherSession = new ForecastSessionCache()
  assert.equal(await otherSession.load("site9", () => Promise.resolve("other account")), "other account")
  await assert.rejects(cache.load("failure", () => Promise.reject(new Error("network"))))
  assert.equal(await cache.load("failure", () => Promise.resolve("recovered")), "recovered")
})
test("all approved labels are localized and date formatting never shifts date-only calendar keys", () => {
  assert.equal(forecastCopy.en.weekly, "This week's forecast")
  assert.equal(forecastCopy.fr.weekly, "Prévision de la semaine")
  assert.equal(forecastCopy.es.weekly, "Previsión de esta semana")
  for (const language of ["en", "fr", "es"]) {
    assert.deepEqual(Object.keys(forecastCopy[language]), Object.keys(forecastCopy.en))
    assert.ok(formatBusinessDate("2026-11-23", language, true).includes("23"))
    assert.ok(forecastCopy[language].history.includes("28"))
  }
})
