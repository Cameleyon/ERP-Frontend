export const today = "2026-11-25"
export const weekStart = "2026-11-23"
export const weekEnd = "2026-11-29"
export function day(index) { return `2026-11-${23 + index}` }
export function forecastFixture(siteIds = [9], mode = "available") {
  const makeTarget = (metric, site) => {
    const profit = metric === "PROFIT"
    const total = profit ? -35 : 700 + site
    const days = Array.from({ length: 7 }, (_, i) => ({ date: day(i), value: profit ? -5 : i === 0 ? 0 : (total / 6), closure: "OPEN", events: [] }))
    const target = { metric, definition: profit ? "RECORDED_SUBTOTAL_MINUS_FIFO_COST" : "RECORDED_TOTAL_INCLUDING_TAX",
      availability: "AVAILABLE", validity: "CURRENT", provisional: false, scheduledAt: "2026-11-23T07:00:00Z",
      generatedAt: "2026-11-23T07:00:01Z", historicalCutoff: "2026-11-22", method: "SES", days, total, warnings: [], reason: null }
    if (mode === "zero") { target.total = 0; target.days.forEach(point => { point.value = 0 }) }
    if (mode === "provisional") { target.provisional = true; target.availability = "PROVISIONAL" }
    if (mode === "new-data") target.validity = "NEW_DATA"
    if (["insufficient", "pending", "deferred", "stale", "invalid", "no-sales", "disabled", "limit", "failed", "data", "partial"].includes(mode)) {
      if (mode !== "partial" || site === siteIds.at(-1) && profit) {
        target.availability = ({ insufficient: "INSUFFICIENT_HISTORY", pending: "GENERATING", deferred: "PENDING", stale: "STALE", invalid: "INVALID",
          "no-sales": "DATA_INCOMPLETE", disabled: "NOT_GENERATED", limit: "COMPUTATION_LIMIT", failed: "GENERATION_FAILED", data: "INVALID_DATA", partial: "DATA_INCOMPLETE" })[mode]
        target.reason = ({ "no-sales": "NO_RECORDED_SALES", deferred: "OVERNIGHT_PERIOD_INCOMPLETE" })[mode] ?? null
        target.validity = mode === "stale" ? "STALE" : mode === "invalid" ? "INVALID" : "UNKNOWN"
        target.days = []; target.total = null
      }
    }
    return target
  }
  const sites = siteIds.map(siteId => ({ siteId, targets: [makeTarget("SALES", siteId), makeTarget("PROFIT", siteId)] }))
  const totals = ["SALES", "PROFIT"].map(metric => {
    const targets = sites.map(site => site.targets.find(target => target.metric === metric))
    const unavailableSiteIds = sites.filter(site => site.targets.find(target => target.metric === metric).total === null).map(site => site.siteId)
    return { metric, complete: unavailableSiteIds.length === 0, provisional: targets.some(t => t.provisional), unavailableSiteIds,
      total: unavailableSiteIds.length ? null : targets.reduce((sum, t) => sum + t.total, 0),
      days: unavailableSiteIds.length ? [] : Array.from({ length: 7 }, (_, i) => ({ date: day(i), value: targets.reduce((sum, t) => sum + t.days[i].value, 0), closure: "AGGREGATED", events: [] })) }
  })
  return { enabled: mode !== "disabled", weekStart, weekEnd, currency: "USD", timeZone: "Etc/GMT+5", scope: "SITE", siteIds, sites, totals }
}
export const actualFixture = [
  { date: "2026-11-23", totalSales: 100, totalProfit: 25, totalCost: 75, transactionCount: 2 },
  { date: "2026-11-24", totalSales: 0, totalProfit: 0, totalCost: 0, transactionCount: 0 },
  { date: "2026-11-25", totalSales: 50, totalProfit: 10, totalCost: 40, transactionCount: 1 },
  { date: "2026-11-26", totalSales: 0, totalProfit: 0, totalCost: 0, transactionCount: 0 },
]
