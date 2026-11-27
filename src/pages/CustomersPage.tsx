import { useEffect, useId, useRef, useState } from "react"
import { useI18n } from "../i18n/I18nContext"
import { createCustomer, getCustomers, type CustomerResponse } from "../api/customerApi"
import CustomerDetails from "../components/customers/CustomerDetails"
import CustomerEditor from "../components/customers/CustomerEditor"
import { customerWorkspaceCopy } from "../components/customers/customerWorkspaceCopy"
import { StockHeading } from "../components/inventory/StockWorkspace"
import { useAuth } from "../auth/AuthContext"
import "../components/customers/customerWorkspace.css"

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()

export default function CustomersPage() {
  const { user } = useAuth()
  return user?.role === "ADMIN" ? <CustomersContent key={`${user.companyId}:${user.id}`} /> : null
}

function CustomersContent() {
  const { copy, language } = useI18n()
  const text = copy.customersPage
  const labels = customerWorkspaceCopy[language]
  const id = useId()
  const searchInput = useRef<HTMLInputElement>(null)
  const [customers, setCustomers] = useState<CustomerResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [attempt, setAttempt] = useState(0)
  const [notice, setNotice] = useState("")
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(-1)
  const [selected, setSelected] = useState<CustomerResponse | null>(null)
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<CustomerResponse | null>(null)

  useEffect(() => {
    let ignore = false
    getCustomers().then(data => { if (!ignore) setCustomers(Array.isArray(data) ? data : []) })
      .catch(err => { if (!ignore) setLoadError(err instanceof Error ? err.message : text.loadError) })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [attempt, text.loadError])

  const query = normalize(search)
  const rows = query ? customers.filter(customer => normalize(customer.name).includes(query)) : customers
  const suggestions = query ? rows.slice(0, 10) : []
  const expanded = open && suggestions.length > 0

  function choose(customer: CustomerResponse) {
    setSelected(customer); setCreated(null); setNotice(""); setOpen(false); setIndex(-1)
  }

  function backToList() {
    setCreating(false); setSelected(null); setCreated(null)
    requestAnimationFrame(() => searchInput.current?.focus())
  }

  function saveToList(customer: CustomerResponse) {
    setCustomers(previous => [...previous.filter(item => item.id !== customer.id), customer]
      .sort((a, b) => a.name.localeCompare(b.name)))
  }

  return <div className="stock-workspace customer-workspace">
    {selected ? <CustomerDetails key={selected.id} customer={selected} onBack={backToList}
      onSaved={updated => { saveToList(updated); setSelected(updated) }}
      onDeleted={() => {
        setCustomers(previous => previous.filter(item => item.id !== selected.id))
        setNotice(text.deleteSuccess)
        backToList()
      }} /> : creating ? <CustomerEditor save={createCustomer} onCancel={backToList}
      onSaved={customer => { saveToList(customer); setCreated(customer); setCreating(false) }} />
      : created ? <>
        <StockHeading title={text.newCustomer} />
        <section className="stock-panel stock-highlight">
          <p role="status"><strong>{text.createSuccess}</strong> · {created.name} · #{created.id}</p>
          <div className="stock-actions">
            <button type="button" className="workspace-primary" autoFocus onClick={() => choose(created)}>{labels.view}</button>
            <button type="button" className="workspace-outline" onClick={backToList}>{labels.back}</button>
          </div>
        </section>
      </> : <>
        <StockHeading title={text.title} description={labels.intro}>
          <button type="button" className="workspace-primary" onClick={() => { setCreating(true); setNotice(""); setOpen(false) }}>
            <span aria-hidden="true">+</span>{text.newCustomer}
          </button>
        </StockHeading>
        {notice && <p className="stock-panel stock-highlight" role="status">{notice}</p>}
        <section className="stock-panel">
          <h2>{text.directory}</h2>
          <div className="sale-product-name-search customer-directory-search" onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setIndex(-1) }
          }}>
            <label className="stock-field" htmlFor={id}>{labels.search}
              <input ref={searchInput} id={id} role="combobox" autoComplete="off" value={search} disabled={loading}
                aria-autocomplete="list" aria-expanded={expanded}
                aria-controls={expanded ? id + "-results" : undefined}
                aria-activedescendant={expanded && index >= 0 && index < suggestions.length ? id + "-" + index : undefined}
                onChange={event => { setSearch(event.target.value); setOpen(true); setIndex(-1) }}
                onKeyDown={event => {
                  if (event.nativeEvent.isComposing) return
                  if (event.key === "Escape") { setOpen(false); setIndex(-1) }
                  if (suggestions.length && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
                    event.preventDefault(); setOpen(true)
                    setIndex(previous => event.key === "ArrowDown" ? (previous + 1) % suggestions.length
                      : (Math.max(0, previous) + suggestions.length - 1) % suggestions.length)
                  }
                  if (event.key === "Enter" && expanded && (index >= 0 || suggestions.length === 1)) {
                    event.preventDefault()
                    const match = suggestions[Math.max(0, index)]
                    if (match) choose(match)
                  }
                }} />
            </label>
            {expanded && <ul id={id + "-results"} role="listbox" className="sale-product-name-suggestions">
              {suggestions.map((customer, i) => <li key={customer.id} role="presentation">
                <button type="button" role="option" id={id + "-" + i} tabIndex={-1} aria-selected={index === i}
                  className="sale-product-name-option" onMouseDown={event => event.preventDefault()} onClick={() => choose(customer)}>
                  <strong>{customer.name}</strong>
                  <span>{[customer.phone, customer.email, `#${customer.id}`].filter(Boolean).join(" · ")}</span>
                </button>
              </li>)}
            </ul>}
          </div>
          {loading ? <p role="status">{text.loading}</p> : loadError ? <div role="alert" className="customer-error">
            <p>{loadError}</p>
            <button type="button" className="workspace-outline" onClick={() => {
              setLoadError(""); setLoading(true); setAttempt(previous => previous + 1)
            }}>{labels.retry}</button>
          </div> : rows.length === 0 ? <p className="stock-empty" role="status">{query ? text.emptyFiltered : text.empty}</p>
          : <table className="stock-responsive-rows customer-directory-table" role="table">
            <thead><tr><th scope="col">{text.name}</th><th scope="col">{text.phone}</th><th scope="col">{text.email}</th>
              <th scope="col" aria-label={copy.common.actions} /></tr></thead>
            <tbody>{rows.map(customer => <tr key={customer.id} role="row">
              <th scope="row"><span className="customer-identity">
                <span className="customer-initials" aria-hidden="true">{customer.name.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join("").toLocaleUpperCase(language)}</span>
                <span>{customer.name}<small>#{customer.id}</small></span>
              </span></th>
              <td role="cell"><span className="stock-cell-label" aria-hidden="true">{text.phone}</span><span className="customer-contact-value">{customer.phone || labels.missing}</span></td>
              <td role="cell"><span className="stock-cell-label" aria-hidden="true">{text.email}</span><span className="customer-contact-value">{customer.email || labels.missing}</span></td>
              <td role="cell" className="stock-table-actions"><button type="button" className="workspace-outline" onClick={() => choose(customer)}>{labels.view}</button></td>
            </tr>)}</tbody>
          </table>}
        </section>
      </>}
  </div>
}
