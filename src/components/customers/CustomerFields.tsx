import { useI18n } from "../../i18n/I18nContext"
import type { CustomerPayload } from "../../api/customerApi"

export default function CustomerFields({ value, onChange, disabled }: {
  value: CustomerPayload; onChange: (value: CustomerPayload) => void; disabled: boolean
}) {
  const { copy } = useI18n()
  const text = copy.customersPage
  return <>
    <label>{text.name}<input required value={value.name} disabled={disabled} placeholder={text.namePlaceholder}
      onChange={event => onChange({ ...value, name: event.target.value })} /></label>
    <label>{text.phone}<input type="tel" value={value.phone} disabled={disabled} placeholder={text.phonePlaceholder}
      onChange={event => onChange({ ...value, phone: event.target.value })} /></label>
    <label>{text.email}<input type="email" value={value.email} disabled={disabled} placeholder={text.emailPlaceholder}
      onChange={event => onChange({ ...value, email: event.target.value })} /></label>
    <label className="checkbox-field"><input type="checkbox" checked={value.emailOptIn} disabled={disabled}
      onChange={event => onChange({ ...value, emailOptIn: event.target.checked })} />{text.promoOptIn}</label>
  </>
}
