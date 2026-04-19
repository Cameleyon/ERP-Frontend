import { apiPost } from "./client"

export type ChangePasswordRequest = {
  currentPassword: string
  newPassword: string
}

export async function changePassword(payload: ChangePasswordRequest): Promise<void> {
  return apiPost<void, ChangePasswordRequest>("/auth/change-password", payload)
}
