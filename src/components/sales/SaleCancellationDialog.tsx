import { useEffect, useId, useRef } from "react"
import { useAuth } from "../../auth/AuthContext"
import { useI18n } from "../../i18n/I18nContext"
import { formatCurrency } from "../../utils/format"
import { StockFacts } from "../inventory/StockWorkspace"
import { salesWorkspaceCopy } from "./salesWorkspaceCopy"

export type SaleCancellationAction =
  { kind: "cancel" | "request"; saleId: number } |
  { kind: "approve" | "reject"; saleId: number; requestId: number }

export type SaleCancellationReview = SaleCancellationAction & {
  saleNumber: string; locationName: string | null; totalAmount: number
}

export default function SaleCancellationDialog({ review, onClose, onConfirm }: {
  review: SaleCancellationReview; onClose: () => void; onConfirm: () => void
}) {
  const { user } = useAuth()
  const { copy, language } = useI18n()
  const text = copy.salesHistoryPage
  const labels = salesWorkspaceCopy[language]
  const id = useId()
  const description = useId()
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { ref.current?.showModal() }, [])
  const { kind } = review
  const [title, note, action] = kind === "cancel" ? [text.cancelConfirm, labels.restoreNote, text.cancel]
    : kind === "request" ? [labels.requestTitle, labels.requestNote, text.requestCancellation]
    : kind === "approve" ? [labels.approveTitle, labels.restoreNote, text.approveCancellation]
    : [labels.rejectTitle, labels.rejectNote, text.rejectCancellation]
  return <dialog ref={ref} className="stock-panel sales-confirm-dialog" aria-labelledby={id} aria-describedby={description}
    onCancel={event => { event.preventDefault(); onClose() }}>
    <h2 id={id}>{title}</h2>
    <p id={description}>{note}</p>
    <StockFacts entries={[
      [text.saleNumber, review.saleNumber],
      [text.location, review.locationName || "-"],
      [text.total, formatCurrency(review.totalAmount, user?.companyCurrencyCode || "USD", language)],
    ]} />
    <div className="stock-actions">
      <button type="button" autoFocus className="workspace-outline" onClick={onClose}>{copy.common.close}</button>
      <button type="button" className={kind === "cancel" || kind === "approve" ? "danger-button" : "workspace-primary"}
        onClick={onConfirm}>{action}</button>
    </div>
  </dialog>
}
