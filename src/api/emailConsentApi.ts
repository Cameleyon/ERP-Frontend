import { apiGet, apiPut } from "./client"

type EmailConsentPreference = { productUpdates: boolean }

export function getEmailConsentPreference() {
  return apiGet<EmailConsentPreference>("/auth/email-consent")
}

export function updateEmailConsentPreference(productUpdates: boolean) {
  return apiPut<EmailConsentPreference>("/auth/email-consent", { productUpdates })
}
