const VISITOR_KEY = "cameleyon-visitor-id"

export function trackApplicationVisit() {
  if (!import.meta.env.PROD || navigator.doNotTrack === "1") return
  try {
    let visitorId = localStorage.getItem(VISITOR_KEY)
    if (!visitorId || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(visitorId)) {
      visitorId = crypto.randomUUID()
      localStorage.setItem(VISITOR_KEY, visitorId)
    }
    const body = JSON.stringify({ visitId: crypto.randomUUID(), visitorId })
    // Retrying the same visit ID cannot increment the backend counter twice.
    async function send(retry = true) {
      try {
        const result = await fetch("/api/analytics/visit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        })
        if (!result.ok && retry) window.setTimeout(() => { void send(false) }, 5000)
      } catch {
        if (retry) window.setTimeout(() => { void send(false) }, 5000)
      }
    }
    void send()
  } catch {
    // Browsing remains available when storage or tracking is blocked.
  }
}
