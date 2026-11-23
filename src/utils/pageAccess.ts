import type { Page } from "../types/navigation.ts"

export function accessiblePage(role: string | undefined, page: Page): Page {
  return role === "ADMIN" || page === "new-sale" || page === "sales-history" ? page : "new-sale"
}
