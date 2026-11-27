import { useEffect, useRef, type ReactNode } from "react"

export default function ReceiptCostConfirmationDialog({
  title, message, prompt, reviewLabel, confirmLabel, onReview, onConfirm, children,
}: {
  title: string
  message: string
  prompt: string
  reviewLabel: string
  confirmLabel: string
  onReview: () => void
  onConfirm: () => void
  children?: ReactNode
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const reviewRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current!
    dialog.showModal()
    reviewRef.current?.focus()
    return () => dialog.close()
  }, [])

  return (
    <dialog ref={dialogRef} className="card product-confirmation-dialog"
      aria-labelledby="receipt-cost-confirmation-title" aria-describedby="receipt-cost-confirmation-message"
      onCancel={event => { event.preventDefault(); onReview() }}>
      <h2 id="receipt-cost-confirmation-title">{title}</h2>
      <div id="receipt-cost-confirmation-message">
        <p>{message}</p>
        {prompt && <p>{prompt}</p>}
      </div>
      {children}
      <div className="form-actions">
        <button ref={reviewRef} type="button" className="secondary-button" onClick={onReview}>{reviewLabel}</button>
        <button type="button" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </dialog>
  )
}
