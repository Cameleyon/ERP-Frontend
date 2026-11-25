export type SetupStatus = {
  hasCurrency: boolean
  hasProduct: boolean
  hasActiveProduct: boolean
  hasRecordedStock: boolean
  hasEverCompletedSale: boolean
  hasAccessibleSite: boolean
  needsInventoryReview: boolean
  openingStockTarget: { productId: number } | null
  saleSiteIds: number[]
}

export type SetupAction =
  | { kind: "currency" | "product" | "products" | "inventory" | "manage" }
  | { kind: "opening"; productId: number; siteId?: number }
  | { kind: "sale"; siteId: number }

export function isSetupStatus(value: unknown): value is SetupStatus {
  if (!value || typeof value !== "object") return false
  const status = value as Partial<SetupStatus>
  const validId = (id: unknown) => typeof id === "number" && Number.isSafeInteger(id) && id > 0
  return [status.hasCurrency, status.hasProduct, status.hasActiveProduct, status.hasRecordedStock,
    status.hasEverCompletedSale, status.hasAccessibleSite, status.needsInventoryReview].every(flag => typeof flag === "boolean")
    && Array.isArray(status.saleSiteIds) && status.saleSiteIds.every(validId)
    && (status.openingStockTarget == null || validId(status.openingStockTarget.productId))
}

export function setupStep(status: SetupStatus, siteId?: number, primaryId?: number): SetupAction | null {
  if (!status.hasCurrency) return { kind: "currency" }
  if (status.hasEverCompletedSale) return null
  if (!status.hasProduct) return { kind: "product" }
  if (!status.hasActiveProduct) return { kind: "products" }
  if (!status.hasAccessibleSite) return { kind: "manage" }
  const saleSite = status.saleSiteIds.find(id => id === siteId) ?? status.saleSiteIds.find(id => id === primaryId)
    ?? status.saleSiteIds[0]
  if (saleSite) return { kind: "sale", siteId: saleSite }
  if (status.hasRecordedStock || status.needsInventoryReview || !status.openingStockTarget) return { kind: "inventory" }
  return { kind: "opening", productId: status.openingStockTarget.productId, siteId }
}

export function preferredSetupSite<T extends { id: number; active: boolean; primaryLocation: boolean }>(
  sites: readonly T[], preferred?: number,
) {
  const active = sites.filter(site => site.active)
  return active.find(site => site.id === preferred) ?? (active.length === 1 ? active[0] : active.find(site => site.primaryLocation))
}
