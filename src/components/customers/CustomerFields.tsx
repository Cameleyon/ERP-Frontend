import { useI18n } from "../../i18n/I18nContext"
import type { CustomerPayload } from "../../api/customerApi"
import { customerWorkspaceCopy } from "./customerWorkspaceCopy"

export default function CustomerFields({ value, onChange, disabled, focusName = false }: {
  value: CustomerPayload; onChange: (value: CustomerPayload) => void; disabled: boolean; focusName?: boolean
}) {
  const { copy, language } = useI18n()
  const text = copy.customersPage
  const labels = customerWorkspaceCopy[language]
  return <>
    <label className="stock-field">{text.name}<input required autoFocus={focusName} value={value.name} disabled={disabled} placeholder={text.namePlaceholder}
      onChange={event => onChange({ ...value, name: event.target.value })} /></label>
    <label className="stock-field"><span>{text.phone} <small>· {labels.optional}</small></span><input type="tel" value={value.phone} disabled={disabled} placeholder={text.phonePlaceholder}
      onChange={event => onChange({ ...value, phone: event.target.value })} /></label>
    <label className="stock-field"><span>{text.email} <small>· {labels.optional}</small></span><input type="email" value={value.email} disabled={disabled} placeholder={text.emailPlaceholder}
      onChange={event => onChange({ ...value, email: event.target.value })} /></label>
    <label className="checkbox-field customer-consent"><input type="checkbox" checked={value.emailOptIn} disabled={disabled}
      onChange={event => onChange({ ...value, emailOptIn: event.target.checked })} />{text.promoOptIn}</label>
  </>
}
