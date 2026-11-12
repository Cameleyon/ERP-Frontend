import { useEffect, useId, useRef } from "react"
import { useI18n } from "../../i18n/I18nContext"

type Props = { message: string; onDismiss: () => void }

export default function ErrorMessage({ message, onDismiss }: Props) {
  const { copy } = useI18n()
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      className="card error-dialog"
      role="alertdialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-message`}
      onClose={onDismiss}
    >
      <h2 id={`${id}-title`}>{copy.common.errorTitle}</h2>
      <p id={`${id}-message`}>{message}</p>
      <div className="form-actions">
        <button type="button" autoFocus onClick={() => ref.current?.close()}>{copy.common.close}</button>
      </div>
    </dialog>
  )
}
