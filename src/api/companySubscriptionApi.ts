import { apiGet } from "./client"

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
    accessStartAt: string
    accessEndAt: string
    billingStartAt: string | null
    currentPeriodStartAt: string | null
    currentPeriodEndAt: string | null
    gracePeriodEndAt: string | null
    autoRenew: boolean
    requiresPaymentMethod: boolean
    notes: string | null
}

export async function getCompanySubscription(): Promise<CompanySubscriptionResponse> {
    return apiGet<CompanySubscriptionResponse>("/company/subscription")
}
