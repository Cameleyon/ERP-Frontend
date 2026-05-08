export const DEFAULT_COMPANY_TIME_ZONE = "America/Port-au-Prince"

const FALLBACK_TIME_ZONES = [
  "America/Port-au-Prince",
  "America/New_York",
  "America/Toronto",
  "America/Mexico_City",
  "America/Panama",
  "America/Santo_Domingo",
  "America/Bogota",
  "America/Los_Angeles",
  "UTC",
  "Europe/Paris",
  "Europe/Madrid",
  "Europe/London",
] as const

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
  const supportedValuesOf = Intl.supportedValuesOf as
    | ((key: "timeZone") => string[])
    | undefined

  if (typeof supportedValuesOf === "function") {
    const values = supportedValuesOf("timeZone")
    if (values.length > 0) {
      return values
    }
  }

  return [...FALLBACK_TIME_ZONES]
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
