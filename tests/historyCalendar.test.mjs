import assert from "node:assert/strict"
import { test } from "node:test"
import { DEFAULT_COMPANY_TIME_ZONE, formatTimeZoneLabel, lastCompleteCompanyDate } from "../src/utils/companyLocalization.ts"

test("fixed UTC minus five fallback does not adopt daylight saving", () => {
  assert.equal(DEFAULT_COMPANY_TIME_ZONE, "Etc/GMT+5")
  assert.equal(formatTimeZoneLabel(DEFAULT_COMPANY_TIME_ZONE), "UTC-05:00")
  assert.equal(lastCompleteCompanyDate(DEFAULT_COMPANY_TIME_ZONE, new Date("2026-07-01T04:30:00Z")), "2026-06-29")
  assert.equal(lastCompleteCompanyDate("America/New_York", new Date("2026-07-01T04:30:00Z")), "2026-06-30")
})

test("complete-day picker handles DST transitions and unknown zones safely", () => {
  assert.equal(lastCompleteCompanyDate("America/New_York", new Date("2026-11-01T05:30:00Z")), "2026-10-31")
  assert.equal(lastCompleteCompanyDate("America/New_York", new Date("2026-11-01T06:30:00Z")), "2026-10-31")
  assert.equal(lastCompleteCompanyDate("America/New_York", new Date("2026-03-08T07:30:00Z")), "2026-03-07")
  assert.equal(lastCompleteCompanyDate("not-a-timezone"), undefined)
})
