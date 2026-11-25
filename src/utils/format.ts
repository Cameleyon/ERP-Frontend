export function formatCurrency(value: number, currency = "USD", locale = "en-US") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).formatToParts(value).map(part => {
    if (part.type === "decimal") return "."
    if (part.type === "group" && part.value === ".") return "\u00a0"
    return part.value
  }).join("")
}

export function formatDateTime(value: string, locale = "en-CA", timeZone?: string, showOffset = false) {
  // Offset-free API values are wall-clock times, not browser-local instants.
  const wallTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value)
  const date = new Date(wallTime ? value + "Z" : value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(locale, {
    ...(wallTime ? { timeZone: "UTC" } : timeZone ? { timeZone } : {}),
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...(showOffset ? { timeZoneName: "shortOffset" } : {}),
  }).format(date)
}

export function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date)
}

export function formatReceiptDateTime(value: string, locale: string, zone?: string | null) {
  if (zone) {
    try {
      return formatDateTime(value, locale, zone, true)
    } catch (error) {
      if (!(error instanceof RangeError)) throw error
      // A browser with older timezone data can still display the verified UTC instant.
      return formatDateTime(value, locale, "UTC") + " UTC"
    }
  }
  return formatDateTime(value, locale, "UTC")
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}
