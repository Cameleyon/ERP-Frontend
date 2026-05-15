import { useEffect, useMemo, useState } from "react"
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
import SaleInvoicePreview from "../components/sales/SaleInvoicePreview"
import { formatCurrency, formatDateTime, formatNumber } from "../utils/format"
import { useAuth } from "../auth/AuthContext"
import { useI18n } from "../i18n/I18nContext"

type SaleItemWithOptionalUnit = {
  productId: number
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  unitCode?: string | null
  unitName?: string | null
}

function toInputDate(value: Date) {
  return value.toISOString().slice(0, 10)
}

function createDefaultRange() {
  const end = new Date()
  const start = new Date(end)
  start.setDate(end.getDate() - 29)

  return {
    startDate: toInputDate(start),
    endDate: toInputDate(end),
  }
}

export default function SalesHistoryPage() {
  const { user } = useAuth()
  const { copy } = useI18n()
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
  const [dateRange, setDateRange] = useState(createDefaultRange)
  const isAdmin = user?.role === "ADMIN"
  const isCashier = user?.role === "CASHIER"

  const rangeValidationError = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) {
      return text.rangeMissing
    }

    const start = new Date(`${dateRange.startDate}T00:00:00`)
    const end = new Date(`${dateRange.endDate}T00:00:00`)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return text.rangeMissing
    }

    if (end < start) {
      return text.rangeOrderError
    }

    const maxEnd = new Date(start)
    maxEnd.setMonth(maxEnd.getMonth() + 1)

    if (end > maxEnd) {
      return text.rangeError
    }

    return ""
  }, [dateRange.endDate, dateRange.startDate, text.rangeError, text.rangeMissing, text.rangeOrderError])

  async function loadSales() {
    try {
      setLoading(true)
      setError("")
      const data = await getSales({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        locationId: locationId ? Number(locationId) : null,
      })
      setSales(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("loadSales error:", err)
      setError(err instanceof Error ? err.message : text.loadSalesError)
    } finally {
      setLoading(false)
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

  async function loadCancellationRequests() {
    if (!isAdmin) {
      return
    }

    try {
      setCancellationRequestsLoading(true)
      const data = await getPendingSaleCancellationRequests(locationId ? Number(locationId) : null)
      setCancellationRequests(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("loadCancellationRequests error:", err)
      setError(err instanceof Error ? err.message : text.loadCancellationRequestsError)
    } finally {
      setCancellationRequestsLoading(false)
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
      setError(err instanceof Error ? err.message : text.cancelError)
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
      setError(err instanceof Error ? err.message : text.cancellationRequestError)
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
      setError(err instanceof Error ? err.message : text.cancellationApproveError)
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
      setError(err instanceof Error ? err.message : text.cancellationRejectError)
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
    const defaultRange = createDefaultRange()
    setDateRange(defaultRange)
    setLocationId("")
    setError("")
    setSuccess("")
    setSelectedSale(null)

    void (async () => {
      try {
        setLoading(true)
        const data = await getSales({
          ...defaultRange,
          locationId: null,
        })
        setSales(Array.isArray(data) ? data : [])
        if (isAdmin && cancellationApprovalEnabled) {
          await loadCancellationRequests()
        }
      } catch (err) {
        console.error("reset loadSales error:", err)
        setError(err instanceof Error ? err.message : text.loadSalesError)
      } finally {
        setLoading(false)
      }
    })()
  }

  useEffect(() => {
    void (async () => {
      try {
        const data = await getAccessibleCompanyLocations()
        setLocations(Array.isArray(data) ? data.filter((location) => location.active) : [])
      } catch (err) {
        console.error("loadLocations error:", err)
      }

      await loadSales()
      await loadCancellationApprovalFeature()
    })()
  }, [])

  return (
    <div>
      <h1>{text.title}</h1>

      {error && <div className="card error">{error}</div>}
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
                      {request.customerName || "-"} | {formatCurrency(request.totalAmount)} | {formatDateTime(request.soldAt)}
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
        <h3>{text.sales}</h3>

        <form className="product-filters" onSubmit={handleApplyFilter}>
          <label>
            {text.startDate}
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
            />
          </label>

          <label>
            {text.endDate}
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
            />
          </label>

          {locations.length > 1 && (
            <label>
              {text.location}
              <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">{text.allSites}</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </label>
          )}

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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={8}>{text.emptySales}</td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.saleNumber}</td>
                    <td>{formatDateTime(sale.soldAt)}</td>
                    <td>{sale.locationName || "-"}</td>
                    <td>{sale.customerName || "-"}</td>
                    <td>{sale.paymentMethod || "-"}</td>
                    <td>{formatCurrency(sale.totalAmount)}</td>
                    <td className="sales-history-actions-cell">
                      <StatusBadge value={sale.status} />
                    </td>
                    <td>
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
                            className="secondary-button"
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
              <p><strong>{text.date}:</strong> {formatDateTime(selectedSale.soldAt)}</p>
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

            <table>
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
                        {item.unitCode ? ` ${item.unitCode}` : ""}
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
