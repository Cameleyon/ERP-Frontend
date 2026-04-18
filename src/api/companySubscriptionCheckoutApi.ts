import { apiPost } from "./client"

export type CheckoutSessionResponse = {
    sessionId: string
    url: string
}

export async function createCheckoutSession(): Promise<CheckoutSessionResponse> {
    return apiPost<CheckoutSessionResponse>("/company/subscription/create-checkout-session")
}
