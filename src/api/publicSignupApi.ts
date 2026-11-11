import { API_BASE_URL } from "./config"
import type { Language } from "../i18n/messages"
import { SignupError, signupErrorCode, type SignupErrorCode } from "../errors/signupErrors"
import { handleSignupResponse, isVerificationStart, isVerificationResult } from "../errors/signupResponse"

async function postSignup<T>(path: string, payload: unknown, valid: (value: unknown) => boolean): Promise<T> {
    try {
        const response = await fetch(`${API_BASE_URL}/public/signup-company${path}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload), signal: AbortSignal.timeout(60000),
        })
        return await handleSignupResponse<T>(response, valid)
    } catch (error) {
        if (error instanceof SignupError) throw error
        throw new SignupError(signupErrorCode(error))
    }
}

export type PublicSignupRequest = {
    companyName: string
    businessType?: string
    phone?: string
    companyEmail?: string
    address?: string
    addressLine1?: string
    city?: string
    postalCode?: string
    country?: string
    timeZoneId?: string
    currencyCode?: string
    adminFirstName?: string
    adminLastName?: string
    adminEmail: string
    adminPassword: string
    preferredLanguage?: Language
    planCode?: string
    billingCycle?: "MONTHLY" | "YEARLY"
    partnerCode?: string
    termsAccepted: boolean
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
    errorCode?: SignupErrorCode | null
    signup: PublicSignupResponse | null
}

export async function signupCompany(
    payload: PublicSignupRequest
): Promise<PublicSignupVerificationStartResponse> {
    return postSignup("", payload, isVerificationStart)
}

export async function resendSignupCode(pendingSignupId: string): Promise<PublicSignupVerificationStartResponse> {
    return postSignup("/resend", { pendingSignupId }, isVerificationStart)
}

export async function confirmSignupCompany(
    payload: PublicSignupVerificationConfirmRequest
): Promise<PublicSignupVerificationConfirmResponse> {
    return postSignup("/confirm", payload, isVerificationResult)
}
