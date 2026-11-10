import assert from "node:assert/strict"
import { test } from "node:test"
import { createMetaPixel, resolveMetaPixelId } from "../src/utils/metaPixel.ts"

const productionId = "1882145179608617"
const origin = "https://erp.cameleyondynamics.com"
const config = { built: true, deployment: "production", productionId }
const success = { verified: true, signup: { companyId: 47, adminEmail: "private@example.invalid" } }

function fixture(overrides = {}) {
  const values = new Map()
  const sessionValues = new Map()
  const scripts = []
  const browser = Object.assign(new EventTarget(), {
    location: { href: origin + "/fr" },
    localStorage: {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
    sessionStorage: {
      getItem: key => sessionValues.get(key) ?? null,
      setItem: (key, value) => sessionValues.set(key, value),
    },
    navigator: {},
    crypto: { randomUUID: () => "12345678-1234-4234-8234-123456789012" },
  })
  const doc = { createElement: () => ({}), head: { appendChild: script => scripts.push(script) }, referrer: "" }
  const tracker = createMetaPixel({ ...config, ...overrides }, browser, doc)
  const events = () => browser.fbq?.queue.filter(command => command[0] === "trackSingle") ?? []
  return { browser, doc, tracker, scripts, events }
}

test("production is pinned to HTTPS, the deployed host, and the configured production ID", () => {
  assert.equal(resolveMetaPixelId(config, new URL(origin)), productionId)
  for (const url of ["http://localhost:5173", "https://erp.example", "https://erp.cameleyondynamics.com:444"]) {
    assert.equal(resolveMetaPixelId(config, new URL(url)), null)
  }
  for (const changes of [{ built: false }, { deployment: "preview" }, { deployment: "" }, { productionId: undefined }]) {
    assert.equal(resolveMetaPixelId({ ...config, ...changes }, new URL(origin)), null)
  }
})

test("preview requires an exact host and a different test Pixel", () => {
  const preview = { built: true, deployment: "preview", testHost: "example.vercel.app", testId: "123456789" }
  assert.equal(resolveMetaPixelId(preview, new URL("https://example.vercel.app")), preview.testId)
  assert.equal(resolveMetaPixelId({ ...preview, testId: productionId }, new URL("https://example.vercel.app")), null)
  assert.equal(resolveMetaPixelId(preview, new URL("https://other.vercel.app")), null)
  assert.equal(resolveMetaPixelId({ ...preview, testHost: "localhost" }, new URL("https://localhost")), null)
})

test("no script, events or retroactive conversion before opt-in, after refusal, or under GPC", () => {
  const { tracker, scripts, events, browser } = fixture()
  tracker.setPublicView("signup")
  tracker.confirmedRegistration(success)
  tracker.chooseConsent("refused")
  tracker.confirmedRegistration(success)
  assert.equal(scripts.length, 0)
  assert.deepEqual(events(), [])
  browser.navigator.globalPrivacyControl = true
  tracker.chooseConsent("accepted")
  assert.equal(scripts.length, 0)
})

test("one PageView per rendered public navigation; no SDK auto-configuration", () => {
  const { tracker, browser, scripts, events } = fixture()
  tracker.setPublicView("landing")
  tracker.chooseConsent("accepted")
  tracker.setPublicView("landing")
  tracker.setPublicView("signup")
  tracker.setPublicView("signup")
  tracker.setPublicView("login")
  tracker.setPublicView("landing")
  assert.equal(scripts.length, 1)
  assert.equal(scripts[0].referrerPolicy, "no-referrer")
  assert.equal(browser.fbq.disablePushState, true)
  assert.deepEqual(browser.fbq.queue.slice(0, 3), [
    ["consent", "grant"], ["set", "autoConfig", false, productionId], ["init", productionId],
  ])
  assert.deepEqual(events().map(e => e[2]), ["PageView", "PageView", "PageView", "PageView"])
})

test("acceptance and withdrawal take effect in the current document if storage cannot be written", () => {
  const { tracker, browser, scripts, events } = fixture()
  tracker.setPublicView("landing")
  browser.sessionStorage.setItem = () => { throw new Error("storage blocked") }
  tracker.chooseConsent("accepted")
  assert.equal(tracker.readConsent(), "accepted")
  assert.equal(scripts.length, 1)
  tracker.chooseConsent("refused")
  assert.equal(tracker.readConsent(), "refused")
  assert.deepEqual(events(), [])
})

test("only confirmed verification can convert, once across repeated responses and a reload", () => {
  const { tracker, browser, doc, events } = fixture()
  tracker.chooseConsent("accepted")
  tracker.setPublicView("signup")
  tracker.confirmedRegistration({ ...success, verified: false })
  tracker.confirmedRegistration({ verified: true, signup: null })
  tracker.setPublicView("login")
  tracker.confirmedRegistration(success)
  assert.equal(events().filter(e => e[2] === "CompleteRegistration").length, 0)
  tracker.setPublicView("signup")
  tracker.confirmedRegistration(success)
  tracker.confirmedRegistration(success)
  const reload = createMetaPixel(config, Object.assign(new EventTarget(), {
    location: browser.location, localStorage: browser.localStorage, sessionStorage: browser.sessionStorage,
    navigator: {}, crypto: browser.crypto,
  }), doc)
  reload.setPublicView("signup")
  reload.confirmedRegistration(success)
  assert.deepEqual(events().filter(e => e[2] === "CompleteRegistration"), [[
    "trackSingle", productionId, "CompleteRegistration", {}, { eventID: "12345678-1234-4234-8234-123456789012" },
  ]])
})

test("the choice survives reload in the same tab but not a fresh session", () => {
  const { tracker, browser, doc } = fixture()
  tracker.chooseConsent("refused")
  assert.equal(createMetaPixel(config, browser, doc).readConsent(), "refused")
  const freshSession = fixture()
  freshSession.browser.localStorage = browser.localStorage
  assert.equal(freshSession.tracker.readConsent(), null)
})

test("withdrawal clears unsent events and authentication suspends the tracker", () => {
  const { tracker, browser, events } = fixture()
  tracker.setPublicView("signup")
  tracker.chooseConsent("accepted")
  tracker.confirmedRegistration(success)
  tracker.chooseConsent("refused")
  assert.deepEqual(events(), [])
  assert.deepEqual(browser.fbq.queue.at(-1), ["consent", "revoke"])
  tracker.chooseConsent("accepted")
  tracker.setPublicView(null)
  tracker.confirmedRegistration(success)
  assert.deepEqual(browser.fbq.queue.at(-1), ["consent", "revoke"])
})

test("withdrawal stops new events after the SDK has already loaded", () => {
  const { tracker, browser } = fixture()
  tracker.setPublicView("landing")
  tracker.chooseConsent("accepted")
  const commands = []
  browser.fbq.callMethod = function (...args) {
    assert.equal(this, browser.fbq)
    commands.push(args)
  }
  tracker.setPublicView("signup")
  tracker.chooseConsent("refused")
  tracker.confirmedRegistration(success)
  tracker.setPublicView("login")
  assert.deepEqual(commands, [
    ["trackSingle", productionId, "PageView", {}],
    ["consent", "revoke"],
  ])
})

test("withdrawal on the privacy page persists and revokes tracking when the previous page is restored", () => {
  const { tracker, browser, doc, events, scripts } = fixture()
  tracker.setPublicView("landing")
  tracker.chooseConsent("accepted")
  const unsubscribe = tracker.subscribe(() => {})
  const privacy = createMetaPixel(config, Object.assign(new EventTarget(), {
    location: { href: origin + "/fr/privacy" }, sessionStorage: browser.sessionStorage, navigator: {},
  }), doc)
  assert.equal(privacy.readConsent(), "accepted")
  privacy.chooseConsent("refused")
  assert.equal(scripts.length, 1)

  browser.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }))
  assert.equal(tracker.readConsent(), "refused")
  assert.deepEqual(events(), [])
  assert.deepEqual(browser.fbq.queue.at(-1), ["consent", "revoke"])
  unsubscribe()
})

test("blocks unapproved URLs/referrers and allows narrowly scoped campaign identifiers", () => {
  const { tracker, browser, doc, scripts, events } = fixture()
  browser.location.href = origin + "/fr?email=private%40example.invalid"
  tracker.setPublicView("landing")
  tracker.chooseConsent("accepted")
  assert.equal(scripts.length, 0)
  browser.location.href = origin + "/fr?fbclid=IwARabcdef0123456789&utm_source=fb&utm_campaign=123#platform-preview"
  doc.referrer = "https://example.org/?password=private"
  tracker.setPublicView("signup")
  assert.equal(scripts.length, 0)
  doc.referrer = "https://www.facebook.com/"
  tracker.setPublicView("signup")
  assert.equal(events()[0][2], "PageView")
})
