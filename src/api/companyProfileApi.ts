import { apiGet, apiPut } from "./client"

export type CompanyProfileResponse = {
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
    currencyCode: string
    active: boolean
    sidebarColor: string | null
    primaryColor: string | null
    logoUrl: string | null
}

export type UpdateCompanyProfileRequest = {
    name: string
    businessType: string
    phone: string
    email: string
    address: string
    addressLine1: string
    city: string
    postalCode: string
    country: string
    timeZoneId: string
    currencyCode: string
}

export async function getCompanyProfile(): Promise<CompanyProfileResponse> {
    return apiGet<CompanyProfileResponse>("/company/profile")
}

export async function updateCompanyProfile(
    payload: UpdateCompanyProfileRequest
): Promise<CompanyProfileResponse> {
    return apiPut<CompanyProfileResponse, UpdateCompanyProfileRequest>("/company/profile", payload)
}
