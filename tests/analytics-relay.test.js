import { test } from "node:test"
import assert from "node:assert/strict"
import handler from "../api/analytics/visit.js"

test("production relay forwards only server-derived country and never the client IP", async () => {
  const originalFetch = globalThis.fetch
  const previous = { ...process.env }
  process.env.VERCEL_ENV = "production"
  process.env.ANALYTICS_INGEST_SECRET = "test-secret-with-at-least-32-characters"
  process.env.ANALYTICS_API_BASE_URL = "https://backend.example/api"
  const response = { code: 0, setHeader() {}, status(code) { this.code = code; return this }, end() {} }
  const body = { visitId: "12345678-1234-1234-1234-123456789012", visitorId: "12345678-1234-1234-1234-123456789013", countryCode: "US" }
  try {
    let forwarded
    globalThis.fetch = async (url, options) => { forwarded = { url, options }; return { ok: true } }
    await handler({ method: "POST", headers: { origin: "https://app.example", host: "app.example", "x-vercel-ip-country": "HT" }, body }, response)
    assert.equal(response.code, 204)
    assert.equal(forwarded.url.href, "https://backend.example/api/public/analytics/visits")
    assert.deepEqual(JSON.parse(forwarded.options.body), { ...body, countryCode: "HT" })
    assert.equal(forwarded.options.headers["X-Analytics-Secret"], process.env.ANALYTICS_INGEST_SECRET)
    forwarded = null
    await handler({ method: "POST", headers: { origin: "https://attacker.example", host: "app.example" }, body }, response)
    assert.equal(response.code, 403)
    assert.equal(forwarded, null)
    process.env.VERCEL_ENV = "preview"
    await handler({ method: "POST", headers: {}, body }, response)
    assert.equal(response.code, 204)
    assert.equal(forwarded, null)
  } finally {
    globalThis.fetch = originalFetch
    for (const key of ["VERCEL_ENV", "ANALYTICS_INGEST_SECRET", "ANALYTICS_API_BASE_URL"]) {
      if (previous[key] === undefined) delete process.env[key]
      else process.env[key] = previous[key]
    }
  }
})
