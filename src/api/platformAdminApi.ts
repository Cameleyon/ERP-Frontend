import { apiGet, apiPost } from "./client"

export type SubscriptionPlanResponse = {
  id: number
  code: string
  name: string
  description: string | null
  monthlyPrice: number | null
  yearlyPrice: number | null
  active: boolean
  publicVisible: boolean
  displayOrder: number | null
}

export type CreateSubscriptionPlanRequest = {
  code: string
  name: string
  description?: string
  monthlyPrice?: number
  yearlyPrice?: number
  active: boolean
  publicVisible: boolean
  displayOrder?: number
}

export type ManagedCompanyResponse = {
  companyId: number
  companyName: string
  adminUserId: number
  adminEmail: string
  planCode: string
  subscriptionStatus: string
  accessStartAt: string
  accessEndAt: string
}

export type CreateManagedCompanyRequest = {
  name: string
  businessType?: string
  phone?: string
  email?: string
  address?: string
  currencyCode?: string
  admin: {
    firstName: string
    lastName: string
    email: string
    password: string
  }
  subscription: {
    planCode: string
    billingMode: "AUTOMATIC_CARD" | "MANUAL"
    billingCycle: "MONTHLY" | "YEARLY"
    paymentCollectionMethod: "CARD" | "INVOICE" | "BANK_TRANSFER" | "CASH" | "OTHER"
    paymentProvider: "STRIPE" | "NONE"
    accessStartAt: string
    accessEndAt: string
    autoRenew: boolean
    requiresPaymentMethod: boolean
    notes?: string
  }
}

export type CompanySubscriptionResponse = {
  companyId: number
  companyName: string
  planCode: string
  planName: string
  status: string
  billingMode: string
  billingCycle: string
  paymentCollectionMethod: string
  paymentProvider: string
  accessStartAt: string | null
  accessEndAt: string | null
  billingStartAt: string | null
  currentPeriodStartAt: string | null
  currentPeriodEndAt: string | null
  gracePeriodEndAt: string | null
  autoRenew: boolean | null
  requiresPaymentMethod: boolean | null
  notes: string | null
}

export type ExtendAccessRequest = {
  days: number
  reason?: string
}

export type SubscriptionActionRequest = {
  reason?: string
}

export type CompanyUserResponse = {
  id: number
  companyId: number
  firstName: string
  lastName: string
  email: string
  role: "ADMIN" | "CASHIER" | string
  active: boolean
}

export type CreateCompanyUserRequest = {
  firstName: string
  lastName: string
  email: string
  password: string
  role: "ADMIN" | "CASHIER"
}

export function getSubscriptionPlans() {
  return apiGet<SubscriptionPlanResponse[]>("/admin/subscription-plans")
}

export function createSubscriptionPlan(payload: CreateSubscriptionPlanRequest) {
  return apiPost<SubscriptionPlanResponse, CreateSubscriptionPlanRequest>(
    "/admin/subscription-plans",
    payload
  )
}

export function createManagedCompany(payload: CreateManagedCompanyRequest) {
  return apiPost<ManagedCompanyResponse, CreateManagedCompanyRequest>("/admin/companies", payload)
}

export function getCompanySubscription(companyId: number) {
  return apiGet<CompanySubscriptionResponse>(`/admin/companies/${companyId}/subscription`)
}

export function searchCompanySubscriptions(search?: string) {
  const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""
  return apiGet<CompanySubscriptionResponse[]>(`/admin/companies/subscriptions${query}`)
}

export function extendCompanyAccess(companyId: number, payload: ExtendAccessRequest) {
  return apiPost<CompanySubscriptionResponse, ExtendAccessRequest>(
    `/admin/companies/${companyId}/extend-access`,
    payload
  )
}

export function suspendCompanySubscription(
  companyId: number,
  payload?: SubscriptionActionRequest
) {
  return apiPost<CompanySubscriptionResponse, SubscriptionActionRequest | undefined>(
    `/admin/companies/${companyId}/suspend`,
    payload
  )
}

export function unsuspendCompanySubscription(
  companyId: number,
  payload?: SubscriptionActionRequest
) {
  return apiPost<CompanySubscriptionResponse, SubscriptionActionRequest | undefined>(
    `/admin/companies/${companyId}/unsuspend`,
    payload
  )
}

export function getCompanyUsers(companyId: number) {
  return apiGet<CompanyUserResponse[]>(`/admin/companies/${companyId}/users`)
}

export function createCompanyUser(companyId: number, payload: CreateCompanyUserRequest) {
  return apiPost<CompanyUserResponse, CreateCompanyUserRequest>(
    `/admin/companies/${companyId}/users`,
    payload
  )
}

export function activateCompanyUser(userId: number) {
  return apiPost<CompanyUserResponse, undefined>(`/admin/users/${userId}/activate`)
}

export function deactivateCompanyUser(userId: number) {
  return apiPost<CompanyUserResponse, undefined>(`/admin/users/${userId}/deactivate`)
}
