import { apiGet } from "./client"

const API_BASE_URL = "http://localhost:8080/api"
const TOKEN_KEY = "camelyon_token"

export type CompanyCostRubricResponse = {
  id: number
  code: string
  name: string
  active: boolean
  displayOrder: number
}

export async function getCostRubrics(): Promise<CompanyCostRubricResponse[]> {
  return apiGet<CompanyCostRubricResponse[]>("/cost-rubrics")
}

export async function createCostRubric(payload: {
  code: string
  name: string
  displayOrder?: number
}): Promise<CompanyCostRubricResponse> {
  const token = localStorage.getItem(TOKEN_KEY)

  const response = await fetch(`${API_BASE_URL}/cost-rubrics`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed with status ${response.status}`)
  }

  return response.json()
}