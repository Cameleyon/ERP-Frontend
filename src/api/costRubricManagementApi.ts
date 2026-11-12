import { API_BASE_URL } from "./config"
import { checkCompanyCurrencyResponse } from "../utils/companyCurrency"

const TOKEN_KEY = "camelyon_token"

export class DuplicateCostRubricNameError extends Error {}

function buildAuthHeaders() {
  const token = localStorage.getItem(TOKEN_KEY)

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  await checkCompanyCurrencyResponse(response)
  if (!response.ok) {
    const error = await response.clone().json().catch(() => null)
    if (response.status === 400 && error?.message === "COST_RUBRIC_NAME_ALREADY_EXISTS") {
      throw new DuplicateCostRubricNameError()
    }
    const text = await response.text()
    throw new Error(error?.message || text || `Request failed with status ${response.status}`)
  }

  return response.json()
}

export type CompanyCostRubricResponse = {
  id: number
  code: string
  name: string
  description?: string | null
  active: boolean
  system: boolean
  displayOrder: number
}

export type CreateCompanyCostRubricRequest = {
  name: string
  description?: string
}

export async function getCostRubrics(): Promise<CompanyCostRubricResponse[]> {
  const response = await fetch(`${API_BASE_URL}/cost-rubrics`, {
    method: "GET",
    headers: {
      ...(localStorage.getItem(TOKEN_KEY)
        ? { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` }
        : {}),
    },
  })

  return handleResponse<CompanyCostRubricResponse[]>(response)
}

export async function updateCostRubricStatus(
    rubricId: number,
    active: boolean
): Promise<CompanyCostRubricResponse> {
  const response = await fetch(`${API_BASE_URL}/cost-rubrics/${rubricId}/active`, {
    method: "PATCH",
    headers: buildAuthHeaders(),
    body: JSON.stringify({ active }),
  })

  return handleResponse<CompanyCostRubricResponse>(response)
}

export async function createCostRubric(
  payload: CreateCompanyCostRubricRequest
): Promise<CompanyCostRubricResponse> {
  const response = await fetch(`${API_BASE_URL}/cost-rubrics`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(payload),
  })

  return handleResponse<CompanyCostRubricResponse>(response)
}

export async function deleteCostRubric(rubricId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/cost-rubrics/${rubricId}`, {
    method: "DELETE",
    headers: buildAuthHeaders(),
  })

  await checkCompanyCurrencyResponse(response)
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed with status ${response.status}`)
  }
}
