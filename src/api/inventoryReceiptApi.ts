import { API_BASE_URL } from "./config"
import type { ProductQuantityType } from "./productApi"
import type { ReceiptConfirmationType } from "../utils/receiptCosts"
import { checkCompanyCurrencyResponse } from "../utils/companyCurrency"

const TOKEN_KEY = "camelyon_token"

export type CreateInventoryReceiptCostLineRequest = {
  companyCostRubricId: number
  amount: string
}

export type CreateInventoryReceiptRequest = {
  locationId?: number | null
  productId: number
  receivedQuantity: number
  notes: string
  costLines: CreateInventoryReceiptCostLineRequest[]
  costConfirmation?: { type: ReceiptConfirmationType; amounts: Record<number, string> }
}

export type InventoryReceiptCostLineResponse = {
  companyCostRubricId: number
  rubricCode: string
  rubricName: string
  amount: number
}

export type InventoryReceiptResponse = {
  id: number
  locationId: number | null
  locationName: string | null
  productId: number
  productName: string
  quantityType?: ProductQuantityType
  receivedQuantity: number
  remainingQuantity: number
  totalCostAmount: number
  unitCost: number
  notes: string
  receivedAt: string
  receivedAtInstant?: string | null
  receivedAtZoneId?: string | null
  createdAt: string
  updatedAt: string | null
  lastAction: "CREATION" | "WITHDRAWAL" | "MODIFICATION"
  costLines: InventoryReceiptCostLineResponse[]
}

export type CreateInventoryReceiptWithdrawalRequest = {
  quantity: number
  reason: string
}

export type UpdateInventoryReceiptQuantityRequest = {
  receivedQuantity: number
}

export class InventoryReceiptError extends Error {
  readonly code: string
  readonly rejected: boolean
  readonly rubricId?: number

  constructor(code: string, rejected = false, rubricId?: number) {
    super(code)
    this.code = code
    this.rejected = rejected
    this.rubricId = rubricId
  }
}

async function readReceiptResponse<T>(response: Response): Promise<T> {
  await checkCompanyCurrencyResponse(response)
  if (response.ok) return response.json()
  if (response.status >= 500) throw new InventoryReceiptError("RECEIPT_INTERNAL_ERROR")
  if (response.status === 401) throw new InventoryReceiptError("RECEIPT_AUTH_REQUIRED")
  if (response.status === 403) throw new InventoryReceiptError("RECEIPT_ACCESS_DENIED")
  const body = await response.json().catch(() => null)
  const code = typeof body?.code === "string" ? body.code : "RECEIPT_OPERATION_REJECTED"
  throw new InventoryReceiptError(code, (response.status === 400 || response.status === 404)
    && body?.operationRejected === true,
    Number.isSafeInteger(body?.companyCostRubricId) ? body.companyCostRubricId : undefined)
}

export async function createInventoryReceipt(
  payload: CreateInventoryReceiptRequest,
  operationKey: string,
): Promise<InventoryReceiptResponse> {
  const token = localStorage.getItem(TOKEN_KEY)

  const response = await fetch(`${API_BASE_URL}/inventory/receipts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": operationKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  })

  const receipt = await readReceiptResponse<InventoryReceiptResponse>(response)
  if (!Number.isSafeInteger(receipt?.id) || receipt.id <= 0 || receipt.productId !== payload.productId
      || receipt.locationId !== payload.locationId) {
    throw new InventoryReceiptError("RECEIPT_INTERNAL_ERROR")
  }
  return receipt
}

export async function getRecentInventoryReceipts(locationId: number): Promise<InventoryReceiptResponse[]> {
  const token = localStorage.getItem(TOKEN_KEY)

  const response = await fetch(`${API_BASE_URL}/inventory/receipts/recent?locationId=${locationId}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  return readReceiptResponse(response)
}

export async function getActiveInventoryReceipts(locationId: number): Promise<InventoryReceiptResponse[]> {
  const token = localStorage.getItem(TOKEN_KEY)

  const response = await fetch(`${API_BASE_URL}/inventory/receipts/active?locationId=${locationId}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  return readReceiptResponse(response)
}

export async function createInventoryReceiptWithdrawal(
  receiptId: number,
  payload: CreateInventoryReceiptWithdrawalRequest,
): Promise<import("./inventoryApi").InventoryAdjustmentResponse> {
  const token = localStorage.getItem(TOKEN_KEY)

  const response = await fetch(`${API_BASE_URL}/inventory/receipts/${receiptId}/withdrawals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  return readReceiptResponse(response)
}

export async function updateInventoryReceiptQuantity(
  receiptId: number,
  payload: UpdateInventoryReceiptQuantityRequest,
): Promise<InventoryReceiptResponse> {
  const token = localStorage.getItem(TOKEN_KEY)
  const response = await fetch(`${API_BASE_URL}/inventory/receipts/${receiptId}/quantity`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload),
  })
  return readReceiptResponse(response)
}
