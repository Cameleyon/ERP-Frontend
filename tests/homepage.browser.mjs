import assert from "node:assert/strict"
import { mkdir, readFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { join } from "node:path"
import { homepageCopy } from "../src/i18n/homepageCopy.ts"
import { demoUser, demoSites, summaryFixture } from "./fixtures/forecast-demo.mjs"

const { chromium } = createRequire(import.meta.url)("playwright")
const origin = process.env.HOMEPAGE_PREVIEW_URL || "http://127.0.0.1:5240"
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error("Browser tests require a local server")
const output = process.env.HOMEPAGE_SCREENSHOTS
const dashboardCapture = process.env.HOMEPAGE_DEMO_DASHBOARD
const consentBuild = process.env.HOMEPAGE_CONSENT_BUILD
const browser = await chromium.launch({ channel: "msedge", headless: true })
const signupTitles = { en: "Sign Up", fr: "Inscription", es: "Registro" }
if (output) await mkdir(output, { recursive: true })

async function localRoutes(page, replyFor) {
  await page.route("**/*", async route => {
    const req = route.request()
    const url = new URL(req.url())
    if (url.pathname.startsWith("/api/") && ["127.0.0.1", "localhost"].includes(url.hostname)) {
      const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" }
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers })
      const [status, json] = replyFor(url.pathname, req.method())
      return route.fulfill({ status, headers, json })
    }
    return url.origin === origin ? route.continue() : route.abort()
  })
}

async function captureDashboard() {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, timezoneId: "UTC" })
  const trend = [82, 120, 56, 134, 96, 132, 97, 110].map((sales, index) => {
    const cost = Math.round(sales * .35)
    return { date: `2026-11-${18 + index}`, sales, cost, profit: sales - cost }
  })
  await page.clock.setFixedTime(new Date("2026-11-25T17:00:00Z"))
  await page.addInitScript(() => localStorage.setItem("camelyon_token", "isolated-demo"))
  await localRoutes(page, (path, method) => {
    if (path === "/api/auth/me") return [200, { ...demoUser, companyName: "Cameleyon Demo Store", companyOwner: true, locations: demoSites }]
    if (path === "/api/company/locations") return [200, demoSites]
    if (path === "/api/company/subscription") return [200, { status: "ACTIVE", planCode: "BASIC", paymentProvider: "NONE" }]
    if (path === "/api/dashboard/setup-status") return [200, {
      hasCurrency: true, hasProduct: true, hasActiveProduct: true, hasRecordedStock: true, hasEverCompletedSale: true, hasAccessibleSite: true,
    }]
    if (path === "/api/dashboard/summary") return [200, { ...summaryFixture,
      totalSales: trend.reduce((total, point) => total + point.sales, 0),
      totalCost: trend.reduce((total, point) => total + point.cost, 0),
      totalProfit: trend.reduce((total, point) => total + point.profit, 0),
      totalTax: 0, totalTransactions: 17,
    }]
    if (path === "/api/dashboard/sales-trend") return [200, trend.map(point => ({ date: point.date,
      totalSales: point.sales, totalCost: point.cost, totalProfit: point.profit,
    }))]
    if (path === "/api/dashboard/top-products") return [200, [
      { productId: 1, productName: "Jasmine rice", sku: "PRD-000001", totalQuantitySold: 24, totalSalesAmount: 480, totalProfitAmount: 402 },
      { productId: 2, productName: "Black beans", sku: "PRD-000002", totalQuantitySold: 16, totalSalesAmount: 288, totalProfitAmount: 196 },
    ]]
    if (path.startsWith("/api/forecasts/")) return [200, { status: "DISABLED" }]
    return [200, method === "GET" ? [] : {}]
  })
  await page.goto(origin + "/en")
  await page.locator(".summary-card").first().waitFor()
  await page.locator(".recharts-line-curve").first().waitFor()
  const chart = await page.locator(".sales-trend-card").boundingBox()
  await page.screenshot({ path: dashboardCapture, animations: "disabled",
    clip: { x: 0, y: 0, width: 1600, height: Math.ceil(chart.y + chart.height + 14) },
  })
  await page.close()
}

// Run against a local production build with a synthetic preview host and test Pixel ID.
async function verifyConsent() {
  const host = "https://homepage-consent-test.vercel.app"
  for (const [width, accept] of [[390, false], [1440, true]]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    const events = []
    let sdkLoads = 0
    await page.route("**/*", async route => {
      const url = new URL(route.request().url())
      if (url.hostname === "connect.facebook.net") {
        sdkLoads++
        return route.fulfill({ contentType: "application/javascript", body: `
          window.testPixel = [];
          fbq.callMethod = (...args) => window.testPixel.push(args);
          for (const args of fbq.queue.splice(0)) fbq.callMethod(...args);
        ` })
      }
      if (url.pathname === "/api/analytics/visit") {
        events.push(route.request().postDataJSON())
        return route.fulfill({ status: 204 })
      }
      if (url.pathname.startsWith("/api/")) return route.fulfill({ json: [] })
      if (url.origin !== host) return route.abort()
      if (["/en", "/fr", "/es"].includes(url.pathname)) {
        return route.fulfill({ path: join(consentBuild, "index.html") })
      }
      if (/^\/assets\/[\w.-]+$/.test(url.pathname)) {
        return route.fulfill({ path: join(consentBuild, url.pathname.slice(1)) })
      }
      return route.abort()
    })
    await page.goto(host + "/en")
    await page.getByRole("button", { name: accept ? "Accept" : "Decline", exact: true }).waitFor()
    assert.equal(sdkLoads, 0)
    await page.getByRole("button", { name: accept ? "Accept" : "Decline", exact: true }).click()
    await page.locator(".marketing-preferences").waitFor({ state: "hidden" })
    if (accept) await page.waitForFunction(() => window.testPixel?.some(event => event[2] === "PageView"))
    await page.locator(".home-hero").getByRole("button", { name: homepageCopy.en.signup }).click()
    await page.getByRole("heading", { name: signupTitles.en, exact: true }).waitFor()
    assert.equal(await page.locator(".marketing-preferences").count(), 0)
    if (accept) {
      await page.waitForFunction(() => window.testPixel?.filter(event => event[2] === "PageView").length === 2)
      assert.deepEqual(await page.evaluate(() => window.testPixel.filter(event => event[0] === "trackSingle").map(event => event[2])), ["PageView", "PageView"])
    } else {
      assert.equal(await page.evaluate(() => typeof window.fbq), "undefined")
    }
    assert.equal(sdkLoads, accept ? 1 : 0)
    await page.waitForFunction(() => !!document.querySelector(".public-signup-form"))
    assert.ok(events.length > 0, "existing first-party reporting remains active")
    await page.close()
  }
  console.log("2 simulated preview consent cases passed (accept & decline)")
}

try {
  if (dashboardCapture) {
    await captureDashboard()
  } else if (consentBuild) {
    // Validate the requested build before intercepting the simulated preview URL.
    await readFile(join(consentBuild, "index.html"))
    await verifyConsent()
  } else {
    for (const language of ["en", "fr", "es"]) {
      const text = homepageCopy[language]
      for (const [size, width, height] of [["desktop", 1440, 900], ["mobile", 390, 844], ["compact", 320, 720], ["tablet", 768, 1024]]) {
        const fail = size === "compact"
        const hasExtraOffer = size === "tablet"
        const page = await browser.newPage({ viewport: { width, height } })
        const errors = [], requests = []
        page.on("pageerror", error => errors.push(error.message))
        await localRoutes(page, path => {
          requests.push(path)
          if (path === "/api/public/plans") return fail ? [503, { message: "internal fixture error" }] : [200, [
            { id: 1, code: "BASIC", monthlyPrice: 3.99, yearlyPrice: hasExtraOffer ? 39 : 39.99 },
            { id: 2, code: "STANDARD", monthlyPrice: 9, yearlyPrice: 90 },
          ]]
          if (path === "/api/public/promotions") return fail ? [503, { message: "internal fixture error" }] : [200, [
            { id: 1, name: "Standard trial", freeTrialDays: 90 },
            ...(hasExtraOffer ? [{ id: 2, name: "Bonus trial", nameEn: "Bonus trial", nameFr: "Essai prolongé", freeTrialDays: 100 }] : []),
          ]]
          return [200, {}]
        })
        const catalogResponse = page.waitForResponse(response => response.url().endsWith("/api/public/promotions"))
        await page.goto(origin + "/" + language)
        await catalogResponse
        await page.getByRole("heading", { level: 1, name: text.headline }).waitFor()
        await page.waitForFunction(() => [...document.images].filter(img => img.fetchPriority === "high").every(img => img.complete && img.naturalWidth > 0))
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${language} ${size} overflow`)
        assert.equal(await page.locator("html").getAttribute("lang"), language)
        assert.deepEqual(await page.locator(".home-status").allTextContents(), [text.available, text.planned, text.planned])
        assert.equal(await page.locator(".home-plan:not(.home-basic) button").count(), 0)
        assert.equal(await page.locator(".home-hero").getByText(text.trial).count(), 1)
        assert.equal(await page.getByText("internal fixture error", { exact: true }).count(), 0)
        const basicCard = page.locator(".home-basic")
        const prices = basicCard.locator(".home-basic-pricing")
        if (fail) {
          assert.equal(await prices.count(), 0)
          assert.equal(await basicCard.getByRole("link", { name: text.pricing }).count(), 1)
        } else {
          await prices.waitFor()
          const [monthly, annual] = await prices.locator("strong").allTextContents()
          assert.match(monthly, /^(?:USD\s+3\.99|3\.99\s+USD)$/)
          const annualAmount = hasExtraOffer ? "39\\.00" : "39\\.99"
          assert.match(annual, new RegExp(`^(?:USD\\s+${annualAmount}|${annualAmount}\\s+USD)$`))
          assert.deepEqual(await prices.locator("p").allTextContents(), [
            text.afterTrial, `${monthly} ${text.perMonth}`, `${annual} ${text.perYear}`,
          ])
        }
        assert.equal(await page.locator(".home-plan:not(.home-basic)").getByText(/USD/).count(), 0)
        if (hasExtraOffer) {
          await page.locator("#homepage-offers").waitFor()
          assert.equal(await page.locator(".home-hero + section").getByText(text.offerDays(100), { exact: true }).count(), 1)
        } else {
          assert.equal(await page.locator("#homepage-offers").count(), 0)
        }
        assert.ok(requests.includes("/api/public/plans") && requests.includes("/api/public/promotions"))
        await page.locator("summary").nth(3).click()
        assert.equal(await page.locator("details").nth(3).getAttribute("open"), "")
        await page.locator("summary").nth(3).click()
        await page.getByRole("button", { name: text.terms }).click()
        await page.locator("dialog[open]").waitFor()
        await page.keyboard.press("Escape")
        assert.equal(await page.locator("dialog[open]").count(), 0)
        assert.equal(await page.getByRole("link", { name: text.privacy }).getAttribute("href"), `/${language}/privacy`)
        await page.locator("header").getByRole("link", { name: text.plans }).click()
        assert.equal(new URL(page.url()).hash, "#plans")
        await page.locator(".home-hero").getByRole("link", { name: text.explore }).click()
        assert.equal(new URL(page.url()).hash, "#features")
        if (output && (size === "desktop" || size === "mobile")) {
          await page.evaluate(async () => {
            for (const img of document.querySelectorAll("main img")) img.loading = "eager"
            await Promise.all(Array.from(document.querySelectorAll("main img"), img => img.decode()))
            window.scrollTo(0, 0)
          })
          await page.screenshot({ path: `${output}/homepage-${language}-${size}.png`, fullPage: true })
          await page.screenshot({ path: `${output}/hero-${language}-${size}.png` })
        }
        await page.locator(".home-final").getByRole("button", { name: text.signup }).click()
        await page.getByRole("heading", { level: 1, name: signupTitles[language] }).waitFor()
        assert.equal(await page.locator("select").first().inputValue(), language)
        assert.equal(await page.evaluate(() => window.scrollY), 0)
        await page.goto(origin + "/" + language)
        await page.getByRole("button", { name: text.login, exact: true }).click()
        await page.locator("input[name=accountType][value=OWNER]").check()
        await page.locator("input[type=password]").waitFor()
        if (size === "mobile") {
          const target = language === "fr" ? "es" : "fr"
          await page.goto(origin + "/" + language)
          await page.locator(`header a[hreflang="${target}"]`).click()
          await page.getByRole("heading", { level: 1, name: homepageCopy[target].headline }).waitFor()
        }
        assert.deepEqual(errors, [])
        await page.close()
      }
    }
    console.log("12 localized viewport/navigation cases passed, including 3 catalog failures")
  }
} finally {
  await browser.close()
}
