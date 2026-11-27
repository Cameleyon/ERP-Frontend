import { useEffect, useMemo, useRef, useState } from "react"
import {
  approveSaleCancellationRequest,
  cancelSale,
  getPendingSaleCancellationRequests,
  getSaleDetail,
  getSales,
  rejectSaleCancellationRequest,
  requestSaleCancellationApproval,
  type SaleCancellationRequestResponse,
  type SaleDetailResponse,
  type SaleResponse,
} from "../api/salesApi"
import { getCompanySubscription } from "../api/companySubscriptionApi"
import { getAccessibleCompanyLocations, type CompanyLocationResponse } from "../api/companyLocationsApi"
import StatusBadge from "../components/common/StatusBadge"
import TablePagination from "../components/common/TablePagination"
import { formatCurrency, formatDateTime } from "../utils/format"
import { getDefaultLocationId } from "../utils/locations"
import { useMenuSiteChange, type MenuSiteSelection } from "../components/layout/useMenuSiteChange"
import { useAuth } from "../auth/AuthContext"
import { useI18n } from "../i18n/I18nContext"
import ErrorMessage from "../components/common/ErrorMessage"
import { CompanyCurrencyRequiredError } from "../utils/companyCurrency"
import { salesHistoryRange } from "../utils/salesDates"
import { StockFacts } from "../components/inventory/StockWorkspace"
import SaleHistoryDetails from "../components/sales/SaleHistoryDetails"
import SaleCancellationDialog, { type SaleCancellationAction, type SaleCancellationReview } from "../components/sales/SaleCancellationDialog"
import { salePaymentLabel, salesWorkspaceCopy } from "../components/sales/salesWorkspaceCopy"
import "../components/sales/salesWorkspace.css"

const SALES_PER_PAGE = 12

type SitePreference = { initialSiteId?: number | null; menuSelection?: MenuSiteSelection; onSiteChange?: (id: number | null) => void }

export default function SalesHistoryPage(props: SitePreference = {}) {
  const { user } = useAuth()
  if (!user) return null
  return <SalesHistoryContent key={`${user.id}|${user.companyId}|${user.companyTimeZoneId || ""}`} {...props} />
}

function SalesHistoryContent({ initialSiteId, menuSelection, onSiteChange }: SitePreference) {
  const { user } = useAuth()
  const { copy, language } = useI18n()
  const text = copy.salesHistoryPage
  const labels = salesWorkspaceCopy[language]
  const money = (value: number) => formatCurrency(value, user?.companyCurrencyCode || "USD", language)
  const date = (value: string) => formatDateTime(value, language, user?.companyTimeZoneId || undefined)
  const payment = (value: string | null) => salePaymentLabel(value, copy.newSalePage)
  const [review, setReview] = useState<SaleCancellationReview | null>(null)
  const reviewTrigger = useRef<HTMLElement | null>(null)
  const historyHeading = useRef<HTMLHeadingElement>(null)
  const viewing = useRef(0)
  const reviewing = useRef(false)
  const [showFiltersInitially] = useState(() => matchMedia("(min-width: 769px)").matches)
  const [sales, setSales] = useState<SaleResponse[]>([])
  const [selectedSale, setSelectedSale] = useState<SaleDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [requestActionLoading, setRequestActionLoading] = useState<number | null>(null)
  const [cancellationRequestsLoading, setCancellationRequestsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [cancellationRequests, setCancellationRequests] = useState<SaleCancellationRequestResponse[]>([])
  const [cancellationApprovalEnabled, setCancellationApprovalEnabled] = useState(false)
  const [locations, setLocations] = useState<CompanyLocationResponse[]>([])
  const [locationId, setLocationId] = useState("")
  const siteRef = useRef("")
  const salesRequest = useRef(0)
  const cancellationsRequest = useRef(0)
  const [dateRange, setDateRange] = useState(() => salesHistoryRange(user?.role, user?.companyTimeZoneId))
  const [currentPage, setCurrentPage] = useState(1)
  const isAdmin = user?.role === "ADMIN"
  const isCashier = user?.role === "CASHIER"

  const pageCount = Math.max(1, Math.ceil(sales.length / SALES_PER_PAGE))
  const paginatedSales = sales.slice(
    (currentPage - 1) * SALES_PER_PAGE,
    currentPage * SALES_PER_PAGE,
  )

  const rangeValidationError = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) {
      return text.rangeMissing
    }

    const start = new Date(`${dateRange.startDate}T00:00:00Z`)
    const end = new Date(`${dateRange.endDate}T00:00:00Z`)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return text.rangeMissing
    }

    if (end < start) {
      return text.rangeOrderError
    }

    const maxEnd = new Date(start)
    maxEnd.setUTCMonth(maxEnd.getUTCMonth() + 1)

    if (end > maxEnd) {
      return text.rangeError
    }

    return ""
  }, [dateRange.endDate, dateRange.startDate, text.rangeError, text.rangeMissing, text.rangeOrderError])

  async function loadSales(selectedLocationId = siteRef.current, range = dateRange) {
    const request = ++salesRequest.current
    try {
      setLoading(true)
      setError("")
      const data = await getSales({
        ...(isCashier ? salesHistoryRange(user?.role, user?.companyTimeZoneId) : range),
        locationId: selectedLocationId ? Number(selectedLocationId) : null,
      })
      if (request === salesRequest.current) setSales(Array.isArray(data) ? data : [])
    } catch (err) {
      if (request !== salesRequest.current) return
      console.error("loadSales error:", err)
      setError(err instanceof Error ? err.message : text.loadSalesError)
    } finally {
      if (request === salesRequest.current) setLoading(false)
    }
  }

  async function loadCancellationApprovalFeature() {
    try {
      const subscription = await getCompanySubscription()
      const enabled = subscription.planCode?.toUpperCase() === "STANDARD"
      setCancellationApprovalEnabled(enabled)

      if (enabled && isAdmin) {
        await loadCancellationRequests()
      } else {
        setCancellationRequests([])
      }
    } catch (err) {
      console.error("loadCancellationApprovalFeature error:", err)
      setCancellationApprovalEnabled(false)
      setCancellationRequests([])
    }
  }

  async function loadCancellationRequests(selectedLocationId = siteRef.current) {
    if (!isAdmin) {
      return
    }

    const request = ++cancellationsRequest.current
    try {
      setCancellationRequestsLoading(true)
      const data = await getPendingSaleCancellationRequests(selectedLocationId ? Number(selectedLocationId) : null)
      if (request === cancellationsRequest.current) setCancellationRequests(Array.isArray(data) ? data : [])
    } catch (err) {
      if (request !== cancellationsRequest.current) return
      console.error("loadCancellationRequests error:", err)
      setError(err instanceof Error ? err.message : text.loadCancellationRequestsError)
    } finally {
      if (request === cancellationsRequest.current) setCancellationRequestsLoading(false)
    }
  }

  async function handleViewDetails(saleId: number) {
    const request = ++viewing.current
    try {
      setDetailLoading(true)
      setError("")
      const detail = await getSaleDetail(saleId)
      if (request !== viewing.current) return

      setSelectedSale({
        ...detail,
        items: Array.isArray(detail.items) ? detail.items : [],
      })
      requestAnimationFrame(() => document.getElementById("sale-detail-heading")?.focus())
    } catch (err) {
      if (request !== viewing.current) return
      console.error("handleViewDetails error:", err)
      setError(err instanceof Error ? err.message : text.loadDetailError)
      setSelectedSale(null)
    } finally {
      if (request === viewing.current) setDetailLoading(false)
    }
  }

  async function handleCancelSale(saleId: number) {
    const selection = viewing.current
    try {
      setRequestActionLoading(saleId)
      setError("")
      setSuccess("")
      await cancelSale(saleId)
      setSuccess(text.cancelSuccess)

      await loadSales()

      await refreshSaleDetails(saleId, selection)
    } catch (err) {
      console.error("handleCancelSale error:", err)
      if (!(err instanceof CompanyCurrencyRequiredError)) {
        setError(err instanceof Error ? err.message : text.cancelError)
      }
    } finally {
      setRequestActionLoading(null)
    }
  }

  async function handleRequestCancellationApproval(saleId: number) {
    const selection = viewing.current
    try {
      setRequestActionLoading(saleId)
      setError("")
      setSuccess("")
      await requestSaleCancellationApproval(saleId)
      setSuccess(text.cancellationRequestSuccess)
      await loadSales()

      await refreshSaleDetails(saleId, selection)
    } catch (err) {
      console.error("handleRequestCancellationApproval error:", err)
      if (!(err instanceof CompanyCurrencyRequiredError)) {
        setError(err instanceof Error ? err.message : text.cancellationRequestError)
      }
    } finally {
      setRequestActionLoading(null)
    }
  }

  async function handleApproveCancellationRequest(requestId: number, saleId: number) {
    const selection = viewing.current
    try {
      setRequestActionLoading(requestId)
      setError("")
      setSuccess("")
      await approveSaleCancellationRequest(requestId)
      setSuccess(text.cancellationApproveSuccess)
      await Promise.all([loadSales(), loadCancellationRequests()])

      await refreshSaleDetails(saleId, selection)
    } catch (err) {
      console.error("handleApproveCancellationRequest error:", err)
      if (!(err instanceof CompanyCurrencyRequiredError)) {
        setError(err instanceof Error ? err.message : text.cancellationApproveError)
      }
    } finally {
      setRequestActionLoading(null)
    }
  }

  async function handleRejectCancellationRequest(requestId: number, saleId: number) {
    const selection = viewing.current
    try {
      setRequestActionLoading(requestId)
      setError("")
      setSuccess("")
      await rejectSaleCancellationRequest(requestId)
      setSuccess(text.cancellationRejectSuccess)
      await loadCancellationRequests()
      await loadSales()
      await refreshSaleDetails(saleId, selection)
    } catch (err) {
      console.error("handleRejectCancellationRequest error:", err)
      if (!(err instanceof CompanyCurrencyRequiredError)) {
        setError(err instanceof Error ? err.message : text.cancellationRejectError)
      }
    } finally {
      setRequestActionLoading(null)
    }
  }

  async function refreshSaleDetails(saleId: number, selection: number) {
    if (selection !== viewing.current || selectedSale?.id !== saleId) return
    const updated = await getSaleDetail(saleId)
    if (selection === viewing.current) setSelectedSale({ ...updated, items: Array.isArray(updated.items) ? updated.items : [] })
  }

  function handleApplyFilter(e: React.FormEvent) {
    e.preventDefault()

    if (rangeValidationError) {
      setError(rangeValidationError)
      return
    }

    void (async () => {
      await loadSales()
      if (isAdmin && cancellationApprovalEnabled) {
        await loadCancellationRequests()
      }
    })()
  }

  function handleResetFilter() {
    const defaultRange = salesHistoryRange(user?.role, user?.companyTimeZoneId)
    setDateRange(defaultRange)
    setError("")
    setSuccess("")
    setSelectedSale(null)

    void (async () => {
      await loadSales(siteRef.current, defaultRange)
      if (isAdmin && cancellationApprovalEnabled) await loadCancellationRequests()
    })()
  }

  useEffect(() => {
    void (async () => {
      let defaultLocationId = ""

      try {
        const data = await getAccessibleCompanyLocations()
        const activeLocations = Array.isArray(data) ? data.filter((location) => location.active) : []
        defaultLocationId = initialSiteId === undefined ? getDefaultLocationId(activeLocations)
          : activeLocations.some(site => site.id === initialSiteId) ? String(initialSiteId) : ""
        setLocations(activeLocations)
        siteRef.current = defaultLocationId
        setLocationId(defaultLocationId)
      } catch (err) {
        console.error("loadLocations error:", err)
      }

      await loadSales(defaultLocationId)
      await loadCancellationApprovalFeature()
    })()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [sales])

  useEffect(() => {
    if (currentPage > pageCount) {
      setCurrentPage(pageCount)
    }
  }, [currentPage, pageCount])

  function changeSite(next: string, remember = true) {
    if (next === siteRef.current) return
    siteRef.current = next
    setLocationId(next)
    setSelectedSale(null)
    viewing.current++
    setDetailLoading(false)
    setSales([])
    setCancellationRequests([])
    salesRequest.current++
    cancellationsRequest.current++
    setLoading(false)
    setCancellationRequestsLoading(false)
    if (remember) onSiteChange?.(Number(next) || null)
    if (isAdmin && cancellationApprovalEnabled) void loadCancellationRequests(next)
    if (!rangeValidationError) {
      void loadSales(next)
    }
  }

  useMenuSiteChange(menuSelection, site => changeSite(site ? String(site) : "", false))

  function openReview(sale: SaleDetailResponse, action: SaleCancellationAction) {
    reviewTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setReview({ ...action, saleNumber: sale.saleNumber, locationName: sale.locationName, totalAmount: sale.totalAmount })
  }

  function closeReview() {
    setReview(null)
    requestAnimationFrame(() => reviewTrigger.current?.focus())
  }

  async function confirmReview() {
    if (!review || reviewing.current) return
    reviewing.current = true
    setReview(null)
    try {
      switch (review.kind) {
        case "cancel": await handleCancelSale(review.saleId); break
        case "request": await handleRequestCancellationApproval(review.saleId); break
        case "approve": await handleApproveCancellationRequest(review.requestId, review.saleId); break
        case "reject": await handleRejectCancellationRequest(review.requestId, review.saleId); break
      }
    } finally {
      reviewing.current = false
      requestAnimationFrame(() => document.getElementById("sale-detail-heading")?.focus())
    }
  }

  const pendingForSale = selectedSale && cancellationRequests.find(request => request.saleId === selectedSale.id)
  const disabled = requestActionLoading !== null

  return <div className="stock-workspace sales-workspace">
    {error && <ErrorMessage message={error} onDismiss={() => setError("")} />}
    {success && <p className="stock-panel stock-highlight" role="status">{success}</p>}
    {detailLoading && <p className="stock-panel" role="status">{text.loadingDetail}</p>}

    <div className="sales-stack" hidden={!!selectedSale || detailLoading}>
      <div className="workspace-page-title">
        <h1 tabIndex={-1} ref={historyHeading}>{text.title}</h1>
        {locations.length > 0 && <label className="page-title-site-filter">
          <select className="workspace-page-site" aria-label={copy.dashboardFilters.location} value={locationId}
            onChange={event => changeSite(event.target.value)}>
            <option value="">{copy.dashboardFilters.allLocations}</option>
            {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </label>}
      </div>

      <details className="stock-panel" open={showFiltersInitially}>
        <summary>{labels.filters} · {dateRange.startDate} – {dateRange.endDate}</summary>
        <form className="sales-filter-form" onSubmit={handleApplyFilter}>
          <label>{text.startDate}<input type="date" disabled={isCashier} value={dateRange.startDate}
            onChange={event => setDateRange(previous => ({ ...previous, startDate: event.target.value }))} /></label>
          <label>{text.endDate}<input type="date" disabled={isCashier} value={dateRange.endDate}
            onChange={event => setDateRange(previous => ({ ...previous, endDate: event.target.value }))} /></label>
          <div className="stock-actions">
            <button type="submit" className="workspace-primary" disabled={loading}>{text.applyFilter}</button>
            <button type="button" className="workspace-outline" onClick={handleResetFilter} disabled={loading}>{text.resetFilter}</button>
          </div>
        </form>
      </details>

      {isAdmin && cancellationApprovalEnabled && <section className="stock-panel">
        <h2>{text.cancellationRequestsTitle}</h2>
        {cancellationRequestsLoading ? <p role="status">{text.loadingCancellationRequests}</p>
          : cancellationRequests.length === 0 ? <p className="stock-muted">{text.emptyCancellationRequests}</p>
          : <div className="sale-cancellation-request-list">{cancellationRequests.map(request =>
            <article key={request.id} className="sale-cancellation-request-item">
              <div className="sale-cancellation-request-copy">
                <strong>{request.saleNumber}</strong>
                <span>{[request.locationName, request.customerName, money(request.totalAmount), date(request.soldAt)].filter(Boolean).join(" · ")}</span>
                <span>{text.requestedBy}: {request.requestedByName || "-"}</span>
              </div>
              <button type="button" className="workspace-outline" onClick={() => void handleViewDetails(request.saleId)}>{labels.review}</button>
            </article>
          )}</div>}
      </section>}

      <section className="stock-panel">
        <h2 id="sales-history-list-heading">{text.sales}</h2>
        {loading ? <p role="status">{text.loadingSales}</p> :
          sales.length === 0 ? <p className="stock-empty">{text.emptySales}</p> : <>
            <table className="sales-history-table">
              <thead><tr>
                {[text.saleNumber, text.date, text.location, text.customer, text.payment, text.total, text.status].map(label =>
                  <th key={label} scope="col">{label}</th>)}
                <th scope="col" aria-label={copy.common.actions} />
              </tr></thead>
              <tbody>{paginatedSales.map(sale => <tr key={sale.id}>
                <th scope="row">{sale.saleNumber}</th>
                <td>{date(sale.soldAt)}</td>
                <td>{sale.locationName || "-"}</td>
                <td>{sale.customerName || "-"}</td>
                <td>{payment(sale.paymentMethod)}</td>
                <td>{money(sale.totalAmount)}</td>
                <td><StatusBadge value={sale.status} />{sale.cancellationRequestStatus === "PENDING" && <small>{text.cancellationRequested}</small>}</td>
                <td><button type="button" className="workspace-text-action" onClick={() => void handleViewDetails(sale.id)}>{text.viewDetails}</button></td>
              </tr>)}</tbody>
            </table>
            <ul className="sales-history-cards" role="list">{paginatedSales.map(sale => <li key={sale.id}>
              <div className="stock-panel-heading"><h3>{sale.saleNumber}</h3><StatusBadge value={sale.status} /></div>
              <p className="stock-muted">{[date(sale.soldAt), sale.locationName].filter(Boolean).join(" · ")}</p>
              {sale.cancellationRequestStatus === "PENDING" && <p className="stock-muted">{text.cancellationRequested}</p>}
              <StockFacts entries={[[text.customer, sale.customerName || "-"], [text.payment, payment(sale.paymentMethod)], [text.total, money(sale.totalAmount)]]} />
              <div className="stock-actions"><button type="button" className="workspace-outline" onClick={() => void handleViewDetails(sale.id)}>{text.viewDetails}</button></div>
            </li>)}</ul>
          </>}
        {!loading && sales.length > SALES_PER_PAGE && <TablePagination currentPage={currentPage} pageCount={pageCount}
          paginationLabel={text.paginationLabel} firstPageLabel={text.firstPage} previousPageLabel={text.previousPage}
          nextPageLabel={text.nextPage} lastPageLabel={text.lastPage} onPageChange={setCurrentPage} />}
      </section>
    </div>

    {selectedSale && !detailLoading && <>
      <button type="button" className="workspace-text-action sales-back" onClick={() => {
        viewing.current++
        setSelectedSale(null)
        requestAnimationFrame(() => historyHeading.current?.focus())
      }}>{labels.back}</button>
      <SaleHistoryDetails key={selectedSale.id} sale={selectedSale}
        actions={selectedSale.status === "COMPLETED" && (isAdmin || (isCashier && cancellationApprovalEnabled && selectedSale.cancellationRequestStatus !== "PENDING"))
          ? <>
            {isAdmin && <button type="button" className="danger-button" disabled={disabled}
              onClick={() => openReview(selectedSale, { kind: "cancel", saleId: selectedSale.id })}>{text.cancel}</button>}
            {isCashier && <button type="button" className="workspace-outline" disabled={disabled}
              onClick={() => openReview(selectedSale, { kind: "request", saleId: selectedSale.id })}>{text.requestCancellation}</button>}
            {isAdmin && pendingForSale && <>
              <button type="button" className="workspace-outline" disabled={disabled} onClick={() => openReview(selectedSale,
                { kind: "approve", saleId: selectedSale.id, requestId: pendingForSale.id })}>{text.approveCancellation}</button>
              <button type="button" className="workspace-outline" disabled={disabled} onClick={() => openReview(selectedSale,
                { kind: "reject", saleId: selectedSale.id, requestId: pendingForSale.id })}>{text.rejectCancellation}</button>
            </>}
          </> : undefined} />
    </>}
    {review && <SaleCancellationDialog review={review} onClose={closeReview} onConfirm={confirmReview} />}
  </div>
}
