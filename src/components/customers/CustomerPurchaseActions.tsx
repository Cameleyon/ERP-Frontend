import { useEffect, useId, useRef, useState } from "react"
import { cancelSale, getSaleDetail, type SaleDetailResponse, type SaleResponse } from "../../api/salesApi"
import { useAuth } from "../../auth/AuthContext"
import { useI18n } from "../../i18n/I18nContext"
import { CompanyCurrencyRequiredError } from "../../utils/companyCurrency"
import ErrorMessage from "../common/ErrorMessage"
import SaleInvoicePreview from "../sales/SaleInvoicePreview"

export default function CustomerPurchaseActions({ sale, disabled, onUpdated }: {
  sale: SaleResponse; disabled: boolean; onUpdated: (sale: SaleResponse) => void
}) {
  const { user } = useAuth()
  const { copy } = useI18n()
  const text = copy.salesHistoryPage
  const [viewing, setViewing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState("")
  const lock = useRef(false)

  async function cancel() {
    if (lock.current || !window.confirm(text.cancelConfirm)) return
    lock.current = true
    setCancelling(true)
    try { onUpdated(await cancelSale(sale.id)) }
    catch (err) {
      if (!(err instanceof CompanyCurrencyRequiredError)) setError(err instanceof Error ? err.message : text.cancelError)
    } finally { lock.current = false; setCancelling(false) }
  }

  return <>
    <div className="table-actions sales-history-actions">
      <button type="button" className="workspace-outline" disabled={disabled || cancelling}
        onClick={() => setViewing(true)}>{text.viewDetails}</button>
      {user?.role === "ADMIN" && sale.status === "COMPLETED" && <button type="button"
        className="workspace-outline customer-danger-outline" disabled={disabled || cancelling} onClick={cancel}>
        {cancelling ? text.processing : text.cancel}</button>}
    </div>
    {viewing && <PurchaseDetails saleId={sale.id} onClose={() => setViewing(false)} />}
    {error && <ErrorMessage message={error} onDismiss={() => setError("")} />}
  </>
}

function PurchaseDetails({ saleId, onClose }: { saleId: number; onClose: () => void }) {
  const { user } = useAuth()
  const { copy } = useI18n()
  const text = copy.salesHistoryPage
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  const [sale, setSale] = useState<SaleDetailResponse | null>(null)
  const [error, setError] = useState("")
  const [attempt, setAttempt] = useState(0)
  const [loading, setLoading] = useState(true)
  useEffect(() => { ref.current?.showModal() }, [])
  useEffect(() => {
    let ignore = false
    getSaleDetail(saleId).then(data => {
      if (!ignore) setSale({ ...data, items: Array.isArray(data.items) ? data.items : [] })
    }).catch(err => { if (!ignore) setError(err instanceof Error ? err.message : text.loadDetailError) })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [saleId, attempt, text.loadDetailError])
  return <dialog ref={ref} className="card customer-details-dialog customer-purchase-details" aria-labelledby={id}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose() }}>
    <div className="sale-completion-header"><h2 id={id}>{text.detailTitle}</h2>
      <button type="button" className="secondary-button" autoFocus onClick={onClose}>{copy.common.close}</button></div>
    {loading ? <p role="status">{text.loadingDetail}</p> : error ? <div role="alert"><p>{error}</p>
      <button type="button" onClick={() => { setLoading(true); setError(""); setAttempt(value => value + 1) }}>{copy.salesHistoryPage.viewDetails}</button></div>
      : sale && <SaleInvoicePreview sale={sale} companyName={user?.companyName} />}
  </dialog>
}
