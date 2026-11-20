import { useEffect, useId, useState } from "react"
import { getProducts, type ProductResponse } from "../../api/productManagementApi"
import { useI18n } from "../../i18n/I18nContext"
import { suggestProducts } from "../../utils/productNameSearch"

type Props = {
  onSelect: (sku: string) => void
  onQueryChange: () => void
  onError: (message: string) => void
}

export default function ProductNameLookup({ onSelect, onQueryChange, onError }: Props) {
  const { copy } = useI18n()
  const text = copy.barcodeLookup
  const id = useId()
  const [products, setProducts] = useState<ProductResponse[]>([])
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(-1)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const results = suggestProducts(products, query)
  const expanded = open && !!query.trim() && !loading && results.length > 0

  useEffect(() => {
    let current = true
    getProducts().then(data => {
      if (current) setProducts(Array.isArray(data) ? data : [])
    }).catch(() => {
      if (current) {
        setFailed(true)
        onError(text.nameLoadError)
      }
    }).finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [attempt, onError, text.nameLoadError])

  function choose(product: ProductResponse) {
    setQuery(product.name)
    setOpen(false)
    setIndex(-1)
    onSelect(product.sku)
  }

  return <div className="sale-product-name-search"
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    <label htmlFor={id}>{text.nameLabel}</label>
    <input id={id} type="text" role="combobox" autoComplete="off" value={query}
      placeholder={text.namePlaceholder} aria-autocomplete="list" aria-expanded={expanded}
      aria-controls={expanded ? id + "-results" : undefined}
      aria-activedescendant={expanded && index >= 0 && index < results.length ? id + "-" + index : undefined}
      onFocus={() => setOpen(true)}
      onChange={event => {
        setQuery(event.target.value)
        setOpen(true)
        setIndex(-1)
        onQueryChange()
      }}
      onKeyDown={event => {
        if (event.key === "Escape") { setOpen(false); setIndex(-1) }
        if (results.length && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
          event.preventDefault()
          setOpen(true)
          setIndex(previous => event.key === "ArrowDown"
            ? (previous + 1) % results.length : (previous <= 0 ? results.length : previous) - 1)
        }
        if (event.key === "Enter" && expanded) {
          event.preventDefault()
          choose(results[index >= 0 ? index : 0])
        }
      }} />
    {open && query.trim() && loading && <p role="status">{text.loading}</p>}
    {open && query.trim() && !loading && !failed && results.length === 0 && <p role="status">{text.nameEmpty}</p>}
    {failed && <button type="button" className="secondary-button" onClick={() => {
      setLoading(true); setFailed(false); setAttempt(value => value + 1)
    }}>{text.nameRetry}</button>}
    {expanded && <ul id={id + "-results"} role="listbox" className="sale-product-name-suggestions">
      {results.map((product, itemIndex) => <li key={product.id} role="presentation">
        <button type="button" role="option" id={id + "-" + itemIndex} tabIndex={-1}
          aria-selected={index === itemIndex} className="sale-product-name-option"
          onMouseDown={event => event.preventDefault()} onClick={() => choose(product)}>
          <strong>{product.name}</strong><span>SKU: {product.sku}</span>
        </button>
      </li>)}
    </ul>}
  </div>
}
