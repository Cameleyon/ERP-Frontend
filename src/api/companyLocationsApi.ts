import { apiGet, apiPost } from "./client"

export type CompanyLocationResponse = {
  id: number
  companyId: number
  name: string
  businessType: string | null
  phone: string | null
  email: string | null
  address: string | null
  addressLine1: string | null
  city: string | null
  postalCode: string | null
  country: string | null
  timeZoneId: string | null
  primaryLocation: boolean
  active: boolean
  createdByUserId: number | null
  feeConsentAccepted: boolean
  feeConsentAcceptedAt: string | null
  feeAmountUsd: string | null
}

export type CreateCompanyLocationRequest = {
  name: string
  businessType?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  addressLine1?: string | null
  city?: string | null
  postalCode?: string | null
  country?: string | null
  timeZoneId?: string | null
  feeConsentAccepted: boolean
}

export function getAccessibleCompanyLocations() {
  return apiGet<CompanyLocationResponse[]>("/company/locations")
}

export function getAllCompanyLocations() {
  return apiGet<CompanyLocationResponse[]>("/company/locations/all")
}

export function createCompanyLocation(payload: CreateCompanyLocationRequest) {
  return apiPost<CompanyLocationResponse, CreateCompanyLocationRequest>("/company/locations", payload)
}
