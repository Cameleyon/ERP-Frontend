import { API_BASE_URL } from "../api/config"

export type AuthenticatedUserResponse = {
  id: number
  firstName: string
  lastName: string
  email: string
  role: string
  companyId: number | null
  companyName: string | null
  companySidebarColor: string | null
  companyPrimaryColor: string | null
  companyLogoUrl: string | null
}

export type LoginRequest = {
  email: string
  password: string
}

export type LoginResponse = {
  token: string
  user: AuthenticatedUserResponse
}

export type PasswordResetStartRequest = {
  email: string
}

export type PasswordResetStartResponse = {
  pendingResetId: string
  email: string
  expiresAt: string
  attemptsRemaining: number
  message: string
}

export type PasswordResetConfirmRequest = {
  pendingResetId: string
  verificationCode: string
  newPassword: string
}

export type PasswordResetConfirmResponse = {
  reset: boolean
  expired: boolean
  requiresRestart: boolean
  attemptsRemaining: number
  message: string
}

async function readErrorMessage(response: Response, fallback: string) {
  const text = await response.text()
  if (!text) {
    return fallback
  }

  try {
    const parsed = JSON.parse(text) as { message?: string }
    return parsed.message || fallback
  } catch {
    return text
  }
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Login failed with status ${response.status}`))
  }

  return response.json()
}

export async function getMe(token: string): Promise<AuthenticatedUserResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Me request failed with status ${response.status}`))
  }

  return response.json()
}

export async function requestPasswordReset(
  payload: PasswordResetStartRequest
): Promise<PasswordResetStartResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/password-reset/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Password reset request failed with status ${response.status}`))
  }

  return response.json()
}

export async function confirmPasswordReset(
  payload: PasswordResetConfirmRequest
): Promise<PasswordResetConfirmResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/password-reset/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Password reset confirmation failed with status ${response.status}`))
  }

  return response.json()
}
