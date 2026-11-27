import { useEffect, useState } from "react"
import { getCustomerPurchases } from "../../api/customerApi"
import { useAuth } from "../../auth/AuthContext"
import { useI18n } from "../../i18n/I18nContext"
import { formatCurrency, formatDateTime } from "../../utils/format"
import StatusBadge from "../common/StatusBadge"
import CustomerPurchaseActions from "./CustomerPurchaseActions"
import { customerWorkspaceCopy } from "./customerWorkspaceCopy"

export default function CustomerPurchases({ customerId }: { customerId: number }) {
  const { copy, language } = useI18n()
  const { user } = useAuth()
  const text = copy.salesHistoryPage
  const labels = customerWorkspaceCopy[language]
  const [page, setPage] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [purchases, setPurchases] = useState<Awaited<ReturnType<typeof getCustomerPurchases>> | null>(null)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let ignore = false
    getCustomerPurchases(customerId, page).then(result => { if (!ignore) setPurchases(result) })
      .catch(() => { if (!ignore) setFailed(true) })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [customerId, page, attempt])

  function changePage(next: number) { setLoading(true); setFailed(false); setPage(next) }

  return <section className="stock-panel customer-purchases">
    <h2>{labels.past}</h2>
    {loading ? <p role="status">{text.loadingSales}</p> : failed
      ? <div role="alert" className="customer-error"><p>{text.loadSalesError}</p>
        <button type="button" className="workspace-outline" onClick={() => {
          setLoading(true); setFailed(false); setAttempt(value => value + 1)
        }}>{labels.retry}</button>
      </div> : !purchases?.items.length ? <p className="stock-empty">{labels.noPurchases}</p> : <>
        <table className="stock-responsive-rows customer-purchase-table" role="table">
          <thead><tr>
            {[text.saleNumber, text.date, text.location, text.total, text.status].map(label => <th scope="col" key={label}>{label}</th>)}
            <th scope="col" aria-label={copy.common.actions} />
          </tr></thead>
          <tbody>{purchases.items.map(sale => <tr key={sale.id} role="row">
            <th scope="row">{sale.saleNumber}</th>
            <td role="cell"><span className="stock-cell-label" aria-hidden="true">{text.date}</span>
              <span>{formatDateTime(sale.soldAt, language, user?.companyTimeZoneId || undefined)}</span></td>
            <td role="cell"><span className="stock-cell-label" aria-hidden="true">{text.location}</span><span>{sale.locationName || "-"}</span></td>
            <td role="cell"><span className="stock-cell-label" aria-hidden="true">{text.total}</span>
              <span>{formatCurrency(sale.totalAmount, user?.companyCurrencyCode || "USD", language)}</span></td>
            <td role="cell"><span className="stock-cell-label" aria-hidden="true">{text.status}</span><StatusBadge value={sale.status} /></td>
            <td role="cell" className="stock-table-actions"><CustomerPurchaseActions sale={sale} disabled={false}
              onUpdated={updated => setPurchases(previous => previous ? { ...previous,
                items: previous.items.map(item => item.id === updated.id ? updated : item),
              } : previous)} /></td>
          </tr>)}</tbody>
        </table>
        <div className="customer-purchase-pagination">
          <button type="button" className="workspace-outline" disabled={page === 0} onClick={() => changePage(page - 1)}>{text.previousPage}</button>
          <span>{page + 1} / {Math.max(1, Math.ceil(purchases.total / purchases.size))}</span>
          <button type="button" className="workspace-outline" disabled={(page + 1) * purchases.size >= purchases.total}
            onClick={() => changePage(page + 1)}>{text.nextPage}</button>
        </div>
      </>}
  </section>
}
