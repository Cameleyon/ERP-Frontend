import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useI18n } from "../i18n/I18nContext"
import { useAuth } from "../auth/AuthContext"
import type { AuthenticatedUserResponse } from "../auth/authApi"
import ErrorMessage from "../components/common/ErrorMessage"
import {
  getLowStockProducts, getSalesTrend, getSummary, getTopProducts,
  type DashboardSummaryResponse, type LowStockProductResponse, type SalesTrendPointResponse, type TopProductResponse,
} from "../api/dashboardApi"
import { getAccessibleCompanyLocations, type CompanyLocationResponse } from "../api/companyLocationsApi"
import SummaryCard from "../components/dashboard/SummaryCard"
import SalesTrendChart from "../components/dashboard/SalesTrendChart"
import TopProductsTable from "../components/dashboard/TopProductsTable"
import LowStockTable from "../components/dashboard/LowStockTable"
import DashboardFilters from "../components/dashboard/DashboardFilters"
import SetupGuide from "../components/dashboard/SetupGuide"
import DashboardEmptyState from "../components/dashboard/DashboardEmptyState"
import TrialReminder from "../components/layout/TrialReminder"
import { internalCopy } from "../i18n/internalCopy"
import "../components/layout/internalTokens.css"
import "../components/dashboard/internalDashboard.css"
import type { SetupAction } from "../utils/setupGuide"
import { useDashboardForecast } from "../components/dashboard/useDashboardForecast"
import { forecastCopy } from "../components/dashboard/forecastCopy"
import { formatCurrency, formatNumber } from "../utils/format"
import { DEFAULT_COMPANY_TIME_ZONE, isValidTimeZone } from "../utils/companyLocalization"
import {
  companyToday, currentWeek, forecastView, kpiForecastPeriod, kpiForecastValue, mergeTrend, overlaps, presetRange,
  type DashboardPreset, type DateRange, type ForecastNotice, type ForecastView,
} from "../utils/dashboardForecast"

const noticePriority: ForecastNotice[] = ["unavailable", "aggregate", "data", "noSales", "history", "pending", "limited"]

type DashboardActions = {
  onSetupAction?: (action: SetupAction) => void
  onSiteChange?: (id?: number) => void
  onNewSale?: (siteId?: number) => void
}

export default function DashboardPage(actions: DashboardActions = {}) {
  const { user, token } = useAuth()
  if (!user || !token) return null
  return <DashboardContent key={`${token}|${user.companyId}|${user.companyTimeZoneId}|${user.companyCurrencyCode}`}
    user={user} token={token} {...actions} />
}

function DashboardContent({ user, token, onSetupAction, onSiteChange, onNewSale }: DashboardActions & {
  user: AuthenticatedUserResponse; token: string
}) {
  const { copy, language } = useI18n()
  const text = copy.dashboardPage, forecastText = forecastCopy[language]
  const labels = internalCopy[language]
  const configuredZone = user.companyTimeZoneId || DEFAULT_COMPANY_TIME_ZONE
  const zoneValid = isValidTimeZone(configuredZone)
  const zone = zoneValid ? configuredZone : DEFAULT_COMPANY_TIME_ZONE
  const currency = user.companyCurrencyCode && /^[A-Z]{3}$/.test(user.companyCurrencyCode) ? user.companyCurrencyCode : null
  const [clock, setClock] = useState(() => new Date())
  const today = companyToday(zone, clock)
  const week = currentWeek(today)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null)
  const [trend, setTrend] = useState<SalesTrendPointResponse[]>([])
  const [topProducts, setTopProducts] = useState<TopProductResponse[]>([])
  const [topProfitProducts, setTopProfitProducts] = useState<TopProductResponse[]>([])
  const [lowestSalesProducts, setLowestSalesProducts] = useState<TopProductResponse[]>([])
  const [lowestProfitProducts, setLowestProfitProducts] = useState<TopProductResponse[]>([])
  const [lowStock, setLowStock] = useState<LowStockProductResponse[]>([])
  const [locations, setLocations] = useState<CompanyLocationResponse[]>([])
  const [locationId, setLocationId] = useState("")
  const [preset, setPreset] = useState<DashboardPreset>("this-month")
  const [startDate, setStartDate] = useState(() => presetRange("this-month", today).startDate)
  const [endDate, setEndDate] = useState(today)
  const [applied, setApplied] = useState<DateRange>(() => presetRange("this-month", today))
  const [appliedPeriod, setAppliedPeriod] = useState<DashboardPreset>("this-month")
  const appliedPreset = useRef<DashboardPreset>("this-month")
  const selectedLocation = useRef("")
  const requestId = useRef(0)

  const loadDashboard = useCallback(async (range: DateRange, site: string) => {
    const request = ++requestId.current
    setLoading(true); setError(""); setApplied(range)
    const location = site ? Number(site) : null
    try {
      const [sites, totals, points, bestSales, bestProfit, leastSales, leastProfit, stock] = await Promise.all([
        getAccessibleCompanyLocations(), getSummary(range.startDate, range.endDate, location),
        getSalesTrend(range.startDate, range.endDate, location),
        getTopProducts(range.startDate, range.endDate, 5, location),
        getTopProducts(range.startDate, range.endDate, 5, location, "PROFIT"),
        getTopProducts(range.startDate, range.endDate, 5, location, "LOWEST_SALES"),
        getTopProducts(range.startDate, range.endDate, 5, location, "LOWEST_PROFIT"), getLowStockProducts(location),
      ])
      if (request !== requestId.current) return
      setLocations(sites); setSummary(totals); setTrend(points); setTopProducts(bestSales); setTopProfitProducts(bestProfit)
      setLowestSalesProducts(leastSales); setLowestProfitProducts(leastProfit); setLowStock(stock)
    } catch (failure) {
      if (request !== requestId.current) return
      setSummary(null); setTrend([]); setTopProducts([]); setTopProfitProducts([]); setLowestSalesProducts([]); setLowestProfitProducts([]); setLowStock([])
      setError(failure instanceof Error ? failure.message : "__unknown")
    } finally { if (request === requestId.current) setLoading(false) }
  }, [])

  useEffect(() => {
    const sequence = requestId
    const tick = () => setClock(new Date())
    const timer = window.setInterval(tick, 30_000)
    window.addEventListener("focus", tick)
    return () => { window.clearInterval(timer); window.removeEventListener("focus", tick); sequence.current++ }
  }, [])
  useEffect(() => {
    if (appliedPreset.current === "custom") return
    const range = presetRange(appliedPreset.current, today)
    void loadDashboard(range, selectedLocation.current)
    setStartDate(range.startDate); setEndDate(range.endDate)
  }, [today, loadDashboard])

  const selectedSite = locationId ? Number(locationId) : null
  const expectedIds = useMemo(() => locations.filter(site => site.active && (selectedSite === null || site.id === selectedSite))
    .map(site => site.id).sort((a, b) => a - b), [locations, selectedSite])
  const scope = `${expectedIds.join(",")}|${selectedSite ?? "all"}|${week.startDate}|${zone}|${currency}`
  const relevant = overlaps(applied, week)
  const enabled = user.role === "ADMIN" && !!user.companyId && zoneValid && !!currency && relevant && !loading && !!summary && expectedIds.length > 0
  const forecast = useDashboardForecast(`${token}|${user.id}|${user.companyId}`, scope, enabled, selectedSite)
  const view = useMemo<ForecastView | null>(() => {
    if (!forecast.data || !enabled) return null
    try { return forecastView(forecast.data, { week: currentWeek(today), zone, currency,
      siteIds: expectedIds, selectedSite }) }
    catch { return { sales: null, profit: null, notices: ["unavailable"] } }
  }, [forecast.data, enabled, today, zone, currency, expectedIds, selectedSite])
  const rows = useMemo(() => mergeTrend(trend, view, applied, today), [trend, view, applied, today])
  const period = kpiForecastPeriod(applied, today, appliedPeriod)
  function secondary(metric: "sales" | "profit") {
    const target = view?.[metric] ?? null
    const value = kpiForecastValue(target, period, today)
    return value === null || !period || !currency ? undefined : {
      label: forecastText[period], value: formatCurrency(value, currency, language), metric,
      provisional: target?.provisional ? forecastText.provisional : undefined, explanation: forecastText.limited,
    }
  }
  const noticeKey = noticePriority.find(key => view?.notices.includes(key))
  const notice = forecast.failed ? forecastText.unavailable : noticeKey ? forecastText[noticeKey] : undefined

  function handlePresetChange(next: DashboardPreset) {
    setPreset(next)
    if (next !== "custom") { const range = presetRange(next, today); setStartDate(range.startDate); setEndDate(range.endDate) }
  }
  function handleApply() {
    if (!startDate || !endDate) { setError(text.startDateRequired); return }
    if (endDate < startDate) { setError(text.invalidRange); return }
    appliedPreset.current = preset
    setAppliedPeriod(preset)
    void loadDashboard({ startDate, endDate }, locationId)
  }
  function changeSite(site: string) {
    selectedLocation.current = site; setLocationId(site)
    void loadDashboard(applied, site)
    onSiteChange?.(Number(site) || undefined)
  }
  const money = (value: number) => formatCurrency(value, currency || "USD", language)
  const siteLabel = locations.find(site => site.id === selectedSite)?.name ?? copy.dashboardFilters.allLocations
  const rangeLabel = new Intl.DateTimeFormat(language, { timeZone: "UTC", dateStyle: "medium" }).formatRange(
    new Date(`${applied.startDate}T12:00:00Z`), new Date(`${applied.endDate}T12:00:00Z`),
  )
  const hasRankings = [topProducts, topProfitProducts, lowestSalesProducts, lowestProfitProducts].some(items => items.length > 0)
  return <div className="internal-dashboard">
    {error && <ErrorMessage message={error === "__unknown" ? text.unknownError : error} onDismiss={() => setError("")} />}
    <div className="dashboard-heading">
      <div>
        <h1>{text.title}</h1>
        <p>{[user.companyName, siteLabel, rangeLabel].filter(Boolean).join(" · ")}</p>
      </div>
      <div className="dashboard-heading-actions">
        <TrialReminder />
        {onNewSale && user.role === "ADMIN" && <button className="workspace-primary" type="button" onClick={() => onNewSale(selectedSite ?? undefined)}>
          <span aria-hidden="true">+ </span>{copy.sidebar.newSale}
        </button>}
      </div>
    </div>
    {onSetupAction && user.role === "ADMIN" && user.companyOwner && user.companyId &&
      <SetupGuide key={`${user.companyId}:${user.id}`} ownerKey={`${user.companyId}:${user.id}`}
        sites={locations} siteId={Number(locationId) || undefined} onAction={onSetupAction} />}
    <DashboardFilters preset={preset} appliedPreset={appliedPeriod} startDate={startDate} endDate={endDate}
      locations={locations} locationId={locationId} siteLabel={siteLabel} onLocationChange={changeSite} onPresetChange={handlePresetChange}
      onStartDateChange={date => { setStartDate(date); setPreset("custom") }}
      onEndDateChange={date => { setEndDate(date); setPreset("custom") }} onApply={handleApply} />
    {loading ? <div className="workspace-panel dashboard-loading" role="status">{text.loading}</div> : summary && <>
      <div className="summary-grid">
        <div className="dashboard-primary-kpis">
          <SummaryCard title={text.totalSales} value={money(summary.totalSales)} forecast={secondary("sales")} />
          <SummaryCard title={text.totalCost} value={money(summary.totalCost)} description={labels.costOfGoods} />
          <SummaryCard title={text.totalProfit} value={money(summary.totalProfit)} forecast={secondary("profit")} featured />
        </div>
        <div className="dashboard-secondary-kpis">
          <SummaryCard title={text.totalTax} value={money(summary.totalTax)} />
          <SummaryCard title={text.transactions} value={formatNumber(summary.totalTransactions)} />
          <SummaryCard title={text.lowStock} value={formatNumber(summary.lowStockProducts)} />
          <SummaryCard title={text.outOfStock} value={formatNumber(summary.outOfStockProducts)} />
        </div>
      </div>
      <div className="dashboard-section">
        <SalesTrendChart key={`${scope}|${applied.startDate}|${applied.endDate}`} rows={rows} currency={currency || "USD"}
          notice={notice} loading={forecast.loading} context={currency ? `${rangeLabel} · ${currency}` : rangeLabel}
          noSales={summary.totalTransactions === 0} />
      </div>
      {hasRankings ? <div className="dashboard-bottom-grid">
        <TopProductsTable rows={topProducts} profitRows={topProfitProducts} currency={currency || "USD"} />
        <TopProductsTable rows={lowestSalesProducts} profitRows={lowestProfitProducts} currency={currency || "USD"} lowest />
      </div> : <section className="workspace-panel"><DashboardEmptyState title={labels.noRankings} description={labels.noRankingsDetail} /></section>}
      <div className="dashboard-section"><LowStockTable rows={lowStock} /></div>
    </>}
  </div>
}
