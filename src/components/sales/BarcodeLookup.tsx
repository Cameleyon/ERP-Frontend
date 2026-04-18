import { useI18n } from "../../i18n/I18nContext"

type Props = {
  barcode: string
  onBarcodeChange: (value: string) => void
  onLookup: () => void
  loading?: boolean
}

export default function BarcodeLookup({
  barcode,
  onBarcodeChange,
  onLookup,
  loading = false,
}: Props) {
  const { language } = useI18n()

  const text = language === "fr"
    ? {
        title: "Recherche par code-barres",
        placeholder: "Entrer le code-barres",
        loading: "Recherche...",
        action: "Trouver le produit",
      }
    : {
        title: "Barcode lookup",
        placeholder: "Enter the barcode",
        loading: "Looking up...",
        action: "Find product",
      }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onLookup()
  }

  return (
    <div className="card">
      <h3>{text.title}</h3>
      <form onSubmit={handleSubmit} className="sale-form-row">
        <input
          type="text"
          placeholder={text.placeholder}
          value={barcode}
          onChange={(e) => onBarcodeChange(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? text.loading : text.action}
        </button>
      </form>
    </div>
  )
}
