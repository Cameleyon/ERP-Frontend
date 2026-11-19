import { apiGet, apiPut } from "./client"

export type OpeningDay = { weekday: number; open: boolean; opensAt: string | null; closesAt: string | null; closesNextDay: boolean }
export type CalendarDate = { date: string; dayType: "REGULAR" | "CLOSED" | "OPEN"; eventDescription: string | null }
export type OpeningSchedule = { effectiveFrom: string; weekdays: OpeningDay[] }
export type CalendarView = {
  businessTimeZone: string
  calendar: { locationId: number; effectiveFrom: string | null; weekdays: OpeningDay[]; dates: CalendarDate[]; schedules?: OpeningSchedule[] }
}

export function calendarMonthRange(month: string) {
  const [year, number] = month.split("-").map(Number)
  return { start: month + "-01", end: new Date(Date.UTC(year, number, 0)).toISOString().slice(0, 10) }
}
export function getBusinessCalendar(site: number, month: string) {
  const range = calendarMonthRange(month)
  return apiGet<CalendarView>(`/history/calendar?locationId=${site}&startDate=${range.start}&endDate=${range.end}`)
}
export function saveOpeningHours(site: number, effectiveFrom: string, weekdays: OpeningDay[]) {
  return apiPut<void>(`/history/calendar/hours?locationId=${site}`, { effectiveFrom, weekdays })
}
export function saveCalendarDate(site: number, date: string, dayType: CalendarDate["dayType"], eventDescription: string) {
  return apiPut<void>(`/history/calendar/dates/${date}?locationId=${site}`,
    { dayType, eventDescription: eventDescription.trim() || null })
}
