const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store")
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return res.status(405).end()
  }
  // Only production traffic belongs in the business counters.
  if (process.env.VERCEL_ENV !== "production") return res.status(204).end()
  const secret = process.env.ANALYTICS_INGEST_SECRET
  const base = process.env.ANALYTICS_API_BASE_URL || process.env.VITE_API_BASE_URL
  if (!secret || secret.length < 32 || !base) return res.status(503).end()

  let origin
  try {
    origin = new URL(req.headers.origin).host
  } catch {
    return res.status(403).end()
  }
  if (origin !== req.headers.host) return res.status(403).end()

  let body
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).end()
  }
  if (!body || !UUID.test(body.visitId) || !UUID.test(body.visitorId)) return res.status(400).end()
  // The country comes from Vercel's request metadata, never from the browser payload.
  const country = req.headers["x-vercel-ip-country"]
  const countryCode = typeof country === "string" && /^[A-Z]{2}$/.test(country) ? country : "ZZ"
  try {
    const url = new URL(`${base.replace(/\/$/, "")}/public/analytics/visits`)
    if (url.protocol !== "https:") return res.status(503).end()
    const result = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Analytics-Secret": secret },
      body: JSON.stringify({ visitId: body.visitId, visitorId: body.visitorId, countryCode }),
      signal: AbortSignal.timeout(5000),
    })
    return res.status(result.ok ? 204 : 502).end()
  } catch {
    return res.status(502).end()
  }
}
