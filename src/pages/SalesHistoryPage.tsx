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
import ScrollableTable from "../components/common/ScrollableTable"
import SaleInvoicePreview from "../components/sales/SaleInvoicePreview"
import { formatCurrency, formatDateTime, formatNumber } from "../utils/format"
import { getDefaultLocationId } from "../utils/locations"
import { useMenuSiteChange, type MenuSiteSelection } from "../components/layout/useMenuSiteChange"
import { useAuth } from "../auth/AuthContext"
import { useI18n } from "../i18n/I18nContext"
import ErrorMessage from "../components/common/ErrorMessage"
import { CompanyCurrencyRequiredError } from "../utils/companyCurrency"
import { salesHistoryRange } from "../utils/salesDates"

type SaleItemWithOptionalUnit = {
  productId: number
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  unitName?: string | null
}

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
    try {
      setDetailLoading(true)
      setError("")
      const detail = await getSaleDetail(saleId)

      setSelectedSale({
        ...detail,
        items: Array.isArray(detail.items) ? detail.items : [],
      })
    } catch (err) {
      console.error("handleViewDetails error:", err)
      setError(err instanceof Error ? err.message : text.loadDetailError)
      setSelectedSale(null)
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleCancelSale(saleId: number) {
    const confirmed = window.confirm(text.cancelConfirm)
    if (!confirmed) return

    try {
      setError("")
      setSuccess("")
      await cancelSale(saleId)
      setSuccess(text.cancelSuccess)

      await loadSales()

      if (selectedSale && selectedSale.id === saleId) {
        const updated = await getSaleDetail(saleId)
        setSelectedSale({
          ...updated,
          items: Array.isArray(updated.items) ? updated.items : [],
        })
      }
    } catch (err) {
      console.error("handleCancelSale error:", err)
      if (!(err instanceof CompanyCurrencyRequiredError)) {
        setError(err instanceof Error ? err.message : text.cancelError)
      }
    }
  }

  async function handleRequestCancellationApproval(saleId: number) {
    try {
      setRequestActionLoading(saleId)
      setError("")
      setSuccess("")
      await requestSaleCancellationApproval(saleId)
      setSuccess(text.cancellationRequestSuccess)
      await loadSales()

      if (selectedSale && selectedSale.id === saleId) {
        const updated = await getSaleDetail(saleId)
        setSelectedSale({
          ...updated,
          items: Array.isArray(updated.items) ? updated.items : [],
        })
      }
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
    try {
      setRequestActionLoading(requestId)
      setError("")
      setSuccess("")
      await approveSaleCancellationRequest(requestId)
      setSuccess(text.cancellationApproveSuccess)
      await Promise.all([loadSales(), loadCancellationRequests()])

      if (selectedSale && selectedSale.id === saleId) {
        const updated = await getSaleDetail(saleId)
        setSelectedSale({
          ...updated,
          items: Array.isArray(updated.items) ? updated.items : [],
        })
      }
    } catch (err) {
      console.error("handleApproveCancellationRequest error:", err)
      if (!(err instanceof CompanyCurrencyRequiredError)) {
        setError(err instanceof Error ? err.message : text.cancellationApproveError)
      }
    } finally {
      setRequestActionLoading(null)
    }
  }

  async function handleRejectCancellationRequest(requestId: number) {
    try {
      setRequestActionLoading(requestId)
      setError("")
      setSuccess("")
      await rejectSaleCancellationRequest(requestId)
      setSuccess(text.cancellationRejectSuccess)
      await loadCancellationRequests()
      await loadSales()
    } catch (err) {
      console.error("handleRejectCancellationRequest error:", err)
      if (!(err instanceof CompanyCurrencyRequiredError)) {
        setError(err instanceof Error ? err.message : text.cancellationRejectError)
      }
    } finally {
      setRequestActionLoading(null)
    }
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

  return (
    <div>
      <div className="page-title-row">
        <h1>{text.title}</h1>

        {locations.length > 0 && (
          <label className="page-title-site-filter">
            <select aria-label={copy.dashboardFilters.location} value={locationId} onChange={event => changeSite(event.target.value)}>
              <option value="">{copy.dashboardFilters.allLocations}</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError("")} />}
      {success && <div className="card success">{success}</div>}

      {isAdmin && cancellationApprovalEnabled && (
        <div className="card">
          <h3>{text.cancellationRequestsTitle}</h3>

          {cancellationRequestsLoading ? (
            <p>{text.loadingCancellationRequests}</p>
          ) : cancellationRequests.length === 0 ? (
            <p>{text.emptyCancellationRequests}</p>
          ) : (
            <div className="sale-cancellation-request-list">
              {cancellationRequests.map((request) => (
                <article key={request.id} className="sale-cancellation-request-item">
                  <div className="sale-cancellation-request-copy">
                    <strong>{request.saleNumber}</strong>
                    <span>
                      {request.customerName || "-"} | {formatCurrency(request.totalAmount)} | {formatDateTime(request.soldAt, language, user?.companyTimeZoneId || undefined)}
                    </span>
                    <span>
                      {text.requestedBy}: {request.requestedByName || "-"} | {text.payment}: {request.paymentMethod || "-"}
                    </span>
                  </div>
                  <div className="table-actions">
                    <button
                      type="button"
                      onClick={() => handleViewDetails(request.saleId)}
                    >
                      {text.viewDetails}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveCancellationRequest(request.id, request.saleId)}
                      disabled={requestActionLoading === request.id}
                    >
                      {requestActionLoading === request.id ? text.processing : text.approveCancellation}
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleRejectCancellationRequest(request.id)}
                      disabled={requestActionLoading === request.id}
                    >
                      {requestActionLoading === request.id ? text.processing : text.rejectCancellation}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h3 id="sales-history-list-heading">{text.sales}</h3>

        <form className="product-filters" onSubmit={handleApplyFilter}>
          <label>
            {text.startDate}
            <input
              type="date"
              disabled={isCashier}
              value={dateRange.startDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
            />
          </label>

          <label>
            {text.endDate}
            <input
              type="date"
              disabled={isCashier}
              value={dateRange.endDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
            />
          </label>

          <div className="product-filter-actions">
            <button type="submit" disabled={loading}>
              {text.applyFilter}
            </button>
            <button type="button" className="secondary-button" onClick={handleResetFilter} disabled={loading}>
              {text.resetFilter}
            </button>
          </div>
        </form>

        {loading ? (
          <p>{text.loadingSales}</p>
        ) : (
          <ScrollableTable headingId="sales-history-list-heading" showScrollButtons={false}>
            <table>
              <thead>
                <tr>
                  <th>{text.saleNumber}</th>
                  <th>{text.date}</th>
                  <th>{text.location}</th>
                  <th>{text.customer}</th>
                  <th>{text.payment}</th>
                  <th>{text.total}</th>
                  <th>{text.status}</th>
                  <th className="mobile-sticky-actions" scope="col" aria-label={copy.common.actions} />
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={8}>{text.emptySales}</td>
                  </tr>
                ) : (
                  paginatedSales.map((sale) => (
                    <tr key={sale.id}>
                      <td>{sale.saleNumber}</td>
                      <td>{formatDateTime(sale.soldAt, language, user?.companyTimeZoneId || undefined)}</td>
                      <td>{sale.locationName || "-"}</td>
                      <td>{sale.customerName || "-"}</td>
                      <td>{sale.paymentMethod || "-"}</td>
                      <td>{formatCurrency(sale.totalAmount)}</td>
                      <td className="sales-history-actions-cell">
                        <StatusBadge value={sale.status} />
                      </td>
                      <td className="mobile-sticky-actions">
                        <div className="table-actions sales-history-actions">
                          <button className="compact-action-button" onClick={() => handleViewDetails(sale.id)}>
                            {text.viewDetails}
                          </button>

                          {isAdmin && sale.status === "COMPLETED" && (
                            <button
                              className="danger-button compact-action-button"
                              onClick={() => handleCancelSale(sale.id)}
                            >
                              {text.cancel}
                            </button>
                          )}

                          {isCashier && cancellationApprovalEnabled && sale.status === "COMPLETED" && (
                            <button
                              className="secondary-button compact-action-button"
                              onClick={() => handleRequestCancellationApproval(sale.id)}
                              disabled={
                                requestActionLoading === sale.id || sale.cancellationRequestStatus === "PENDING"
                              }
                            >
                              {sale.cancellationRequestStatus === "PENDING"
                                ? text.cancellationRequested
                                : requestActionLoading === sale.id
                                  ? text.processing
                                  : text.requestCancellation}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ScrollableTable>
        )}
        {!loading && sales.length > SALES_PER_PAGE && (
          <TablePagination
            currentPage={currentPage}
            pageCount={pageCount}
            paginationLabel={text.paginationLabel}
            firstPageLabel={text.firstPage}
            previousPageLabel={text.previousPage}
            nextPageLabel={text.nextPage}
            lastPageLabel={text.lastPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      <div className="card">
        <h3>{text.detailTitle}</h3>

        {detailLoading ? (
          <p>{text.loadingDetail}</p>
        ) : !selectedSale ? (
          <p>{text.selectSale}</p>
        ) : (
          <>
            <div className="detail-grid">
              <p><strong>{text.saleNumber}:</strong> {selectedSale.saleNumber}</p>
              <p><strong>{text.date}:</strong> {formatDateTime(selectedSale.soldAt, language, user?.companyTimeZoneId || undefined)}</p>
              <p><strong>{text.location}:</strong> {selectedSale.locationName || "-"}</p>
              <p><strong>{text.customer}:</strong> {selectedSale.customerName || "-"}</p>
              <p><strong>{text.payment}:</strong> {selectedSale.paymentMethod || "-"}</p>
              <p><strong>{text.paymentReference}:</strong> {selectedSale.paymentReference || "-"}</p>
              <p><strong>{text.authorizationCode}:</strong> {selectedSale.paymentAuthorizationCode || "-"}</p>
              <p><strong>{text.paymentConfirmedAt}:</strong> {selectedSale.paymentConfirmedAt ? formatDateTime(selectedSale.paymentConfirmedAt) : "-"}</p>
              <p><strong>{text.status}:</strong> <StatusBadge value={selectedSale.status} /></p>
              <p><strong>{text.cancellationRequestStatus}:</strong> {selectedSale.cancellationRequestStatus || "-"}</p>
              <p><strong>{text.requestedBy}:</strong> {selectedSale.cancellationRequestedByName || "-"}</p>
              <p><strong>{text.subtotal}:</strong> {formatCurrency(selectedSale.subtotalAmount)}</p>
              <p><strong>{text.tax}:</strong> {formatCurrency(selectedSale.taxAmount)}</p>
              <p><strong>{text.total}:</strong> {formatCurrency(selectedSale.totalAmount)}</p>
              <p><strong>{text.totalCost}:</strong> {formatCurrency(selectedSale.totalCostAmount)}</p>
              <p><strong>{text.totalProfit}:</strong> {formatCurrency(selectedSale.totalProfitAmount)}</p>
            </div>

            <table className="sale-line-table">
              <thead>
                <tr>
                  <th>{text.product}</th>
                  <th>{text.quantity}</th>
                  <th>{text.unitPrice}</th>
                  <th>{text.lineTotal}</th>
                </tr>
              </thead>
              <tbody>
                {selectedSale.items.length === 0 ? (
                  <tr>
                    <td colSpan={4}>{text.emptyItems}</td>
                  </tr>
                ) : (
                  (selectedSale.items as SaleItemWithOptionalUnit[]).map((item, index) => (
                    <tr key={`${item.productId}-${index}`}>
                      <td>{item.productName || "-"}</td>
                      <td>
                        {formatNumber(item.quantity)}
                        {item.unitName ? ` ${item.unitName}` : ""}
                      </td>
                      <td>{formatCurrency(item.unitPrice)}</td>
                      <td>{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <SaleInvoicePreview sale={selectedSale} companyName={user?.companyName} />
          </>
        )}
      </div>
    </div>
  )
}
