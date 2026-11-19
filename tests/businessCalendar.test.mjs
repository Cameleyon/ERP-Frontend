import assert from "node:assert/strict"
import { test } from "node:test"
import { calendarDateIsClosed } from "../src/utils/businessCalendar.ts"

const weekdays = Array.from({ length: 7 }, (_, i) => ({
  weekday: i + 1, open: i === 0, opensAt: i === 0 ? "22:00" : null,
  closesAt: i === 0 ? "02:00" : null, closesNextDay: i === 0,
}))
const calendar = { locationId: 9, effectiveFrom: "2026-11-16", weekdays, dates: [] }

test("calendar does not infer closure before a schedule and handles overnight carryover", () => {
  assert.equal(calendarDateIsClosed(calendar, "2026-11-15"), false)
  assert.equal(calendarDateIsClosed(calendar, "2026-11-16"), false)
  assert.equal(calendarDateIsClosed(calendar, "2026-11-17"), false)
  assert.equal(calendarDateIsClosed(calendar, "2026-11-18"), true)
})

test("date overrides have priority while an event alone never implies opening", () => {
  assert.equal(calendarDateIsClosed({ ...calendar, dates: [{ date: "2026-11-17", dayType: "CLOSED", eventDescription: null }] }, "2026-11-17"), true)
  assert.equal(calendarDateIsClosed({ ...calendar, dates: [{ date: "2026-11-18", dayType: "OPEN", eventDescription: "Festival" }] }, "2026-11-18"), false)
  assert.equal(calendarDateIsClosed({ ...calendar, dates: [{ date: "2026-11-18", dayType: "REGULAR", eventDescription: "Festival" }] }, "2026-11-18"), true)
})
