import assert from "node:assert/strict"
import { test } from "node:test"
import { createCalendarDemoFetch } from "./fixtures/calendar-demo.mjs"

test("local calendar demo works without a backend and keeps changes in memory only", async () => {
  const fetch = createCalendarDemoFetch()
  assert.equal((await (await fetch("http://localhost:8080/api/company/locations")).json())[0].id, 9)
  await fetch("http://localhost:8080/api/history/calendar/dates/2026-11-20", {
    method: "PUT", body: JSON.stringify({ dayType: "CLOSED", eventDescription: "Demo event" }),
  })
  const url = "http://localhost:8080/api/history/calendar?startDate=2026-11-01&endDate=2026-11-30"
  assert.equal((await (await fetch(url)).json()).calendar.dates.length, 1)
  assert.equal((await (await createCalendarDemoFetch()(url)).json()).calendar.dates.length, 0)
  assert.equal((await fetch("https://example.invalid/api/unknown")).status, 503)
})
