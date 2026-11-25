import { apiGet } from "./client"

export type ProductQuantityType = "INTEGER" | "DECIMAL"

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
  unitName: string | null
  quantityType?: ProductQuantityType
  priceTiers: ProductPriceTier[]
}

export type ProductPriceTier = {
  id?: number
  label: string | null
  minQuantity: number
  unitPrice: number
}

export function getProductByCode(code: string, locationId?: number | null) {
  const query = locationId ? `?locationId=${locationId}` : ""
  return apiGet<ProductLookupResponse>(`/products/barcode/${encodeURIComponent(code)}${query}`)
}

export function getProductBySku(sku: string, locationId?: number | null) {
  const query = locationId ? `?locationId=${locationId}` : ""
  return apiGet<ProductLookupResponse>(`/products/sku/${encodeURIComponent(sku)}${query}`)
}

export type ProductSuggestion = Pick<ProductLookupResponse, "id" | "name" | "sku" | "barcode" | "active">
export type SalesProduct = ProductSuggestion & Pick<ProductLookupResponse, "unitName" | "quantityType" | "unitPrice" | "priceTiers" | "currentStock">

export function getSalesProductSuggestions(locationId: string) {
  return apiGet<ProductSuggestion[]>(`/sales/product-lookup?locationId=${encodeURIComponent(locationId)}`)
}

export function findSalesProduct(code: string, locationId: string, exactSku: boolean) {
  const lookup = exactSku ? "sku" : "barcode"
  return apiGet<SalesProduct>(`/sales/product-lookup/${lookup}/${encodeURIComponent(code)}?locationId=${encodeURIComponent(locationId)}`)
}
