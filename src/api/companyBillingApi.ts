import { apiGet, apiPost } from "./client"

export type CreateSetupIntentResponse = {
    clientSecret: string
    customerId: string
}

export type BillingPortalSessionResponse = {
    url: string
}

export type PaymentMethodSummaryResponse = {
    provider: string | null
    customerId: string | null
    defaultPaymentMethodId: string | null
    cardBrand: string | null
    cardLast4: string | null
}

export type DisableAutomaticPaymentResponse = {
    message: string
    nextBillingDate: string | null
}

export async function createSetupIntent(): Promise<CreateSetupIntentResponse> {
    return apiPost<CreateSetupIntentResponse>("/company/billing/setup-intent")
}

export async function getPaymentMethodSummary(): Promise<PaymentMethodSummaryResponse> {
    return apiGet<PaymentMethodSummaryResponse>("/company/billing/payment-method")
}

export async function createBillingPortalSession(): Promise<BillingPortalSessionResponse> {
    return apiPost<BillingPortalSessionResponse>("/company/billing/billing-portal-session")
}

export async function disableAutomaticCardPayments(): Promise<DisableAutomaticPaymentResponse> {
    return apiPost<DisableAutomaticPaymentResponse>("/company/billing/disable-automatic-card-payments")
}
