import { API_BASE_URL } from "./config"

const TOKEN_KEY = "camelyon_token"

function buildAuthHeaders() {
  const token = localStorage.getItem(TOKEN_KEY)

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export type CreateSaleItemRequest = {
  productId: number
  quantity: number
}

export type CreateSaleRequest = {
  locationId?: number | null
  customerId?: number | null
  customerName: string
  paymentMethod: string
  paymentReference?: string | null
  paymentAuthorizationCode?: string | null
  paymentConfirmedManually?: boolean
  notes: string
  items: CreateSaleItemRequest[]
}

export type CreateSaleResponse = {
  id: number
  saleNumber: string
  soldAt: string
  locationId: number | null
  locationName: string | null
  customerId: number | null
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  paymentMethod: string
  paymentReference: string | null
  paymentAuthorizationCode: string | null
  paymentConfirmedManually: boolean
  paymentConfirmedAt: string | null
  subtotalAmount: number
  taxAmount: number
  totalAmount: number
  totalCostAmount: number
  totalProfitAmount: number
  status: string
}

export type SaleResponse = {
  id: number
  saleNumber: string
  soldAt: string
  locationId: number | null
  locationName: string | null
  customerId: number | null
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  paymentMethod: string
  paymentReference: string | null
  paymentAuthorizationCode: string | null
  paymentConfirmedManually: boolean
  paymentConfirmedAt: string | null
  subtotalAmount: number
  taxAmount: number
  totalAmount: number
  totalCostAmount: number
  totalProfitAmount: number
  status: string
  cancellationRequestStatus: string | null
  cancellationRequestedAt: string | null
  cancellationRequestedByName: string | null
}

export type SaleItemResponse = {
  productId: number
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export type SaleDetailResponse = {
  id: number
  saleNumber: string
  soldAt: string
  locationId: number | null
  locationName: string | null
  customerId: number | null
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  paymentMethod: string
  paymentReference: string | null
  paymentAuthorizationCode: string | null
  paymentConfirmedManually: boolean
  paymentConfirmedAt: string | null
  subtotalAmount: number
  taxAmount: number
  totalAmount: number
  totalCostAmount: number
  totalProfitAmount: number
  status: string
  cancellationRequestStatus: string | null
  cancellationRequestedAt: string | null
  cancellationRequestedByName: string | null
  items: SaleItemResponse[]
}

export type SaleCancellationRequestResponse = {
  id: number
  saleId: number
  saleNumber: string
  soldAt: string
  locationName: string | null
  customerName: string | null
  paymentMethod: string | null
  totalAmount: number
  saleStatus: string
  status: string
  requestedByUserId: number
  requestedByName: string | null
  requestedAt: string
  reviewedByUserId: number | null
  reviewedByName: string | null
  reviewedAt: string | null
}

export type SendSaleInvoiceEmailResponse = {
  saleId: number
  saleNumber: string
  recipientEmail: string
  message: string
}

export type SalesFilters = {
  startDate?: string
  endDate?: string
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed with status ${response.status}`)
  }

  return response.json()
}

export async function createSale(payload: CreateSaleRequest): Promise<CreateSaleResponse> {
  const response = await fetch(`${API_BASE_URL}/sales`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(payload),
  })

  return handleResponse<CreateSaleResponse>(response)
}

export async function getSales(filters?: SalesFilters): Promise<SaleResponse[]> {
  const params = new URLSearchParams()
  if (filters?.startDate) {
    params.set("startDate", filters.startDate)
  }
  if (filters?.endDate) {
    params.set("endDate", filters.endDate)
  }

  const queryString = params.toString()
  const url = queryString ? `${API_BASE_URL}/sales?${queryString}` : `${API_BASE_URL}/sales`

  const response = await fetch(url, {
    method: "GET",
    headers: {
      ...(localStorage.getItem(TOKEN_KEY)
        ? { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` }
        : {}),
    },
  })

  return handleResponse<SaleResponse[]>(response)
}

export async function getSaleDetail(saleId: number): Promise<SaleDetailResponse> {
  const response = await fetch(`${API_BASE_URL}/sales/${saleId}`, {
    method: "GET",
    headers: {
      ...(localStorage.getItem(TOKEN_KEY)
        ? { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` }
        : {}),
    },
  })

  return handleResponse<SaleDetailResponse>(response)
}

export async function cancelSale(saleId: number): Promise<SaleResponse> {
  const response = await fetch(`${API_BASE_URL}/sales/${saleId}/cancel`, {
    method: "POST",
    headers: {
      ...(localStorage.getItem(TOKEN_KEY)
        ? { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` }
        : {}),
    },
  })

  return handleResponse<SaleResponse>(response)
}

export async function requestSaleCancellationApproval(
  saleId: number
): Promise<SaleCancellationRequestResponse> {
  const response = await fetch(`${API_BASE_URL}/sales/${saleId}/cancellation-request`, {
    method: "POST",
    headers: {
      ...(localStorage.getItem(TOKEN_KEY)
        ? { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` }
        : {}),
    },
  })

  return handleResponse<SaleCancellationRequestResponse>(response)
}

export async function getPendingSaleCancellationRequests(): Promise<SaleCancellationRequestResponse[]> {
  const response = await fetch(`${API_BASE_URL}/sales/cancellation-requests`, {
    method: "GET",
    headers: {
      ...(localStorage.getItem(TOKEN_KEY)
        ? { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` }
        : {}),
    },
  })

  return handleResponse<SaleCancellationRequestResponse[]>(response)
}

export async function approveSaleCancellationRequest(
  requestId: number
): Promise<SaleCancellationRequestResponse> {
  const response = await fetch(`${API_BASE_URL}/sales/cancellation-requests/${requestId}/approve`, {
    method: "POST",
    headers: {
      ...(localStorage.getItem(TOKEN_KEY)
        ? { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` }
        : {}),
    },
  })

  return handleResponse<SaleCancellationRequestResponse>(response)
}

export async function rejectSaleCancellationRequest(
  requestId: number
): Promise<SaleCancellationRequestResponse> {
  const response = await fetch(`${API_BASE_URL}/sales/cancellation-requests/${requestId}/reject`, {
    method: "POST",
    headers: {
      ...(localStorage.getItem(TOKEN_KEY)
        ? { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` }
        : {}),
    },
  })

  return handleResponse<SaleCancellationRequestResponse>(response)
}

export async function sendSaleInvoiceEmail(saleId: number): Promise<SendSaleInvoiceEmailResponse> {
  const response = await fetch(`${API_BASE_URL}/sales/${saleId}/send-invoice-email`, {
    method: "POST",
    headers: {
      ...(localStorage.getItem(TOKEN_KEY)
        ? { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` }
        : {}),
    },
  })

  return handleResponse<SendSaleInvoiceEmailResponse>(response)
}
