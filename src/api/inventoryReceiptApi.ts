import { API_BASE_URL } from "./config"

const TOKEN_KEY = "camelyon_token"

export type CreateInventoryReceiptCostLineRequest = {
  companyCostRubricId: number
  amount: number
}

export type CreateInventoryReceiptRequest = {
  productId: number
  receivedQuantity: number
  notes: string
  costLines: CreateInventoryReceiptCostLineRequest[]
}

export type InventoryReceiptCostLineResponse = {
  companyCostRubricId: number
  rubricCode: string
  rubricName: string
  amount: number
}

export type InventoryReceiptResponse = {
  id: number
  productId: number
  productName: string
  receivedQuantity: number
  remainingQuantity: number
  totalCostAmount: number
  unitCost: number
  notes: string
  receivedAt: string
  costLines: InventoryReceiptCostLineResponse[]
}

export async function createInventoryReceipt(
  payload: CreateInventoryReceiptRequest
): Promise<InventoryReceiptResponse> {
  const token = localStorage.getItem(TOKEN_KEY)

  const response = await fetch(`${API_BASE_URL}/inventory/receipts`, {
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
