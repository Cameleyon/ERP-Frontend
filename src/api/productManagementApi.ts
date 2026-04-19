import { API_BASE_URL } from "./config"

const TOKEN_KEY = "camelyon_token"

function buildAuthHeaders() {
  const token = localStorage.getItem(TOKEN_KEY)

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed with status ${response.status}`)
  }

  return response.json()
}

export type ProductResponse = {
  id: number
  sku: string
  barcode: string
  name: string
  description: string | null
  category: string | null
  unitPrice: number
  costPrice: number | null
  currentStock: number
  minimumStock: number
  active: boolean
  unitId: number | null
  unitCode: string | null
  unitName: string | null
}

export type CreateProductRequest = {
  barcode: string
  name: string
  description: string
  category: string
  unitPrice: number
  minimumStock: number
  active: boolean
  unitId: number
}

export type UpdateProductRequest = {
  barcode: string
  name: string
  description: string
  category: string
  unitPrice: number
  minimumStock: number
  active: boolean
  unitId: number
}

export async function getProducts(): Promise<ProductResponse[]> {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: "GET",
    headers: {
      ...(localStorage.getItem(TOKEN_KEY)
          ? { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` }
          : {}),
    },
  })

  return handleResponse<ProductResponse[]>(response)
}

export async function createProduct(payload: CreateProductRequest): Promise<ProductResponse> {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(payload),
  })

  return handleResponse<ProductResponse>(response)
}

export async function updateProduct(
    productId: number,
    payload: UpdateProductRequest
): Promise<ProductResponse> {
  const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
    method: "PUT",
    headers: buildAuthHeaders(),
    body: JSON.stringify(payload),
  })

  return handleResponse<ProductResponse>(response)
}
