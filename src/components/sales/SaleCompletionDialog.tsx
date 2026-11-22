import { useEffect, useId, useRef, useState } from "react"
import { getSaleDetail, type SaleDetailResponse } from "../../api/salesApi"
import { useI18n } from "../../i18n/I18nContext"
import SaleInvoicePreview from "./SaleInvoicePreview"

export default function SaleCompletionDialog({ saleId, message, companyName, onClose }: {
  saleId: number; message: string; companyName?: string | null; onClose: () => void
}) {
  const { copy, language } = useI18n()
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

  return <dialog ref={ref} className="card sale-completion-dialog" aria-labelledby={id}
    onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="sale-completion-header">
      <h2 id={id}>{message}</h2>
      <button type="button" className="secondary-button" autoFocus onClick={onClose}>{copy.common.close}</button>
    </div>
    {sale ? <SaleInvoicePreview sale={sale} companyName={companyName} revealOnAction />
      : failed ? <div role="alert"><p>{text.error}</p><button type="button" onClick={() => {
        setFailed(false); setAttempt(value => value + 1)
      }}>{text.retry}</button></div> : <p role="status">{text.loading}</p>}
  </dialog>
}
