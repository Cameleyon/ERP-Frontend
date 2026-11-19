import { apiGet } from "./client"

export type ForecastMetric = "SALES" | "PROFIT"
export type ForecastAvailability = "AVAILABLE" | "PROVISIONAL" | "INSUFFICIENT_HISTORY" | "DATA_INCOMPLETE"
  | "INVALID_DATA" | "COMPUTATION_LIMIT" | "FAILED" | "NOT_GENERATED" | "GENERATION_FAILED"
  | "GENERATING" | "PENDING" | "STALE" | "INVALID"
export type ForecastValidity = "CURRENT" | "NEW_DATA" | "STALE" | "INVALID" | "UNKNOWN"
export type ForecastDay = {
  date: string; value: number; closure: string
  events: { locationId: number | null; description: string }[]
}
export type ForecastTarget = {
  metric: ForecastMetric; definition: string; availability: ForecastAvailability; validity: ForecastValidity
  provisional: boolean; scheduledAt: string | null; generatedAt: string | null
  historicalCutoff: string | null; method: string | null; days: ForecastDay[]; total: number | null
  warnings: string[]; reason: string | null
}
export type ForecastAggregate = {
  metric: ForecastMetric; complete: boolean; provisional: boolean; unavailableSiteIds: number[]
  days: ForecastDay[]; total: number | null
}
export type WeeklyForecastResponse = {
  enabled: boolean
  weekStart: string; weekEnd: string; currency: string; timeZone: string
  scope: "SITE" | "AUTHORIZED_SITES" | "COMPANY"; siteIds: number[]
  sites: { siteId: number; targets: ForecastTarget[] }[]; totals: ForecastAggregate[]
}

export function getCurrentForecast(locationId: number | null, signal?: AbortSignal) {
  return apiGet<WeeklyForecastResponse>(`/forecasts/weekly/current${locationId === null ? "" : `?locationId=${locationId}`}`,
    { signal, cache: "no-store" })
}
