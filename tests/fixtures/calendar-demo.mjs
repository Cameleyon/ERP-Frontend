export function createCalendarDemoFetch() {
  let schedule = null
  let dates = []
  const reply = value => new Response(JSON.stringify(value), { status: 200, headers: { "Content-Type": "application/json" } })
  return async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url, "http://localhost")
    const method = init.method || "GET"
    const path = url.pathname
    if (method === "GET" && path === "/api/auth/me") return reply({ id: 0, role: "ADMIN", preferredLanguage: null })
    if (method === "GET" && path === "/api/company/locations") return reply([{ id: 9, name: "Local demo site", active: true }])
    if (method === "GET" && path === "/api/company/profile") return reply({ currencyCode: "HTG", timeZoneId: "Etc/GMT+5" })
    if (method === "GET" && path === "/api/history/calendar") {
      return reply({ businessTimeZone: "Etc/GMT+5", calendar: {
        locationId: 9, effectiveFrom: schedule?.effectiveFrom ?? null, weekdays: schedule?.weekdays ?? [],
        schedules: schedule ? [schedule] : [], dates: dates.filter(row => row.date >= url.searchParams.get("startDate") && row.date <= url.searchParams.get("endDate")),
      } })
    }
    if (method === "PUT" && path === "/api/history/calendar/hours") {
      schedule = JSON.parse(init.body)
      return new Response(null, { status: 204 })
    }
    if (method === "PUT" && /^\/api\/history\/calendar\/dates\/\d{4}-\d{2}-\d{2}$/.test(path)) {
      const date = path.split("/").at(-1)
      const body = JSON.parse(init.body)
      dates = dates.filter(row => row.date !== date)
      if (body.dayType !== "REGULAR" || body.eventDescription) dates.push({ date, ...body })
      return new Response(null, { status: 204 })
    }
    return new Response(JSON.stringify({ message: "Unavailable in local demo" }), { status: 503, headers: { "Content-Type": "application/json" } })
  }
}
