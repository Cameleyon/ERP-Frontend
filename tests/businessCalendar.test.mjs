import assert from "node:assert/strict"
import { test } from "node:test"
import { calendarDateIsClosed, openingDaysForForm, openingHoursChanged } from "../src/utils/businessCalendar.ts"

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

test("opening-hour form clones saved values and restores a full ordered week", () => {
  const rows = openingDaysForForm([weekdays[0]])
  assert.equal(rows.length, 7)
  assert.deepEqual(rows.map(day => day.weekday), [1, 2, 3, 4, 5, 6, 7])
  rows[0].opensAt = "21:00"
  assert.equal(weekdays[0].opensAt, "22:00")
  assert.equal(rows[6].open, false)
})

test("unchanged or reverted hours cannot be resaved; date, times and overnight edits are detected", () => {
  const rows = openingDaysForForm(weekdays)
  const effective = "2026-11-16"
  assert.equal(openingHoursChanged(effective, rows, effective, weekdays), false)
  assert.equal(openingHoursChanged("2026-11-17", rows, effective, weekdays), true)
  for (const change of [{ open: false }, { opensAt: "21:00" }, { closesAt: "03:00" }, { closesNextDay: false }]) {
    const changed = openingDaysForForm(weekdays); Object.assign(changed[0], change)
    assert.equal(openingHoursChanged(effective, changed, effective, weekdays), true)
  }
  const serialized = weekdays.map(day => ({ ...day, opensAt: day.opensAt && day.opensAt + ":00", closesAt: day.closesAt && day.closesAt + ":00" }))
  assert.equal(openingHoursChanged(effective, rows, effective, serialized), false)
  assert.equal(openingHoursChanged(effective, openingDaysForForm(weekdays), effective, weekdays), false)
})
