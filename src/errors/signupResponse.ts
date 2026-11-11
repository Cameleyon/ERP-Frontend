import { isSignupErrorCode, SignupError, signupErrorCode } from "./signupErrors.ts"

export async function handleSignupResponse<T>(response: Response, valid: (value: unknown) => boolean): Promise<T> {
    let data: unknown
    try { data = await response.json() } catch {
        if (response.ok) throw new SignupError("INVALID_RESPONSE")
    }
    if (!response.ok) {
        const body = data && typeof data === "object" ? data as Record<string, unknown> : {}
        const reference = typeof body.reference === "string" ? body.reference : undefined
        const explicit = isSignupErrorCode(body.code) ? body.code : null
        const compatible = typeof body.message === "string" ? signupErrorCode(new Error(body.message)) : "REQUEST_FAILED"
        const code = explicit ?? (response.status === 408 ? "TIMEOUT" : response.status === 429 ? "RATE_LIMITED"
            : [502, 503, 504].includes(response.status) ? "SERVICE_UNAVAILABLE"
            : response.status >= 500 ? "INTERNAL_ERROR"
            : [401, 403].includes(response.status) ? "ACCESS_DENIED" : compatible)
        throw new SignupError(code, reference, response.status)
    }
    if (!valid(data)) throw new SignupError("INVALID_RESPONSE")
    return data as T
}

export function isVerificationStart(value: unknown): boolean {
    if (!value || typeof value !== "object") return false
    const v = value as Record<string, unknown>
    return typeof v.pendingSignupId === "string" && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v.pendingSignupId)
        && typeof v.adminEmail === "string" && !!v.adminEmail
        && typeof v.expiresAt === "string" && Number.isFinite(Date.parse(v.expiresAt))
        && Number.isInteger(v.attemptsRemaining) && Number(v.attemptsRemaining) >= 1 && Number(v.attemptsRemaining) <= 3
}

export function isVerificationResult(value: unknown): boolean {
    if (!value || typeof value !== "object") return false
    const v = value as Record<string, unknown>
    if (typeof v.verified !== "boolean" || typeof v.expired !== "boolean" || typeof v.requiresRestart !== "boolean"
        || !Number.isInteger(v.attemptsRemaining) || Number(v.attemptsRemaining) < 0 || Number(v.attemptsRemaining) > 3) return false
    if (!v.verified) return v.signup === null
    if (!v.signup || typeof v.signup !== "object") return false
    const signup = v.signup as Record<string, unknown>
    return Number(v.attemptsRemaining) >= 1 && Number.isSafeInteger(signup.companyId) && Number(signup.companyId) > 0
        && typeof signup.adminEmail === "string" && !!signup.adminEmail && !v.expired && !v.requiresRestart
}
