import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import handler from "../api/reminder-unsubscribe.js"

const token = "ab942c77-20f7-4190-913d-c9289fe45f16"
const csp = "default-src 'none'; form-action 'self'"
const route = "/api/public/trial-sales-reminders/unsubscribe/"

function deployAs(t, environment, fetch) {
  const previous = process.env.VERCEL_ENV
  if (environment === undefined) delete process.env.VERCEL_ENV
  else process.env.VERCEL_ENV = environment
  t.after(() => {
    if (previous === undefined) delete process.env.VERCEL_ENV
    else process.env.VERCEL_ENV = previous
  })
  return t.mock.method(globalThis, "fetch", fetch)
}

async function request(method, query = { token, lang: "fr" }) {
  const response = {
    headers: new Headers(),
    setHeader(name, value) { this.headers.set(name, value) },
    status(value) { this.code = value; return this },
    end(body) { this.body = body; return this },
  }
  return handler({ method, query, headers: { "x-vercel-env": "production" } }, response)
}

test("Vercel routes the existing unsubscribe URL to a local function only", () => {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"))
  const rewrite = config.rewrites.find(({ source }) => source === route + ":token")
  assert.equal(rewrite?.destination, "/api/reminder-unsubscribe?token=:token")
  assert.ok(config.rewrites.every(({ destination }) => destination.startsWith("/")))
})

for (const environment of ["preview", "development", "staging", undefined]) {
  test(`unsubscribe denies all methods without an outbound request in ${environment ?? "unset"}`, async (t) => {
    const outbound = deployAs(t, environment, () => { throw new Error("unexpected network call") })
    for (const method of ["GET", "HEAD", "POST"]) {
      const response = await request(method)
      assert.equal(response.code, 404)
      assert.equal(response.headers.get("cache-control"), "no-store")
    }
    assert.equal(outbound.mock.callCount(), 0)
  })
}

for (const [method, html] of [["GET", '<form method="post"><button>Confirmer</button></form>'], ["POST", "<h1>Confirme</h1>"], ["HEAD", undefined]]) {
  test(`production ${method} preserves the existing localized endpoint and response`, async (t) => {
    const outbound = deployAs(t, "production", async (url, options) => {
      assert.equal(url.origin, "https://erp-backend-6hfk.onrender.com")
      assert.equal(url.pathname, route + token)
      assert.equal(url.search, "?lang=fr")
      assert.equal(options.method, method)
      assert.equal(options.redirect, "error")
      assert.equal(options.headers, undefined)
      return new Response(html, { headers: { "Content-Type": "text/html;charset=UTF-8", "Content-Security-Policy": csp } })
    })
    const response = await request(method)
    assert.equal(response.code, 200)
    assert.equal(response.body, html)
    assert.equal(response.headers.get("content-security-policy"), csp)
    assert.equal(response.headers.get("content-type"), "text/html;charset=UTF-8")
    assert.equal(response.headers.get("referrer-policy"), "no-referrer")
    assert.equal(outbound.mock.callCount(), 1)
  })
}

test("invalid tokens and unsupported methods do not reach the backend", async (t) => {
  const outbound = deployAs(t, "production", () => { throw new Error("unexpected network call") })
  assert.equal((await request("DELETE")).code, 405)
  for (const bad of [undefined, ["duplicate", token], "../account", "//example.test"]) {
    assert.equal((await request("POST", { token: bad })).code, 400)
  }
  assert.equal(outbound.mock.callCount(), 0)
})

test("upstream failures return a non-cacheable error without redirecting the browser", async (t) => {
  deployAs(t, "production", async () => { throw new Error("backend unavailable") })
  const response = await request("GET")
  assert.equal(response.code, 502)
  assert.equal(response.headers.get("cache-control"), "no-store")
  assert.equal(response.headers.get("location"), null)
})
