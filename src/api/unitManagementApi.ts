const API_BASE_URL = "http://localhost:8080/api"
const TOKEN_KEY = "camelyon_token"

function buildAuthHeaders() {
    const token = localStorage.getItem(TOKEN_KEY)

    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
}

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

export type CreateUnitRequest = {
    code: string
    name: string
}

export type UpdateUnitRequest = {
    code: string
    name: string
}

export async function updateUnit(
    unitId: number,
    payload: UpdateUnitRequest
): Promise<UnitResponse> {
    const response = await fetch(`${API_BASE_URL}/units/${unitId}`, {
        method: "PUT",
        headers: buildAuthHeaders(),
        body: JSON.stringify(payload),
    })

    return handleResponse<UnitResponse>(response)
}

export async function deleteUnit(unitId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/units/${unitId}`, {
        method: "DELETE",
        headers: buildAuthHeaders(),
    })

    if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Request failed with status ${response.status}`)
    }
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

export async function createUnit(payload: CreateUnitRequest): Promise<UnitResponse> {
    const response = await fetch(`${API_BASE_URL}/units`, {
        method: "POST",
        headers: buildAuthHeaders(),
        body: JSON.stringify(payload),
    })

    return handleResponse<UnitResponse>(response)
}