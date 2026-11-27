import assert from "node:assert/strict"
import { mkdir, readFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { homepageCopy } from "../src/i18n/homepageCopy.ts"
import { messages } from "../src/i18n/messages.ts"
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
  const language = process.env.HOMEPAGE_DEMO_LANGUAGE || "en"
  const mobile = process.env.HOMEPAGE_DEMO_MOBILE === "1"
  const width = mobile ? 390 : 1600
  const page = await browser.newPage({ viewport: { width, height: 1000 }, timezoneId: "UTC" })
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
  await page.goto(origin + "/" + language)
  await page.locator(".summary-card").first().waitFor()
  await page.locator(".recharts-line-curve").first().waitFor()
  const trendCard = page.locator(".sales-trend-card")
  if (mobile) {
    await trendCard.screenshot({ path: dashboardCapture, animations: "disabled", quality: 87 })
  } else {
    const chart = await trendCard.boundingBox()
    await page.screenshot({ path: dashboardCapture, animations: "disabled",
      clip: { x: 0, y: 0, width, height: Math.ceil(chart.y + chart.height + 14) },
      ...(dashboardCapture.endsWith(".jpg") ? { quality: 87 } : {}),
    })
    if (process.env.HOMEPAGE_DEMO_FEATURES === "1") {
      for (const [asset, label] of [["inventory", messages[language].sidebar.inventory], ["sales", messages[language].sidebar.newSale]]) {
        await page.getByRole("button", { name: label, exact: true }).click()
        await page.locator(".app-content h1").first().waitFor()
        await page.screenshot({
          path: join(dirname(dashboardCapture), `homepage-${asset}-${language}.jpg`),
          animations: "disabled", quality: 84, clip: { x: 0, y: 0, width, height: 540 },
        })
      }
    }
  }
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
    const headingSizes = new Map()
    for (const language of ["en", "fr", "es"]) {
      const text = homepageCopy[language]
      for (const [size, width, height] of [["desktop", 1440, 900], ["mobile", 390, 844], ["compact", 320, 720], ["tablet", 768, 1024], ["laptop", 1101, 768]]) {
        const fail = size === "compact"
        const hasExtraOffer = size === "tablet"
        const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" })
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
            ...(hasExtraOffer ? [
              { id: 2, name: "Bonus trial", nameEn: "Bonus trial", nameFr: "Essai prolongé", freeTrialDays: 100 },
              { id: 3, name: "USD 3.99", nameEn: "USD 3.99", descriptionFr: "3,99 USD", promoPriceMonthly: 3.99 },
            ] : []),
          ]]
          return [200, {}]
        })
        const catalogResponses = ["/api/public/plans", "/api/public/promotions"].map(path =>
          page.waitForResponse(response => response.url().endsWith(path)))
        await page.goto(origin + "/" + language)
        await Promise.all(catalogResponses)
        const headline = page.getByRole("heading", { level: 1, name: text.headline.join(" ") })
        await headline.waitFor()
        const headingSize = await headline.evaluate(node => getComputedStyle(node).fontSize)
        if (language === "en") headingSizes.set(width, headingSize)
        else assert.equal(headingSize, headingSizes.get(width), `${language} ${size} headline differs from English`)
        await page.waitForFunction(() => [...document.images].filter(img => img.fetchPriority === "high").every(img => img.complete && img.naturalWidth > 0))
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${language} ${size} overflow`)
        const heroAction = page.locator(".home-hero").getByRole("button", { name: text.signup })
        const buttonBox = await heroAction.boundingBox()
        assert.ok(buttonBox && buttonBox.y + buttonBox.height <= height, `${language} ${size} trial CTA below the fold`)
        assert.equal(await heroAction.evaluate(button => getComputedStyle(button).transitionDuration), "0s")
        const mobileDashboard = width <= 620
        assert.match(await page.locator(".home-stage img").evaluate(img => img.currentSrc),
          new RegExp(`homepage-dashboard-${language}-${mobileDashboard ? "mobile" : "wide"}[.-]`))
        for (const asset of ["inventory", "sales"]) {
          await page.locator(`img[src*="homepage-${asset}-${language}"]`).evaluate(img => {
            img.loading = "eager"
            return img.decode()
          })
        }
        if (width >= 1101) {
          const header = page.locator(".home-bar")
          const headerButton = header.getByRole("button", { name: text.headerSignup, exact: true })
          assert.equal((await header.boundingBox()).width, width)
          assert.equal((await header.boundingBox()).height, 91)
          assert.equal((await headerButton.boundingBox()).height, 44)
        }
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
          assert.equal(await page.locator(".home-promos").getByText(/3[.,]99/).count(), 0)
        } else {
          assert.equal(await page.locator("#homepage-offers").count(), 0)
        }
        assert.ok(requests.includes("/api/public/plans") && requests.includes("/api/public/promotions"))
        const expiry = page.locator(".home-questions details").nth(3)
        await expiry.locator("summary").click()
        assert.equal(await expiry.getAttribute("open"), "")
        await expiry.locator("summary").click()
        await page.getByRole("button", { name: text.terms }).click()
        await page.locator("dialog[open]").waitFor()
        await page.keyboard.press("Escape")
        assert.equal(await page.locator("dialog[open]").count(), 0)
        assert.equal(await page.getByRole("link", { name: text.privacy }).getAttribute("href"), `/${language}/privacy`)
        if (width <= 620) {
          const menu = page.locator(".home-mobile-menu summary")
          await menu.focus()
          await page.keyboard.press("Enter")
          assert.equal(await page.locator(".home-mobile-menu").getAttribute("open"), "")
        }
        await page.locator("header").getByRole("link", { name: text.plans }).click()
        assert.equal(new URL(page.url()).hash, "#plans")
        assert.equal(await page.locator(".home-mobile-menu").getAttribute("open"), null)
        await page.locator(".home-hero").getByRole("link", { name: text.explore }).click()
        assert.equal(new URL(page.url()).hash, "#features")
        if (output && (size === "desktop" || size === "mobile")) {
          await page.mouse.move(0, 0)
          await page.evaluate(async () => {
            for (const img of document.querySelectorAll("main img")) img.loading = "eager"
            await Promise.all(Array.from(document.querySelectorAll("main img"), img => img.decode()))
            window.scrollTo(0, 0)
          })
          await page.screenshot({ path: `${output}/homepage-${language}-${size}.png`, fullPage: true })
          await page.screenshot({ path: `${output}/hero-${language}-${size}.png` })
        }
        const signup = size === "laptop"
          ? page.locator("header").getByRole("button", { name: text.headerSignup, exact: true })
          : page.locator(".home-final").getByRole("button", { name: text.signup })
        await signup.click()
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
          await page.getByRole("heading", { level: 1, name: homepageCopy[target].headline.join(" ") }).waitFor()
          await page.getByRole("link", { name: homepageCopy[target].privacy }).click()
          await page.waitForURL(`**/${target}/privacy`)
          assert.equal(await page.locator("html").getAttribute("lang"), target)
        }
        assert.deepEqual(errors, [])
        await page.close()
      }
    }
    console.log("15 localized viewport/navigation cases passed, including 3 catalog failures")
  }
} finally {
  await browser.close()
}
