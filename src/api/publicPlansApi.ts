import { API_BASE_URL } from "./config"

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Request failed with status ${response.status}`)
    }

    return response.json()
}

export type PublicPlanResponse = {
    id: number
    code: string
    name: string
    description?: string | null
    monthlyPrice: number | null
    yearlyPrice: number | null
    displayOrder?: number | null
}

export async function getPublicPlans(): Promise<PublicPlanResponse[]> {
    const response = await fetch(`${API_BASE_URL}/public/plans`, {
        method: "GET",
    })

    return handleResponse<PublicPlanResponse[]>(response)
}
