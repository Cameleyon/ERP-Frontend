import { useRef, useState, type FormEvent } from "react"
import type { CustomerPayload, CustomerResponse } from "../../api/customerApi"
import { useI18n } from "../../i18n/I18nContext"
import { StockHeading } from "../inventory/StockWorkspace"
import CustomerFields from "./CustomerFields"
import { customerWorkspaceCopy } from "./customerWorkspaceCopy"

export default function CustomerEditor({ customer, save, onSaved, onCancel }: {
  customer?: CustomerResponse
  save: (payload: CustomerPayload) => Promise<CustomerResponse>
  onSaved: (customer: CustomerResponse) => void
  onCancel: () => void
}) {
  const { copy, language } = useI18n()
  const text = copy.customersPage
  const labels = customerWorkspaceCopy[language]
  const [value, setValue] = useState<CustomerPayload>(() => ({
    name: customer?.name ?? "", phone: customer?.phone ?? "", email: customer?.email ?? "", emailOptIn: customer?.emailOptIn ?? false,
  }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const locked = useRef(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (locked.current) return
    const payload = { ...value, name: value.name.trim(), phone: value.phone.trim(), email: value.email.trim() }
    if (!payload.name) { setError(text.nameRequired); return }
    locked.current = true
    setBusy(true)
    setError("")
    try { onSaved(await save(payload)) }
    catch (failure) { setError(failure instanceof Error ? failure.message : text.saveError) }
    finally { locked.current = false; setBusy(false) }
  }

  return <>
    <StockHeading title={customer ? text.editCustomer : text.newCustomer}
      description={customer ? `${customer.name} · #${customer.id}` : labels.nameOnly} />
    <form className="stock-panel customer-editor" onSubmit={submit}>
      {error && <div role="alert" className="customer-error">{error}</div>}
      <CustomerFields value={value} onChange={setValue} disabled={busy} focusName />
      <div className="stock-actions">
        <button type="submit" className="workspace-primary" disabled={busy}>
          {customer ? busy ? text.updating : text.updateCustomer : busy ? text.creating : text.createCustomer}
        </button>
        <button type="button" className="workspace-outline" onClick={onCancel} disabled={busy}>{text.cancel}</button>
      </div>
    </form>
  </>
}
