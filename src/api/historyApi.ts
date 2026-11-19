import { apiGet } from "./client"

export type AutomaticHistoryStart = {
  locationId: number
  startedAt: string | null
  reason: string
}

export function getAutomaticHistoryStart(locationId: number) {
  return apiGet<AutomaticHistoryStart | null>(`/history/coverage?locationId=${locationId}`)
}
