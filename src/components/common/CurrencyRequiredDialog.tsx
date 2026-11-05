import { useEffect, useRef } from "react"
import { useI18n } from "../../i18n/I18nContext"
import { currencyRequiredText } from "../../utils/companyCurrency"

type Props = { canConfigure: boolean; onConfigure: () => void; onClose: () => void }

export default function CurrencyRequiredDialog({ canConfigure, onConfigure, onClose }: Props) {
  const { language } = useI18n()
  const text = currencyRequiredText(language)
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.showModal()
    return () => { dialog.close(); opener?.focus({ preventScroll: true }) }
  }, [])
  return (
    <dialog ref={ref} className="card currency-required-dialog" aria-labelledby="currency-required-title" aria-describedby="currency-required-message" onCancel={event => { event.preventDefault(); onClose() }}>
      <h2 id="currency-required-title">{text.title}</h2>
      <p id="currency-required-message">{canConfigure ? text.message : text.staffMessage}</p>
      <div className="form-actions">
        <button type="button" className="secondary-button" onClick={onClose}>{text.close}</button>
        {canConfigure && <button type="button" onClick={onConfigure}>{text.action}</button>}
      </div>
    </dialog>
  )
}
