import { useEffect, useState } from "react"
import { useI18n } from "../i18n/I18nContext"
import {
  getLowStockProducts,
  getSalesTrend,
  getSummary,
  getTopProducts,
  type DashboardSummaryResponse,
  type LowStockProductResponse,
  type SalesTrendPointResponse,
  type TopProductResponse,
} from "../api/dashboardApi"
import SummaryCard from "../components/dashboard/SummaryCard"
import SalesTrendChart from "../components/dashboard/SalesTrendChart"
import TopProductsTable from "../components/dashboard/TopProductsTable"
import LowStockTable from "../components/dashboard/LowStockTable"
import DashboardFilters from "../components/dashboard/DashboardFilters"
import { formatCurrency, formatNumber } from "../utils/format"

type Preset = "today" | "this-week" | "this-month" | "custom"

function toIsoDate(date: Date) {
  return date.toISOString().split("T")[0]
}

function getDateRangeFromPreset(preset: Preset) {
  const today = new Date()
  const end = new Date(today)
  const start = new Date(today)

  if (preset === "today") {
    return {
      startDate: toIsoDate(start),
      endDate: toIsoDate(end),
    }
  }

  if (preset === "this-week") {
    const day = start.getDay()
    const diff = day === 0 ? 6 : day - 1
    start.setDate(start.getDate() - diff)

    return {
      startDate: toIsoDate(start),
      endDate: toIsoDate(end),
    }
  }

  start.setDate(1)
  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
  }
}

export default function DashboardPage() {
  const { copy } = useI18n()
  const text = copy.dashboardPage
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null)
  const [trend, setTrend] = useState<SalesTrendPointResponse[]>([])
  const [topProducts, setTopProducts] = useState<TopProductResponse[]>([])
  const [lowStock, setLowStock] = useState<LowStockProductResponse[]>([])

  const [preset, setPreset] = useState<Preset>("this-month")
  const [startDate, setStartDate] = useState(getDateRangeFromPreset("this-month").startDate)
  const [endDate, setEndDate] = useState(getDateRangeFromPreset("this-month").endDate)

  async function loadDashboard(rangeStart: string, rangeEnd: string) {
    try {
      setLoading(true)
      setError("")

      const [summaryData, trendData, topProductsData, lowStockData] =
        await Promise.all([
          getSummary(rangeStart, rangeEnd),
          getSalesTrend(rangeStart, rangeEnd),
          getTopProducts(rangeStart, rangeEnd, 5),
          getLowStockProducts(),
        ])

      setSummary(summaryData)
      setTrend(trendData)
      setTopProducts(topProductsData)
      setLowStock(lowStockData)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.unknownError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const range = getDateRangeFromPreset("this-month")
    void loadDashboard(range.startDate, range.endDate)
  }, [])

  function handlePresetChange(nextPreset: Preset) {
    setPreset(nextPreset)

    if (nextPreset !== "custom") {
      const range = getDateRangeFromPreset(nextPreset)
      setStartDate(range.startDate)
      setEndDate(range.endDate)
    }
  }

  function handleApply() {
    if (!startDate || !endDate) {
      setError(text.startDateRequired)
      return
    }

    if (endDate < startDate) {
      setError(text.invalidRange)
      return
    }

    void loadDashboard(startDate, endDate)
  }

  if (loading) return <div>{text.loading}</div>
  if (error) {
    return (
      <div>
        <h1>{text.title}</h1>
        <DashboardFilters
          preset={preset}
          startDate={startDate}
          endDate={endDate}
          onPresetChange={handlePresetChange}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onApply={handleApply}
        />
        <div className="card error">{error}</div>
      </div>
    )
  }

  return (
    <div>
      <h1>{text.title}</h1>

      <DashboardFilters
        preset={preset}
        startDate={startDate}
        endDate={endDate}
        onPresetChange={handlePresetChange}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onApply={handleApply}
      />

      {summary && (
        <div className="summary-grid">
          <SummaryCard title={text.totalSales} value={formatCurrency(summary.totalSales)} />
          <SummaryCard title={text.totalTax} value={formatCurrency(summary.totalTax)} />
          <SummaryCard title={text.totalCost} value={formatCurrency(summary.totalCost)} />
          <SummaryCard title={text.totalProfit} value={formatCurrency(summary.totalProfit)} />
          <SummaryCard title={text.transactions} value={formatNumber(summary.totalTransactions)} />
          <SummaryCard title={text.lowStock} value={formatNumber(summary.lowStockProducts)} />
          <SummaryCard title={text.outOfStock} value={formatNumber(summary.outOfStockProducts)} />
        </div>
      )}

      <div className="dashboard-section">
        <SalesTrendChart rows={trend} />
      </div>

      <div className="dashboard-bottom-grid">
        <TopProductsTable rows={topProducts} />
        <LowStockTable rows={lowStock} />
      </div>
    </div>
  )
}
