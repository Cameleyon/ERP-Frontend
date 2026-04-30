import { apiGet } from "./client"

export type ProductLookupResponse = {
  id: number
  sku: string
  barcode: string | null
  name: string
  description: string
  category: string
  unitPrice: number
  costPrice: number | null
  currentStock: number
  minimumStock: number
  active: boolean
  unitId: number | null
  unitCode: string | null
  unitName: string | null
  priceTiers: ProductPriceTier[]
}

export type ProductPriceTier = {
  id?: number
  label: string | null
  minQuantity: number
  unitPrice: number
}

export function getProductByCode(code: string) {
  return apiGet<ProductLookupResponse>(`/products/barcode/${encodeURIComponent(code)}`)
}
