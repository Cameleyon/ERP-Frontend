import { API_BASE_URL } from "./config"

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Request failed with status ${response.status}`)
    }

    return response.json()
}

export type PublicPromotionResponse = {
    id: number
    name: string
    description: string | null
    nameFr: string | null
    nameEn: string | null
    descriptionFr: string | null
    descriptionEn: string | null
    targetType: string
    promoDurationDays: number | null
    promoPriceMonthly: number | null
    promoPriceYearly: number | null
    freeTrialDays: number | null
    startsAt: string | null
    endsAt: string | null
}

export async function getPublicPromotions(): Promise<PublicPromotionResponse[]> {
    const response = await fetch(`${API_BASE_URL}/public/promotions`, {
        method: "GET",
    })

    return handleResponse<PublicPromotionResponse[]>(response)
}
