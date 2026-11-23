import { apiDelete, apiGet, apiPost, apiPut } from "./client"
import type { SaleResponse } from "./salesApi"

export type CustomerResponse = {
  id: number
  name: string
  phone: string | null
  email: string | null
  emailOptIn: boolean
  optInUpdatedAt: string | null
}

export type CustomerPayload = {
  name: string
  phone: string
  email: string
  emailOptIn: boolean
}

export function getCustomers() {
  return apiGet<CustomerResponse[]>("/customers")
}

export function createCustomer(payload: CustomerPayload) {
  return apiPost<CustomerResponse, CustomerPayload>("/customers", payload)
}

export function updateCustomer(customerId: number, payload: CustomerPayload) {
  return apiPut<CustomerResponse, CustomerPayload>(`/customers/${customerId}`, payload)
}

export function deleteCustomer(customerId: number) {
  return apiDelete<void>(`/customers/${customerId}`)
}

export function getCustomerPurchases(customerId: number, page = 0) {
  return apiGet<{ items: SaleResponse[]; total: number; page: number; size: number }>(`/sales/customer/${customerId}?page=${page}&size=20`)
}
