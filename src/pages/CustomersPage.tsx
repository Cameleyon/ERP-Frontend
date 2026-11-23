import { useEffect, useId, useState } from "react"
import { useI18n } from "../i18n/I18nContext"
import ErrorMessage from "../components/common/ErrorMessage"
import { createCustomer, getCustomers, type CustomerResponse } from "../api/customerApi"
import CustomerDetailsDialog from "../components/customers/CustomerDetailsDialog"
import CustomerFields from "../components/customers/CustomerFields"

const emptyForm = { name: "", phone: "", email: "", emailOptIn: false }
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()

export default function CustomersPage() {
  const { copy } = useI18n()
  const text = copy.customersPage
  const id = useId()
  const [customers, setCustomers] = useState<CustomerResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(-1)
  const [selected, setSelected] = useState<CustomerResponse | null>(null)
  const [form, setForm] = useState(emptyForm)
  useEffect(() => {
    let ignore = false
    getCustomers().then(data => { if (!ignore) setCustomers(Array.isArray(data) ? data : []) })
      .catch(err => { if (!ignore) setError(err instanceof Error ? err.message : text.loadError) })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [text.loadError])
  const query = normalize(search)
  const results = query ? customers.filter(customer => normalize(customer.name).includes(query)).slice(0, 10) : []
  const expanded = open && results.length > 0
  function choose(customer: CustomerResponse) {
    setSelected(customer); setOpen(false); setIndex(-1); setSearch(customer.name)
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.name.trim()) { setError(text.nameRequired); return }
    setSaving(true); setError(""); setSuccess("")
    try {
      const created = await createCustomer({ ...form, name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() })
      setCustomers(previous => [...previous, created].sort((a, b) => a.name.localeCompare(b.name)))
      setForm(emptyForm); setSuccess(text.createSuccess)
    } catch (err) { setError(err instanceof Error ? err.message : text.saveError) }
    finally { setSaving(false) }
  }
  return <div>
    <h1>{text.title}</h1>
    {error && <ErrorMessage message={error} onDismiss={() => setError("")} />}
    {success && <div className="card success">{success}</div>}
    <div className="card">
      <h3>{text.newCustomer}</h3>
      <form onSubmit={submit} className="product-form-grid">
        <CustomerFields value={form} onChange={setForm} disabled={saving} />
        <div className="form-actions full-width"><button disabled={saving}>{saving ? text.creating : text.createCustomer}</button></div>
      </form>
    </div>
    <div className="card product-lookup-card">
      <h3>{text.directory}</h3>
      <div className="sale-product-name-search" onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}>
        <label htmlFor={id}>{text.search}</label>
        <input id={id} role="combobox" autoComplete="off" value={search} disabled={loading}
          placeholder={text.namePlaceholder} aria-autocomplete="list" aria-expanded={expanded}
          aria-controls={expanded ? id + "-results" : undefined}
          aria-activedescendant={expanded && index >= 0 ? id + "-" + index : undefined}
          onFocus={() => setOpen(true)} onChange={event => { setSearch(event.target.value); setOpen(true); setIndex(-1) }}
          onKeyDown={event => {
            if (event.nativeEvent.isComposing) return
            if (event.key === "Escape") { setOpen(false); setIndex(-1) }
            if (results.length && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
              event.preventDefault(); setOpen(true)
              setIndex(previous => event.key === "ArrowDown" ? (previous + 1) % results.length : (previous <= 0 ? results.length : previous) - 1)
            }
            if (event.key === "Enter" && expanded) {
              event.preventDefault()
              if (index >= 0 || results.length === 1) choose(results[index >= 0 ? index : 0])
            }
          }} />
        {expanded && <ul id={id + "-results"} role="listbox" className="sale-product-name-suggestions">
          {results.map((customer, i) => <li key={customer.id} role="presentation">
            <button type="button" role="option" id={id + "-" + i} tabIndex={-1} aria-selected={index === i}
              className="sale-product-name-option" onMouseDown={event => event.preventDefault()} onClick={() => choose(customer)}>
              <strong>{customer.name}</strong><span>{customer.phone || customer.email || `#${customer.id}`}</span>
            </button>
          </li>)}
        </ul>}
      </div>
      {loading && <p role="status">{text.loading}</p>}
      {open && query && !loading && results.length === 0 && <p role="status">{text.emptyFiltered}</p>}
    </div>
    {selected && <CustomerDetailsDialog key={selected.id} customer={selected} onClose={() => setSelected(null)}
      onSaved={updated => { setCustomers(previous => previous.map(c => c.id === updated.id ? updated : c)); setSelected(updated); setSearch(updated.name) }}
      onDeleted={() => { setCustomers(previous => previous.filter(c => c.id !== selected.id)); setSelected(null); setSearch("") }} />}
  </div>
}
