const API_BASE_URL = "http://localhost:8080/api"
const TOKEN_KEY = "camelyon_token"

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Request failed with status ${response.status}`)
    }

    return response.json()
}

export type UnitResponse = {
    id: number
    code: string
    name: string
    system: boolean
}

export async function getUnits(): Promise<UnitResponse[]> {
    const response = await fetch(`${API_BASE_URL}/units`, {
        method: "GET",
        headers: {
            ...(localStorage.getItem(TOKEN_KEY)
                ? { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` }
                : {}),
        },
    })

    return handleResponse<UnitResponse[]>(response)
}