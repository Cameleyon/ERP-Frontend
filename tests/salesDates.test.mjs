import { test } from "node:test"
import assert from "node:assert/strict"
import { recentSalesRange } from "../src/utils/salesDates.ts"
import { formatDateTime } from "../src/utils/format.ts"

test("history filters use the same company day as the dashboard at UTC midnight", () => {
  const instant = new Date("2026-11-22T01:00:00Z")
  assert.deepEqual(recentSalesRange("America/Port-au-Prince", instant), { startDate: "2026-10-23", endDate: "2026-11-21" })
  assert.equal(recentSalesRange("Asia/Tokyo", instant).endDate, "2026-11-22")
  assert.equal(recentSalesRange(null, instant).endDate, "2026-11-21")
  assert.equal(recentSalesRange("invalid", instant).endDate, "2026-11-21")
})

test("company wall times do not acquire a second browser-zone conversion", () => {
  const formatted = formatDateTime("2026-11-21T20:00:00", "en-CA", "Asia/Tokyo")
  assert.match(formatted, /21/)
  assert.match(formatted, /08:00|8:00|20:00/)
  const converted = formatDateTime("2026-11-22T01:00:00Z", "en-CA", "America/Port-au-Prince")
  assert.equal(formatted, converted)
})

test("company calendar date arithmetic is stable across daylight saving and month boundaries", () => {
  assert.deepEqual(recentSalesRange("America/New_York", new Date("2026-11-02T02:00:00Z")),
    { startDate: "2026-10-03", endDate: "2026-11-01" })
  assert.deepEqual(recentSalesRange("Europe/Paris", new Date("2026-03-31T22:30:00Z")),
    { startDate: "2026-03-03", endDate: "2026-04-01" })
})
