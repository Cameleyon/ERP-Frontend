import { apiGet, apiPut } from "./client"

type EmailConsentPreference = { subscribed: boolean }

export async function getEmailConsentAddress() {
  const { mailingAddress } = await apiGet<{ mailingAddress: string }>("/public/email-consent")
  return mailingAddress
}

export function getEmailConsentPreference() {
  return apiGet<EmailConsentPreference>("/auth/email-consent")
}

export function updateEmailConsentPreference(subscribed: boolean, disclosureAddress: string) {
  return apiPut<EmailConsentPreference>("/auth/email-consent", { subscribed, disclosureAddress })
}
