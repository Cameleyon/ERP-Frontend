import { apiGet, apiPost } from "./client"

export type CompanyUserResponse = {
  id: number
  companyId: number
  firstName: string
  lastName: string
  email: string
  role: "ADMIN" | "CASHIER" | string
  active: boolean
  createdByUserId: number | null
  feeConsentAccepted: boolean
  feeConsentAcceptedAt: string | null
  feeAmountUsd: string | null
}

export type CreateCompanyUserRequest = {
  firstName: string
  lastName: string
  email: string
  password: string
  role: "ADMIN" | "CASHIER"
  feeConsentAccepted: boolean
}

export function getCompanyUsers() {
  return apiGet<CompanyUserResponse[]>("/company/users")
}

export function createCompanyUser(payload: CreateCompanyUserRequest) {
  return apiPost<CompanyUserResponse, CreateCompanyUserRequest>("/company/users", payload)
}
