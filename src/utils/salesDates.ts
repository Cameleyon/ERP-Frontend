import { DEFAULT_COMPANY_TIME_ZONE, isValidTimeZone } from "./companyLocalization.ts"
import { addCalendarDays, companyToday } from "./dashboardForecast.ts"

export function recentSalesRange(configuredZone?: string | null, now = new Date()) {
  const zone = configuredZone && isValidTimeZone(configuredZone) ? configuredZone : DEFAULT_COMPANY_TIME_ZONE
  const endDate = companyToday(zone, now)
  return { startDate: addCalendarDays(endDate, -29), endDate }
}

export function salesHistoryRange(role?: string, configuredZone?: string | null, now = new Date()) {
  const range = recentSalesRange(configuredZone, now)
  return role === "CASHIER" ? { startDate: range.endDate, endDate: range.endDate } : range
}
