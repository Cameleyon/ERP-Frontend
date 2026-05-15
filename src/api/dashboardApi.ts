import { apiGet } from "./client"

export type DashboardSummaryResponse = {
  totalSales: number
  totalTax: number
  totalCost: number
  totalProfit: number
  totalTransactions: number
  lowStockProducts: number
  outOfStockProducts: number
}

export type SalesTrendPointResponse = {
  date: string
  totalSales: number
  totalCost: number
  totalProfit: number
  transactionCount: number
}

export type TopProductResponse = {
  productId: number
  productName: string
  sku: string
  totalQuantitySold: number
  totalSalesAmount: number
}

export type LowStockProductResponse = {
  productId: number
  sku: string
  name: string
  currentStock: number
  minimumStock: number
  shortage: number
}

function locationQuery(locationId?: number | null) {
  return locationId ? `&locationId=${locationId}` : ""
}

export function getSummary(startDate: string, endDate: string, locationId?: number | null) {
  return apiGet<DashboardSummaryResponse>(
    `/dashboard/summary?startDate=${startDate}&endDate=${endDate}${locationQuery(locationId)}`
  )
}

export function getSalesTrend(startDate: string, endDate: string, locationId?: number | null) {
  return apiGet<SalesTrendPointResponse[]>(
    `/dashboard/sales-trend?startDate=${startDate}&endDate=${endDate}${locationQuery(locationId)}`
  )
}

export function getTopProducts(startDate: string, endDate: string, limit = 5, locationId?: number | null) {
  return apiGet<TopProductResponse[]>(
    `/dashboard/top-products?startDate=${startDate}&endDate=${endDate}&limit=${limit}${locationQuery(locationId)}`
  )
}

export function getLowStockProducts(locationId?: number | null) {
  return apiGet<LowStockProductResponse[]>(
    `/dashboard/low-stock?${locationId ? `locationId=${locationId}` : ""}`
  )
}
