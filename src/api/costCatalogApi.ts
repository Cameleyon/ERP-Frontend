import { apiGet, apiPost } from "./client"
import type { CompanyCostRubricResponse } from "./costRubricManagementApi"

export type CostCatalogEntry = {
  code: string
  category: "PURCHASE" | "LOGISTICS" | "PREPARATION" | "CONDITIONAL"
  defaultSelected: boolean
  names: Record<"en" | "fr" | "es", string>
  descriptions: Record<"en" | "fr" | "es", string>
  treatment: "INCLUDE" | "CONDITIONAL" | "DEDUCT"
}

export function getCostCatalog() { return apiGet<CostCatalogEntry[]>("/cost-rubrics/catalog") }
export function selectCostRubrics(codes: string[], rubricIds: number[]) {
  return apiPost<CompanyCostRubricResponse[], { codes: string[]; rubricIds: number[] }>(
    "/cost-rubrics/selection", { codes, rubricIds })
}
