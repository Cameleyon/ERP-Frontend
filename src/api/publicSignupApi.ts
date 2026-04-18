import { API_BASE_URL } from "./config"

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const text = await response.text()
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

export async function signupCompany(
    payload: PublicSignupRequest
): Promise<PublicSignupResponse> {
    const response = await fetch(`${API_BASE_URL}/public/signup-company`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    })

    return handleResponse<PublicSignupResponse>(response)
}
