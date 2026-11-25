const TOKEN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i
const LANGUAGES = new Set(["en", "fr", "es"])
const PRODUCTION_ENDPOINT = "https://erp-backend-6hfk.onrender.com/api/public/trial-sales-reminders/unsubscribe/"
const PAGE_HEADERS = ["content-type", "content-security-policy", "x-content-type-options", "x-frame-options"]

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store")
  res.setHeader("Referrer-Policy", "no-referrer")
  if (process.env.VERCEL_ENV !== "production") return res.status(404).end()

  if (!["GET", "HEAD", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, HEAD, POST")
    return res.status(405).end()
  }

  const { token, lang } = req.query ?? {}
  if (typeof token !== "string" || !TOKEN.test(token)) return res.status(400).end()
  const url = new URL(token, PRODUCTION_ENDPOINT)
  if (LANGUAGES.has(lang)) url.searchParams.set("lang", lang)

  try {
    // The confirmation form has no fields. Forward only the method and validated URL.
    const upstream = await fetch(url, {
      method: req.method,
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    })
    const body = req.method === "HEAD" ? undefined : await upstream.text()
    for (const header of PAGE_HEADERS) {
      const value = upstream.headers.get(header)
      if (value) res.setHeader(header, value)
    }
    return res.status(upstream.status).end(body)
  } catch {
    return res.status(502).end()
  }
}
