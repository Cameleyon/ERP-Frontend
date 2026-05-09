export const DEFAULT_COMPANY_TIME_ZONE = "America/Port-au-Prince"

const FALLBACK_TIME_ZONES: string[] = [
  "UTC",
  "America/Port-au-Prince",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "America/Guatemala",
  "America/Panama",
  "America/Santo_Domingo",
  "America/Bogota",
  "America/Lima",
  "America/Caracas",
  "America/Santiago",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "Europe/Berlin",
  "Europe/Brussels",
  "Europe/Paris",
  "Europe/Madrid",
  "Europe/London",
  "Europe/Rome",
  "Europe/Lisbon",
  "Europe/Zurich",
  "Africa/Casablanca",
  "Africa/Abidjan",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
]

const FALLBACK_COUNTRIES = [
  "Canada",
  "Dominican Republic",
  "France",
  "Haiti",
  "Mexico",
  "Panama",
  "Spain",
  "United Kingdom",
  "United States",
] as const

export function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_COMPANY_TIME_ZONE
  } catch {
    return DEFAULT_COMPANY_TIME_ZONE
  }
}

export function getTimeZoneOptions() {
  const browserTimeZone = getBrowserTimeZone()

  const options = [...FALLBACK_TIME_ZONES].filter(isValidTimeZone)

  if (browserTimeZone && isValidTimeZone(browserTimeZone) && !options.includes(browserTimeZone)) {
    options.unshift(browserTimeZone)
  }

  return options
}

export function getCountryOptions() {
  return [...FALLBACK_COUNTRIES]
}

export function isValidTimeZone(value: string) {
  if (!value.trim()) {
    return false
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date())
    return true
  } catch {
    return false
  }
}

export function formatCurrentTimeInTimeZone(timeZoneId: string, language: string) {
  if (!isValidTimeZone(timeZoneId)) {
    return ""
  }

  const locale = language === "fr" ? "fr-CA" : language === "es" ? "es-ES" : "en-CA"
  return new Intl.DateTimeFormat(locale, {
    timeZone: timeZoneId,
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date())
}

export function composeStructuredAddress(parts: {
  addressLine1?: string
  city?: string
  postalCode?: string
  country?: string
}) {
  return [
    parts.addressLine1?.trim(),
    parts.city?.trim(),
    parts.postalCode?.trim(),
    parts.country?.trim(),
  ]
    .filter((value) => Boolean(value))
    .join(", ")
}
