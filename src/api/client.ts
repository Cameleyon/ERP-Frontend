import { API_BASE_URL } from "./config"

const TOKEN_KEY = "camelyon_token"

function getAuthHeaders(includeJsonContentType = false) {
  const token = localStorage.getItem(TOKEN_KEY)
  const headers: Record<string, string> = {}

  if (includeJsonContentType) {
    headers["Content-Type"] = "application/json"
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

async function parseResponseBody<T>(response: Response): Promise<T> {
  const text = await response.text()

  if (!response.ok) {
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
        throw new Error(text)
      }
    }

    throw new Error(`Request failed with status ${response.status}`)
  }

  if (!text) {
    return undefined as T
  }

  return JSON.parse(text) as T
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: getAuthHeaders(),
  })

  return parseResponseBody<T>(response)
}

export async function apiPost<T, TBody = unknown>(path: string, body?: TBody): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: getAuthHeaders(true),
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  return parseResponseBody<T>(response)
}

export async function apiPut<T, TBody = unknown>(path: string, body?: TBody): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: getAuthHeaders(true),
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  return parseResponseBody<T>(response)
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  })

  return parseResponseBody<T>(response)
}
