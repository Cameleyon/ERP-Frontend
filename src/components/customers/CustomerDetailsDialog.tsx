import { useEffect, useId, useRef, useState } from "react"
import { deleteCustomer, getCustomerPurchases, updateCustomer, type CustomerResponse } from "../../api/customerApi"
import { useI18n } from "../../i18n/I18nContext"
import { useAuth } from "../../auth/AuthContext"
import { formatCurrency, formatDateTime } from "../../utils/format"
import StatusBadge from "../common/StatusBadge"
import CustomerFields from "./CustomerFields"
import CustomerPurchaseActions from "./CustomerPurchaseActions"

export default function CustomerDetailsDialog({ customer, onClose, onSaved, onDeleted }: {
  customer: CustomerResponse; onClose: () => void; onSaved: (customer: CustomerResponse) => void; onDeleted: () => void
}) {
  const { copy, language } = useI18n()
  const { user } = useAuth()
  const text = copy.customersPage
  const history = copy.salesHistoryPage
  const labels = language === "fr" ? { title: "Achats précédents", empty: "Aucun achat enregistré.", retry: "Réessayer" }
    : language === "es" ? { title: "Compras anteriores", empty: "No hay compras registradas.", retry: "Reintentar" }
      : { title: "Past purchases", empty: "No purchases recorded.", retry: "Retry" }
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  const [form, setForm] = useState({ name: customer.name, phone: customer.phone || "", email: customer.email || "", emailOptIn: customer.emailOptIn })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [page, setPage] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [purchases, setPurchases] = useState<Awaited<ReturnType<typeof getCustomerPurchases>> | null>(null)
  const [historyFailed, setHistoryFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  useEffect(() => { ref.current?.showModal() }, [])
  useEffect(() => {
    let ignore = false
    getCustomerPurchases(customer.id, page).then(result => { if (!ignore) setPurchases(result) })
      .catch(() => { if (!ignore) setHistoryFailed(true) })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [customer.id, page, attempt])
  function changePage(value: number) { setLoading(true); setHistoryFailed(false); setPage(value) }
  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (!form.name.trim()) { setError(text.nameRequired); return }
    setBusy(true); setError(""); setSuccess("")
    try {
      const updated = await updateCustomer(customer.id, { ...form, name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() })
      onSaved(updated); setSuccess(text.updateSuccess)
    } catch (err) { setError(err instanceof Error ? err.message : text.saveError) }
    finally { setBusy(false) }
  }
  async function remove() {
    if (!window.confirm(text.deleteConfirm(form.name))) return
    setBusy(true); setError(""); setSuccess("")
    try { await deleteCustomer(customer.id); onDeleted() }
    catch (err) { setError(err instanceof Error ? err.message : text.deleteError) }
    finally { setBusy(false) }
  }
  return <dialog ref={ref} className="card customer-details-dialog" aria-labelledby={id}
    onCancel={event => {
      if (event.target !== event.currentTarget) return
      event.preventDefault()
      if (!busy) onClose()
    }}>
    <div className="sale-completion-header"><h2 id={id}>{customer.name}</h2>
      <button type="button" className="secondary-button" autoFocus disabled={busy} onClick={onClose}>{copy.common.close}</button></div>
    {error && <p role="alert" className="error">{error}</p>}
    {success && <p role="status" className="success">{success}</p>}
    <form onSubmit={save} className="product-form-grid">
      <CustomerFields value={form} onChange={setForm} disabled={busy} />
      <div className="form-actions full-width"><button disabled={busy}>{busy ? text.updating : text.updateCustomer}</button>
        <button type="button" className="danger-button" disabled={busy} onClick={remove}>{text.delete}</button></div>
    </form>
    <h3>{labels.title}</h3>
    {loading ? <p role="status">{history.loadingSales}</p> : historyFailed ? <div role="alert"><p>{history.loadSalesError}</p>
      <button onClick={() => { setLoading(true); setHistoryFailed(false); setAttempt(value => value + 1) }}>{labels.retry}</button></div>
      : !purchases?.items.length ? <p>{labels.empty}</p> : <>
        <div className="scrollable-table" tabIndex={0} role="region" aria-label={labels.title}>
          <table><thead><tr><th>{history.saleNumber}</th><th>{history.date}</th><th>{history.location}</th><th>{history.total}</th><th>{history.status}</th><th className="mobile-sticky-actions" aria-label={copy.common.actions} /></tr></thead>
            <tbody>{purchases.items.map(sale => <tr key={sale.id}><td>{sale.saleNumber}</td>
              <td>{formatDateTime(sale.soldAt, language, user?.companyTimeZoneId || undefined)}</td><td>{sale.locationName || "-"}</td>
              <td>{formatCurrency(sale.totalAmount)}</td><td><StatusBadge value={sale.status} /></td>
              <td className="mobile-sticky-actions"><CustomerPurchaseActions sale={sale} disabled={busy}
                onUpdated={updated => setPurchases(previous => previous ? { ...previous,
                  items: previous.items.map(item => item.id === updated.id ? updated : item) } : previous)} /></td>
            </tr>)}</tbody></table>
        </div>
        <div className="customer-purchase-pagination"><button type="button" className="secondary-button" disabled={page === 0}
          onClick={() => changePage(page - 1)}>{history.previousPage}</button>
          <span>{page + 1} / {Math.max(1, Math.ceil(purchases.total / purchases.size))}</span>
          <button type="button" className="secondary-button" disabled={(page + 1) * purchases.size >= purchases.total}
            onClick={() => changePage(page + 1)}>{history.nextPage}</button></div>
      </>}
  </dialog>
}
