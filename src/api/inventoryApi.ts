const API_BASE_URL = "http://localhost:8080/api"

export type CreateInventoryAdjustmentRequest = {
  productId: number
  adjustmentType: string
  quantity: number
  reason: string
}

export type InventoryAdjustmentResponse = {
  id: number
  productId: number
  productName: string
  adjustmentType: string
  quantity: number
  stockAfter: number
  reason: string
  createdAt: string
}

export async function createInventoryAdjustment(
  payload: CreateInventoryAdjustmentRequest
): Promise<InventoryAdjustmentResponse> {
  const token = localStorage.getItem("camelyon_token")

  const response = await fetch(`${API_BASE_URL}/inventory/adjustments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed with status ${response.status}`)
  }

  return response.json()
}