import { useEffect, useId, useRef, useState } from "react"
import { deleteCustomer, updateCustomer, type CustomerResponse } from "../../api/customerApi"
import { useI18n } from "../../i18n/I18nContext"
import { StockFacts, StockHeading } from "../inventory/StockWorkspace"
import CustomerEditor from "./CustomerEditor"
import CustomerPurchases from "./CustomerPurchases"
import { customerWorkspaceCopy } from "./customerWorkspaceCopy"

export default function CustomerDetails({ customer, onBack, onSaved, onDeleted }: {
  customer: CustomerResponse; onBack: () => void; onSaved: (customer: CustomerResponse) => void; onDeleted: () => void
}) {
  const { copy, language } = useI18n()
  const text = copy.customersPage
  const labels = customerWorkspaceCopy[language]
  const heading = useRef<HTMLHeadingElement>(null)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { if (!editing) heading.current?.focus() }, [editing])

  return <>
    {editing && <CustomerEditor customer={customer} save={payload => updateCustomer(customer.id, payload)}
      onSaved={updated => { onSaved(updated); setSaved(true); setEditing(false) }}
      onCancel={() => setEditing(false)} />}
    <div className="customer-record" hidden={editing}>
      <button type="button" className="workspace-text-action customer-back" onClick={onBack}>{labels.back}</button>
      <StockHeading headingRef={heading} title={customer.name} description={`${labels.record} · #${customer.id}`}>
        <button type="button" className="workspace-primary" onClick={() => { setSaved(false); setEditing(true) }}>{text.editCustomer}</button>
      </StockHeading>
      {saved && <div className="stock-panel stock-highlight" role="status">{text.updateSuccess}</div>}
      <div className="customer-details-layout">
        <section className="stock-panel">
          <h2>{labels.contact}</h2>
          <StockFacts entries={[
            [text.phone, customer.phone || labels.missing],
            [text.email, customer.email || labels.missing],
            [labels.consent, customer.emailOptIn ? labels.accepted : labels.declined],
          ]} />
        </section>
        <section className="stock-panel">
          <h2>{copy.common.actions}</h2>
          <div className="stock-actions customer-actions">
            <button type="button" className="workspace-outline customer-danger-outline" onClick={() => setDeleting(true)}>{labels.delete}</button>
          </div>
        </section>
      </div>
      <CustomerPurchases customerId={customer.id} />
    </div>
    {deleting && <DeleteCustomerDialog customer={customer} onClose={() => setDeleting(false)} onDeleted={onDeleted} />}
  </>
}

function DeleteCustomerDialog({ customer, onClose, onDeleted }: {
  customer: CustomerResponse; onClose: () => void; onDeleted: () => void
}) {
  const { copy, language } = useI18n()
  const text = copy.customersPage
  const labels = customerWorkspaceCopy[language]
  const ref = useRef<HTMLDialogElement>(null)
  const lock = useRef(false)
  const title = useId()
  const description = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => { ref.current?.showModal() }, [])

  function close() {
    if (lock.current) return
    ref.current?.close()
    onClose()
  }

  async function remove() {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError("")
    try {
      await deleteCustomer(customer.id)
      ref.current?.close()
      onDeleted()
    } catch (failure) { setError(failure instanceof Error ? failure.message : text.deleteError) }
    finally { lock.current = false; setBusy(false) }
  }

  return <dialog ref={ref} className="stock-panel customer-delete-dialog" aria-labelledby={title} aria-describedby={description}
    onCancel={event => { event.preventDefault(); close() }}>
    <h2 id={title}>{text.deleteConfirm(customer.name)}</h2>
    <p id={description}>{labels.deleteNote}</p>
    <StockFacts entries={[
      [labels.record, `#${customer.id}`],
      [text.phone, customer.phone || labels.missing],
      [text.email, customer.email || labels.missing],
    ]} />
    {error && <div className="customer-error" role="alert">{error}</div>}
    <div className="stock-actions customer-actions">
      <button type="button" className="workspace-outline secondary-button" autoFocus onClick={close} disabled={busy}>{text.cancel}</button>
      <button type="button" className="danger-button customer-delete-confirm" onClick={remove} disabled={busy}>{labels.delete}</button>
    </div>
  </dialog>
}
