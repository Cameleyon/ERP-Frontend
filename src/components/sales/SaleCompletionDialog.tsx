import { useEffect, useId, useRef, useState } from "react"
import { getSaleDetail, type CreateSaleResponse, type SaleDetailResponse } from "../../api/salesApi"
import { useI18n } from "../../i18n/I18nContext"
import SaleInvoicePreview from "./SaleInvoicePreview"
import RecordedSaleTotals from "./RecordedSaleTotals"
import { salesWorkspaceCopy } from "./salesWorkspaceCopy"

export default function SaleCompletionDialog({ recorded, companyName, onClose }: {
  recorded: CreateSaleResponse; companyName?: string | null; onClose: () => void
}) {
  const { copy, language } = useI18n()
  const labels = salesWorkspaceCopy[language]
  const saleId = recorded.id
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  const [sale, setSale] = useState<SaleDetailResponse | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const text = language === "fr"
    ? { loading: "Chargement du reçu...", error: "La vente est enregistrée, mais le reçu n’a pas pu être chargé.", retry: "Réessayer" }
    : language === "es"
      ? { loading: "Cargando el recibo...", error: "La venta se ha registrado, pero no se pudo cargar el recibo.", retry: "Reintentar" }
      : { loading: "Loading receipt...", error: "The sale was recorded, but the receipt could not be loaded.", retry: "Retry" }

  useEffect(() => { ref.current?.showModal() }, [])
  useEffect(() => {
    let ignore = false
    getSaleDetail(saleId).then(value => {
      if (!ignore) setSale({ ...value, items: Array.isArray(value.items) ? value.items : [] })
    }).catch(() => { if (!ignore) setFailed(true) })
    return () => { ignore = true }
  }, [saleId, attempt])

  function finish() {
    ref.current?.close()
    onClose()
  }

  return <dialog ref={ref} className="card sale-completion-dialog stock-workspace sales-workspace" aria-labelledby={id}
    onCancel={event => { event.preventDefault(); finish() }}>
    <div className="sale-completion-header">
      <h2 id={id}>{labels.recorded}</h2>
      <button type="button" className="workspace-outline" autoFocus onClick={finish}>{copy.common.close}</button>
    </div>
    <p><strong>{recorded.saleNumber}</strong>{[recorded.locationName, recorded.customerName].filter(Boolean).map(value => " · " + value).join("")}</p>
    <RecordedSaleTotals sale={recorded} />
    {sale ? <SaleInvoicePreview sale={sale} companyName={companyName} revealOnAction />
      : failed ? <div role="alert"><p>{text.error}</p><button type="button" onClick={() => {
        setFailed(false); setAttempt(value => value + 1)
      }}>{text.retry}</button></div> : <p role="status">{text.loading}</p>}
    <div className="stock-actions"><button type="button" className="workspace-primary" onClick={finish}>{labels.nextSale}</button></div>
  </dialog>
}
