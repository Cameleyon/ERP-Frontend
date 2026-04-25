import { API_BASE_URL } from "./config"

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const text = await response.text()
        if (text) {
            try {
                const parsed = JSON.parse(text) as { message?: string }
                if (parsed.message) {
                    throw new Error(parsed.message)
                }
            } catch (error) {
                if (error instanceof Error && error.message !== text) {
                    throw error
                }
            }
        }
        throw new Error(text || `Request failed with status ${response.status}`)
    }

    return response.json()
}

export type PublicSignupRequest = {
    companyName: string
    businessType: string
    phone: string
    companyEmail: string
    address: string
    currencyCode: string
    adminFirstName: string
    adminLastName: string
    adminEmail: string
    adminPassword: string
    planCode: string
    billingCycle: "MONTHLY" | "YEARLY"
    partnerCode?: string
}

export type PublicSignupResponse = {
    companyId: number
    companyName: string
    adminUserId: number
    adminEmail: string
    planCode: string
    subscriptionStatus: string
    accessStartAt: string
    accessEndAt: string
    checkoutSessionId: string | null
    checkoutUrl: string | null
    message: string
}

export type PublicSignupVerificationStartResponse = {
    pendingSignupId: string
    adminEmail: string
    expiresAt: string
    attemptsRemaining: number
    message: string
}

export type PublicSignupVerificationConfirmRequest = {
    pendingSignupId: string
    verificationCode: string
}

export type PublicSignupVerificationConfirmResponse = {
    verified: boolean
    expired: boolean
    requiresRestart: boolean
    attemptsRemaining: number
    message: string
    signup: PublicSignupResponse | null
}

export async function signupCompany(
    payload: PublicSignupRequest
): Promise<PublicSignupVerificationStartResponse> {
    const response = await fetch(`${API_BASE_URL}/public/signup-company`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    })

    return handleResponse<PublicSignupVerificationStartResponse>(response)
}

export async function confirmSignupCompany(
    payload: PublicSignupVerificationConfirmRequest
): Promise<PublicSignupVerificationConfirmResponse> {
    const response = await fetch(`${API_BASE_URL}/public/signup-company/confirm`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    })

    return handleResponse<PublicSignupVerificationConfirmResponse>(response)
}
