import { useI18n } from "../../i18n/I18nContext"
import type { ReactNode } from "react"

type Props = {
  productCode: string
  onProductCodeChange: (value: string) => void
  onLookup: () => void
  loading?: boolean
  children?: ReactNode
}

export default function BarcodeLookup({
  productCode,
  onProductCodeChange,
  onLookup,
  loading = false,
  children,
}: Props) {
  const { copy } = useI18n()
  const text = copy.barcodeLookup

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onLookup()
  }

  return (
    <div className="card product-lookup-card">
      <h3>{text.title}</h3>
      <form onSubmit={handleSubmit} className="sale-form-row">
        <input
          type="text"
          placeholder={text.placeholder}
          value={productCode}
          onChange={(e) => onProductCodeChange(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? text.loading : text.action}
        </button>
      </form>
      {children}
    </div>
  )
}
