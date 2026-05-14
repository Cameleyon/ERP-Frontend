import type { AuthenticatedUserResponse } from "../auth/authApi"
import { apiPost } from "./client"

export async function acceptCompanyTerms(): Promise<AuthenticatedUserResponse> {
  return apiPost<AuthenticatedUserResponse>("/company/terms/accept")
}
