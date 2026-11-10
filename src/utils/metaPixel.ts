declare const __VERCEL_ENV__: string

const PRODUCTION_ID = "1882145179608617"
const PRODUCTION_ORIGIN = "https://erp.cameleyondynamics.com"
const CONSENT_KEY = "cameleyon-marketing-consent-session-v1"
const CONSENT_EVENT = "cameleyon:marketing-consent"

type Consent = "accepted" | "refused"
type PublicView = "landing" | "signup" | "login"
type Verification = { verified: boolean; signup: { companyId: number } | null }
type PixelCommand = (...args: unknown[]) => void
type PixelQueue = PixelCommand & {
  callMethod?: PixelCommand
  push: PixelCommand
  queue: unknown[][]
  loaded: boolean
  version: string
  disablePushState: boolean
}
type PixelWindow = Window & {
  fbq?: PixelQueue
  _fbq?: PixelQueue
  navigator: Navigator & { globalPrivacyControl?: boolean }
}

type Config = {
  built: boolean
  deployment: string
  productionId?: string
  testId?: string
  testHost?: string
}

export function resolveMetaPixelId(config: Config, url: URL): string | null {
  if (!config.built || url.protocol !== "https:" || url.port) return null
  if (config.deployment === "production" && url.origin === PRODUCTION_ORIGIN) {
    return config.productionId === PRODUCTION_ID ? PRODUCTION_ID : null
  }
  if (config.deployment === "preview" && url.hostname === config.testHost
      && url.hostname.endsWith(".vercel.app") && config.testId !== PRODUCTION_ID
      && /^\d{5,24}$/.test(config.testId ?? "")) {
    return config.testId ?? null
  }
  return null
}

// The SDK reads the browser URL itself. Skip untrusted URL parameters rather than passing them through.
function safePageUrl(url: URL) {
  if (url.username || url.password || !/^\/(en\/?|fr\/?|es\/?)?$/.test(url.pathname)
      || !["", "#platform-preview"].includes(url.hash)) return false
  for (const [key, value] of url.searchParams) {
    if (key === "fbclid" && /^[A-Za-z0-9_-]{16,512}$/.test(value)) continue
    if (key === "utm_source" && /^(fb|ig|facebook|instagram|meta)$/i.test(value)) continue
    if (key === "utm_medium" && /^(paid_social|cpc|paid|social|ads)$/i.test(value)) continue
    if (["utm_id", "utm_campaign", "utm_content", "utm_term"].includes(key) && /^\d{1,24}$/.test(value)) continue
    return false
  }
  return true
}

function safeReferrer(referrer: string, origin: string) {
  if (!referrer) return true
  const url = new URL(referrer)
  if (url.origin === origin) return safePageUrl(url)
  return url.protocol === "https:" && url.pathname === "/" && !url.search && !url.hash && !url.username && !url.password
}

export function createMetaPixel(config: Config, browser: PixelWindow, doc: Document) {
  let view: PublicView | null = null
  let lastView: string | null = null
  let pixel: PixelQueue | null = null
  let granted = false
  let memoryConsent: Consent | null = null

  function pixelId() {
    if (browser.navigator.globalPrivacyControl || browser.navigator.doNotTrack === "1") return null
    return resolveMetaPixelId(config, new URL(browser.location.href))
  }

  function readConsent(): Consent | null {
    if (memoryConsent) return memoryConsent
    try {
      const saved = browser.sessionStorage.getItem(CONSENT_KEY)
      return saved === "accepted" || saved === "refused" ? saved : null
    } catch { return null }
  }

  function revoke() {
    if (!pixel || !granted) return
    granted = false
    if (!pixel.callMethod) {
      if (pixel.queue.some(args => args[0] === "trackSingle" && args[2] === "PageView")) lastView = null
      pixel.queue = pixel.queue.filter(args => args[0] !== "trackSingle")
    }
    pixel("consent", "revoke")
  }

  function initialize(id: string) {
    if (pixel) return pixel
    // Do not attach our events to an independently configured tracker.
    if (browser.fbq || browser._fbq) return null
    const queue: PixelQueue = Object.assign(function (...args: unknown[]) {
      if (queue.callMethod) queue.callMethod(...args)
      else queue.queue.push(args)
    }, { push: (...args: unknown[]) => queue(...args), queue: [] as unknown[][],
      loaded: true, version: "2.0", disablePushState: true })
    const script = doc.createElement("script")
    script.async = true
    script.referrerPolicy = "no-referrer"
    script.src = "https://connect.facebook.net/en_US/fbevents.js"
    browser.fbq = browser._fbq = pixel = queue
    queue("consent", "grant")
    granted = true
    queue("set", "autoConfig", false, id)
    queue("init", id)
    doc.head.appendChild(script)
    return queue
  }

  function trackingContext() {
    const id = pixelId()
    const url = new URL(browser.location.href)
    if (!id || !view || readConsent() !== "accepted" || !safePageUrl(url) || !safeReferrer(doc.referrer, url.origin)) {
      revoke()
      return null
    }
    const tracker = initialize(id)
    if (!tracker) return null
    if (!granted) {
      tracker("consent", "grant")
      granted = true
    }
    return { tracker, id, key: `${url.pathname}:${view}` }
  }

  function sync() {
    try {
      const context = trackingContext()
      if (!context || context.key === lastView) return
      lastView = context.key
      context.tracker("trackSingle", context.id, "PageView", {})
    } catch { /* Marketing must not interfere with the app. */ }
  }

  return {
    isAvailable: () => pixelId() !== null,
    readConsent,
    subscribe(listener: () => void) {
      const onStorage = (event: StorageEvent) => {
        if (event.key === null || event.key === CONSENT_KEY) {
          sync()
          listener()
        }
      }
      const onPageShow = (event: PageTransitionEvent) => {
        if (!event.persisted) return
        sync()
        listener()
      }
      browser.addEventListener("storage", onStorage)
      browser.addEventListener("pageshow", onPageShow)
      browser.addEventListener(CONSENT_EVENT, listener)
      return () => {
        browser.removeEventListener("storage", onStorage)
        browser.removeEventListener("pageshow", onPageShow)
        browser.removeEventListener(CONSENT_EVENT, listener)
      }
    },
    chooseConsent(choice: Consent) {
      memoryConsent = choice
      try {
        browser.sessionStorage.setItem(CONSENT_KEY, choice)
        if (browser.sessionStorage.getItem(CONSENT_KEY) === choice) memoryConsent = null
      } catch { /* Keep the new choice for this document if storage is blocked. */ }
      sync()
      browser.dispatchEvent(new Event(CONSENT_EVENT))
    },
    setPublicView(next: PublicView | null) {
      view = next
      if (!next) lastView = null
      sync()
    },
    confirmedRegistration(response: Verification) {
      const companyId = response.signup?.companyId
      if (response.verified !== true || !companyId || !Number.isSafeInteger(companyId) || companyId < 1 || view !== "signup") return
      try {
        const context = trackingContext()
        if (!context) return
        const key = `cameleyon-meta-registration:${context.id}:${companyId}`
        if (browser.localStorage.getItem(key)) return
        const eventID = browser.crypto.randomUUID()
        // Reserve before sending. The company ID stays in this browser, not in the event.
        browser.localStorage.setItem(key, eventID)
        context.tracker("trackSingle", context.id, "CompleteRegistration", {}, { eventID })
      } catch { /* Fail closed if the browser cannot persist the deduplication key. */ }
    },
  }
}

export const metaPixel = typeof window === "undefined" ? null : createMetaPixel({
  built: import.meta.env.PROD && import.meta.env.MODE === "production",
  deployment: __VERCEL_ENV__,
  productionId: import.meta.env.VITE_META_PIXEL_ID,
  testId: import.meta.env.VITE_META_TEST_PIXEL_ID,
  testHost: import.meta.env.VITE_META_TEST_HOST,
}, window, document)
