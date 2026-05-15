import { apiGet, apiPatch, apiPost } from "./client"
import type { CompanyLocationResponse } from "./companyLocationsApi"

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
  locationRestricted: boolean
  locations: CompanyLocationResponse[]
}

export type CreateCompanyUserRequest = {
  firstName: string
  lastName: string
  email: string
  password: string
  role: "ADMIN" | "CASHIER"
  feeConsentAccepted: boolean
  locationIds: number[]
}

export function getCompanyUsers() {
  return apiGet<CompanyUserResponse[]>("/company/users")
}

export function createCompanyUser(payload: CreateCompanyUserRequest) {
  return apiPost<CompanyUserResponse, CreateCompanyUserRequest>("/company/users", payload)
}

export function setCompanyUserActive(userId: number, active: boolean) {
  return apiPatch<CompanyUserResponse, { active: boolean }>(`/company/users/${userId}/status`, { active })
}
