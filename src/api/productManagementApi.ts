import { API_BASE_URL } from "./config"
import type { ProductQuantityType } from "./productApi"
import { checkCompanyCurrencyResponse } from "../utils/companyCurrency"

const TOKEN_KEY = "camelyon_token"

export class ProductResponseError extends Error {
  readonly status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}

function buildAuthHeaders() {
  const token = localStorage.getItem(TOKEN_KEY)

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  await checkCompanyCurrencyResponse(response)
  if (!response.ok) {
    const text = await response.text()
    let message = text
    try { message = JSON.parse(text)?.message || text } catch { /* Preserve existing fallback. */ }
    throw new ProductResponseError(message || `Request failed with status ${response.status}`, response.status)
  }

  return response.json()
}

export type ProductResponse = {
  id: number
  sku: string
  barcode: string | null
  name: string
  description: string | null
  category: string | null
  unitPrice: number
  costPrice: number | null
  currentStock: number
  minimumStock: number
  active: boolean
  unitName: string | null
  quantityType?: ProductQuantityType
  priceTiers: ProductPriceTier[]
}

export type ProductPriceTier = {
  id?: number
  label: string | null
  minQuantity: number
  unitPrice: number
}

export type CreateProductRequest = {
  quantityType?: ProductQuantityType
  barcode: string
  name: string
  description: string
  category: string
  unitPrice: number
  minimumStock: number
  active: boolean
  unitName: string
  priceTiers: ProductPriceTierRequest[]
}

export type UpdateProductRequest = {
  barcode: string
  name: string
  description: string
  category: string
  unitPrice: number
  minimumStock: number
  active: boolean
  unitName: string
  priceTiers: ProductPriceTierRequest[]
}

export type ProductPriceTierRequest = {
  label: string | null
  minQuantity: number
  unitPrice: number
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

  const product = await handleResponse<ProductResponse>(response)
  if (!Number.isSafeInteger(product?.id) || product.id <= 0 || typeof product.name !== "string") {
    throw new Error("Unconfirmed product response")
  }
  return product
}

export async function getProduct(id: number): Promise<ProductResponse> {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, { headers: buildAuthHeaders() })
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
