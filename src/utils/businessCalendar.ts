import type { CalendarView } from "../api/businessCalendarApi"

export function calendarDateIsClosed(calendar: CalendarView["calendar"], date: string) {
  const override = calendar.dates.find(row => row.date === date)?.dayType
  if (override === "CLOSED") return true
  if (override === "OPEN") return false
  const schedules = calendar.schedules ?? (calendar.effectiveFrom
    ? [{ effectiveFrom: calendar.effectiveFrom, weekdays: calendar.weekdays }] : [])
  function weekday(value: string) {
    const day = new Date(value + "T12:00:00Z").getUTCDay() || 7
    const schedule = schedules.filter(row => row.effectiveFrom <= value)
      .reduce<(typeof schedules)[number] | undefined>((latest, row) => !latest || row.effectiveFrom > latest.effectiveFrom ? row : latest, undefined)
    return schedule?.weekdays.find(row => row.weekday === day)
  }
  const previous = new Date(date + "T12:00:00Z")
  previous.setUTCDate(previous.getUTCDate() - 1)
  const previousDate = previous.toISOString().slice(0, 10)
  const prior = weekday(previousDate)
  const carryover = prior?.open && prior.closesNextDay && !prior.closesAt?.startsWith("00:00")
    && calendar.dates.find(row => row.date === previousDate)?.dayType !== "CLOSED"
  return weekday(date)?.open === false && !carryover
}
