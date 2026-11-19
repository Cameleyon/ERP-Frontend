import type { SalesTrendPointResponse } from "../api/dashboardApi"
import type { ForecastDay, ForecastMetric, ForecastTarget, WeeklyForecastResponse } from "../api/forecastApi"

export type DashboardPreset = "today" | "this-week" | "this-month" | "custom"
export type DateRange = { startDate: string; endDate: string }
export type ForecastNotice = "limited" | "history" | "noSales" | "data" | "pending" | "unavailable" | "aggregate"
export type DisplayForecast = { days: ForecastDay[]; total: number; provisional: boolean }
export type ForecastView = { sales: DisplayForecast | null; profit: DisplayForecast | null; notices: ForecastNotice[] }
export type TrendRow = {
  date: string; totalSales: number | null; totalCost: number | null; totalProfit: number | null
  forecastSales: number | null; forecastProfit: number | null; incomplete: boolean
}

// Date-only strings are calendar keys, never browser-local timestamps.
export function addCalendarDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}
export function companyToday(zone: string, now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en", {
    timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now).map(part => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}
export function currentWeek(today: string): DateRange {
  const day = new Date(`${today}T12:00:00Z`).getUTCDay()
  const monday = addCalendarDays(today, -(day === 0 ? 6 : day - 1))
  return { startDate: monday, endDate: addCalendarDays(monday, 6) }
}
export function presetRange(preset: Exclude<DashboardPreset, "custom">, today: string): DateRange {
  if (preset === "this-week") return currentWeek(today)
  return { startDate: preset === "today" ? today : today.slice(0, 8) + "01", endDate: today }
}
export function overlaps(a: DateRange, b: DateRange) {
  return a.startDate <= b.endDate && a.endDate >= b.startDate
}
export function kpiForecastPeriod(range: DateRange, today: string, preset?: DashboardPreset): "weekly" | "daily" | null {
  if (preset === "this-month") return null
  const week = currentWeek(today)
  if (range.startDate === week.startDate && range.endDate === week.endDate) return "weekly"
  return range.startDate === today && range.endDate === today ? "daily" : null
}
export function kpiForecastValue(target: DisplayForecast | null, period: "weekly" | "daily" | null, today: string) {
  if (!target || !period) return null
  return period === "weekly" ? target.total : target.days.find(day => day.date === today)?.value ?? null
}

const usable = (target: ForecastTarget) => ["AVAILABLE", "PROVISIONAL"].includes(target.availability)
  && ["CURRENT", "NEW_DATA"].includes(target.validity)
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value)
function validDays(days: ForecastDay[], week: DateRange, metric: ForecastMetric) {
  return Array.isArray(days) && days.length === 7 && days.every((day, index) => day.date === addCalendarDays(week.startDate, index)
    && finite(day.value) && (metric !== "SALES" || day.value >= 0))
}
function reasonFor(target: ForecastTarget): ForecastNotice | null {
  if (usable(target)) return target.provisional ? "limited" : null
  if (target.availability === "NOT_GENERATED") return null
  if (["PENDING", "GENERATING"].includes(target.availability)) return "pending"
  if (target.availability === "INSUFFICIENT_HISTORY") return "history"
  if (target.reason === "NO_RECORDED_SALES" || target.reason === "NO_VALID_SALES_IN_LOOKBACK") return "noSales"
  if (["DATA_INCOMPLETE", "INVALID_DATA"].includes(target.availability)) return "data"
  return "unavailable"
}

// Reject mismatched scope/context, even if a transport or an obsolete response supplied valid numbers.
export function forecastView(response: WeeklyForecastResponse, expected: {
  week: DateRange; zone: string; currency: string | null; siteIds: number[]; selectedSite: number | null
}): ForecastView {
  const unavailable: ForecastView = { sales: null, profit: null, notices: ["unavailable"] }
  if (response.enabled !== true) return { sales: null, profit: null, notices: [] }
  const ids = [...expected.siteIds].sort((a, b) => a - b)
  if (!expected.currency || response.currency !== expected.currency || response.timeZone !== expected.zone
    || response.weekStart !== expected.week.startDate || response.weekEnd !== expected.week.endDate
    || !Array.isArray(response.siteIds) || ids.length === 0 || response.siteIds.length !== ids.length
    || [...response.siteIds].sort((a, b) => a - b).some((id, i) => id !== ids[i])
    || (expected.selectedSite !== null ? response.scope !== "SITE" : !["COMPANY", "AUTHORIZED_SITES"].includes(response.scope))
    || !Array.isArray(response.sites) || response.sites.length !== ids.length || !Array.isArray(response.totals)
    || ids.some(id => response.sites.filter(site => site.siteId === id).length !== 1)) return unavailable
  const notices = new Set<ForecastNotice>()
  function read(metric: ForecastMetric): DisplayForecast | null {
    const targets = ids.map(id => response.sites.find(site => site.siteId === id)?.targets?.filter(target => target.metric === metric))
    if (targets.some(list => !list || list.length !== 1)) { notices.add("unavailable"); return null }
    const rows = targets.map(list => list![0])
    rows.forEach(row => { const reason = reasonFor(row); if (reason) notices.add(reason) })
    if (rows.some(row => !usable(row) || !finite(row.total) || metric === "SALES" && row.total < 0 || !validDays(row.days, expected.week, metric))) {
      if (rows.some(row => usable(row) && (!finite(row.total) || !validDays(row.days, expected.week, metric)))) notices.add("unavailable")
      if (expected.selectedSite === null && rows.some(usable) && rows.some(row => !usable(row))) notices.add("aggregate")
      return null
    }
    const aggregate = response.totals.filter(total => total.metric === metric)
    if (aggregate.length !== 1 || !aggregate[0].complete || aggregate[0].unavailableSiteIds.length !== 0
      || !finite(aggregate[0].total) || !validDays(aggregate[0].days, expected.week, metric)) {
      notices.add(expected.selectedSite === null ? "aggregate" : "unavailable"); return null
    }
    if (expected.selectedSite !== null) return { days: rows[0].days, total: rows[0].total!, provisional: rows[0].provisional }
    return { days: aggregate[0].days, total: aggregate[0].total!, provisional: aggregate[0].provisional }
  }
  const sales = read("SALES"), profit = read("PROFIT")
  return { sales, profit, notices: [...notices] }
}

export function mergeTrend(actual: SalesTrendPointResponse[], view: ForecastView | null, range: DateRange, today: string): TrendRow[] {
  const rows = new Map<string, TrendRow>()
  function row(date: string) {
    if (!rows.has(date)) rows.set(date, { date, totalSales: null, totalCost: null, totalProfit: null,
      forecastSales: null, forecastProfit: null, incomplete: date === today })
    return rows.get(date)!
  }
  // The weekly axis is explicit; missing actual responses never become invented zeros.
  if (kpiForecastPeriod(range, today) === "weekly") for (let i = 0; i < 7; i++) row(addCalendarDays(range.startDate, i))
  actual.forEach(point => {
    if (point.date >= range.startDate && point.date <= range.endDate && point.date <= today) {
      Object.assign(row(point.date), { totalSales: point.totalSales, totalCost: point.totalCost, totalProfit: point.totalProfit })
    }
  })
  for (const [target, key] of [[view?.sales, "forecastSales"], [view?.profit, "forecastProfit"]] as const) {
    target?.days.forEach(point => {
      if (point.date >= range.startDate && point.date <= range.endDate) row(point.date)[key] = point.value
    })
  }
  return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function formatBusinessDate(date: string, language: string, detailed = false) {
  return new Intl.DateTimeFormat(language, { timeZone: "UTC", month: "short", day: "numeric",
    ...(detailed ? { weekday: "long" as const, year: "numeric" as const } : {}) }).format(new Date(`${date}T12:00:00Z`))
}

export class ForecastSessionCache<T> {
  private entries = new Map<string, { expires: number; promise: Promise<T> }>()
  private readonly ttl: number
  private readonly clock: () => number
  constructor(ttl = 60_000, clock: () => number = Date.now) { this.ttl = ttl; this.clock = clock }
  isFresh(key: string) {
    const expires = this.entries.get(key)?.expires
    return expires !== undefined && Number.isFinite(expires) && expires > this.clock()
  }
  remainingFreshness(key: string) {
    return Math.max(1, Math.min(this.ttl, (this.entries.get(key)?.expires ?? this.clock()) - this.clock()))
  }
  load(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.entries.get(key)
    if (cached && cached.expires > this.clock()) return cached.promise
    const started = this.clock()
    const entry = { expires: Infinity, promise: Promise.resolve().then(fetcher) }
    this.entries.set(key, entry)
    while (this.entries.size > 8) this.entries.delete(this.entries.keys().next().value!)
    entry.promise.then(() => { entry.expires = started + this.ttl }, () => { if (this.entries.get(key) === entry) this.entries.delete(key) })
    return entry.promise
  }
}
