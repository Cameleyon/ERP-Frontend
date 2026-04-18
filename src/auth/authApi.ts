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

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Login failed with status ${response.status}`)
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
    const text = await response.text()
    throw new Error(text || `Me request failed with status ${response.status}`)
  }

  return response.json()
}
