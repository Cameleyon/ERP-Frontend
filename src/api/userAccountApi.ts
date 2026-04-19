import type { LoginResponse } from "../auth/authApi"
import { apiPost, apiPut } from "./client"

export type ChangePasswordRequest = {
  currentPassword: string
  newPassword: string
}

export type UpdateUserProfileRequest = {
  firstName: string
  lastName: string
  email: string
  currentPassword?: string
}

export async function changePassword(payload: ChangePasswordRequest): Promise<void> {
  return apiPost<void, ChangePasswordRequest>("/auth/change-password", payload)
}

export async function updateUserProfile(payload: UpdateUserProfileRequest): Promise<LoginResponse> {
  return apiPut<LoginResponse, UpdateUserProfileRequest>("/auth/profile", payload)
}
