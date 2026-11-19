import { forecastFixture, actualFixture } from "./forecast-data.mjs"
export const demoUser = { id: 5, role: "ADMIN", companyId: 7, companyName: "Demo", companyTimeZoneId: "Etc/GMT+5", companyCurrencyCode: "USD",
  termsAccepted: true, locations: [], preferredLanguage: null }
export const demoSites = [{ id: 9, companyId: 7, name: "Main site", active: true }, { id: 10, companyId: 7, name: "Second site", active: true }]
export const summaryFixture = { totalSales: 150, totalProfit: 35, totalCost: 115, totalTax: 15, totalTransactions: 3, lowStockProducts: 2, outOfStockProducts: 1 }
export function createForecastDemo() {
  return async input => {
    const url = new URL(typeof input === "string" ? input : input.url, "http://localhost")
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en", { timeZone: "Etc/GMT+5", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map(p => [p.type, p.value]))
    const date = new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00Z`)
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7)
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(date); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10) })
    let body
    if (url.pathname === "/api/auth/me") body = demoUser
    else if (url.pathname === "/api/company/locations") body = demoSites
    else if (url.pathname === "/api/dashboard/summary") body = summaryFixture
    else if (url.pathname === "/api/dashboard/sales-trend") body = actualFixture.map((point, i) => ({ ...point, date: days[i] }))
    else if (url.pathname === "/api/forecasts/weekly/current") {
      const site = url.searchParams.get("locationId")
      body = forecastFixture(site ? [Number(site)] : [9, 10]); body.scope = site ? "SITE" : "COMPANY"
      // Demo remains calendar-current without changing source forecast amounts.
      body.weekStart = days[0]; body.weekEnd = days[6]
      body.sites.forEach(site => site.targets.forEach(target => target.days.forEach((point, i) => { point.date = days[i] })))
      body.totals.forEach(target => target.days.forEach((point, i) => { point.date = days[i] }))
    } else if (url.pathname.startsWith("/api/dashboard/")) body = []
    else return new Response(null, { status: 503 })
    return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } })
  }
}
