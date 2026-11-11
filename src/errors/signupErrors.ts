import catalog from "../../shared/signup-errors.json" with { type: "json" }

export type SignupErrorCode = keyof typeof catalog
export type SignupField = "companyName" | "email" | "password" | "terms" | "language" | "code"
export type SignupIssue = { code: SignupErrorCode; field?: SignupField }

export function isSignupErrorCode(value: unknown): value is SignupErrorCode {
  return typeof value === "string" && Object.hasOwn(catalog, value)
}

export class SignupError extends Error {
  readonly code: SignupErrorCode
  readonly reference?: string
  readonly status?: number
  constructor(code: SignupErrorCode, reference?: string, status?: number) {
    super(code)
    this.name = "SignupError"
    this.code = code
    this.reference = reference && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(reference) ? reference : undefined
    this.status = status
  }
}

const legacy: Record<string, SignupErrorCode> = {
  ACTIVE_COMPANY_OWNER_EXISTS: "ACTIVE_OWNER_EXISTS",
  SIGNUP_VERIFICATION_UNAVAILABLE: "VERIFICATION_UNAVAILABLE",
  SIGNUP_RESEND_COOLDOWN: "RESEND_COOLDOWN",
  SIGNUP_RESEND_LIMIT: "RESEND_LIMIT",
  "Company name is required": "COMPANY_NAME_REQUIRED",
  "Admin email is required": "EMAIL_REQUIRED",
  "Admin password is required": "PASSWORD_REQUIRED",
  "Password must be at least 8 characters": "PASSWORD_TOO_SHORT",
  "A valid owner email is required": "EMAIL_INVALID",
  "Terms of use must be accepted": "TERMS_REQUIRED",
  "Unsupported account language": "ACCOUNT_LANGUAGE_INVALID",
  "Mail is not configured on the server": "MAIL_UNAVAILABLE",
  "Selected plan is not available for signup": "PLAN_UNAVAILABLE",
  "Partner code not found or inactive": "PARTNER_CODE_INVALID",
  "Verification code is required": "CODE_REQUIRED",
  "Pending signup ID is required": "VERIFICATION_UNAVAILABLE",
}

export function signupErrorCode(error: unknown): SignupErrorCode {
  if (error instanceof SignupError) return error.code
  if (error instanceof Error) {
    if (isSignupErrorCode(error.message)) return error.message
    if (Object.hasOwn(legacy, error.message)) return legacy[error.message]
    if (error.name === "TimeoutError" || error.name === "AbortError") return "TIMEOUT"
    if (error instanceof TypeError) return "NETWORK"
  }
  return "REQUEST_FAILED"
}

export function signupErrorMessage(code: SignupErrorCode, language: "en" | "fr" | "es") {
  return catalog[code][language === "fr" ? 1 : language === "es" ? 2 : 0]
}

export function validateSignup(values: {
  companyName: string; email: string; password: string; termsAccepted: boolean; preferredLanguage: string
}): SignupIssue[] {
  const issues: SignupIssue[] = []
  const name = values.companyName.trim()
  const email = values.email.trim()
  if (!name) issues.push({ code: "COMPANY_NAME_REQUIRED", field: "companyName" })
  else if (name.length > 255) issues.push({ code: "COMPANY_NAME_TOO_LONG", field: "companyName" })
  if (!email) issues.push({ code: "EMAIL_REQUIRED", field: "email" })
  else if (email.length > 255) issues.push({ code: "EMAIL_TOO_LONG", field: "email" })
  else if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) issues.push({ code: "EMAIL_INVALID", field: "email" })
  if (!values.password.trim()) issues.push({ code: "PASSWORD_REQUIRED", field: "password" })
  else if (values.password.length < 8) issues.push({ code: "PASSWORD_TOO_SHORT", field: "password" })
  else if (new TextEncoder().encode(values.password).length > 72) issues.push({ code: "PASSWORD_TOO_LONG", field: "password" })
  if (!["en", "fr", "es"].includes(values.preferredLanguage)) issues.push({ code: "ACCOUNT_LANGUAGE_INVALID", field: "language" })
  if (!values.termsAccepted) issues.push({ code: "TERMS_REQUIRED", field: "terms" })
  return issues
}

export function validateSignupCode(value: string): SignupErrorCode | null {
  return !value.trim() ? "CODE_REQUIRED" : /^\d{6}$/.test(value.trim()) ? null : "CODE_FORMAT_INVALID"
}
