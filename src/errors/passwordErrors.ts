import { signupErrorMessage } from "./signupErrors.ts"

type Language = "en" | "fr" | "es"

export function newPasswordLengthError(password: string, language: Language) {
  return new TextEncoder().encode(password).length > 72
    ? signupErrorMessage("PASSWORD_TOO_LONG", language)
    : undefined
}

export function passwordRequestError(error: unknown, language: Language, fallback: string) {
  if (!(error instanceof Error)) return fallback
  if (error.message === "PASSWORD_TOO_LONG" || error.message === signupErrorMessage("PASSWORD_TOO_LONG", "en")) {
    return signupErrorMessage("PASSWORD_TOO_LONG", language)
  }
  return error.message
}
