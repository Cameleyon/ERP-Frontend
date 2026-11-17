import { useEffect, useId, useState } from "react"
import { getEmailConsentPreference, updateEmailConsentPreference } from "../../api/emailConsentApi"
import { useI18n } from "../../i18n/I18nContext"
import ErrorMessage from "./ErrorMessage"

const copy = {
  fr: {
    title: "Préférences de courriel",
    productUpdates: "J’accepte de recevoir les nouvelles du produit et les offres de CAMELEYON Dynamics par courriel.",
    withdrawal: "Vous pouvez retirer votre consentement dans Profil.",
    save: "Enregistrer", saved: "Préférences enregistrées.", error: "Impossible de charger ou d’enregistrer vos préférences de courriel.",
  },
  en: {
    title: "Email preferences",
    productUpdates: "I agree to receive product updates and offers from CAMELEYON Dynamics by email.",
    withdrawal: "You can withdraw your consent in Profile.",
    save: "Save", saved: "Preferences saved.", error: "Could not load or save your email preferences.",
  },
  es: {
    title: "Preferencias de correo electrónico",
    productUpdates: "Acepto recibir novedades del producto y ofertas de CAMELEYON Dynamics por correo electrónico.",
    withdrawal: "Puedes retirar tu consentimiento en Perfil.",
    save: "Guardar", saved: "Preferencias guardadas.", error: "No se pudieron cargar o guardar tus preferencias de correo electrónico.",
  },
}

type Props = {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function EmailConsentCheckbox({ checked, onChange, disabled }: Props) {
  const { language } = useI18n()
  const id = useId()
  const text = copy[language]
  return (
    <div className="email-consent">
      <input id={id} type="checkbox" checked={checked} disabled={disabled} aria-describedby={`${id}-withdrawal`}
        onChange={event => onChange(event.target.checked)} />
      <div>
        <label htmlFor={id}>{text.productUpdates}</label>
        <small id={`${id}-withdrawal`}>{text.withdrawal}</small>
      </div>
    </div>
  )
}

export function EmailConsentPreferences() {
  const { language } = useI18n()
  const text = copy[language]
  const [saved, setSaved] = useState<boolean | null>(null)
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    let active = true
    getEmailConsentPreference().then(({ productUpdates }) => {
      if (!active) return
      setSaved(productUpdates)
      setChecked(productUpdates)
    }).catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [])

  async function save() {
    setBusy(true)
    setFailed(false)
    setConfirmed(false)
    try {
      const { productUpdates } = await updateEmailConsentPreference(checked)
      const matches = productUpdates === checked
      setSaved(productUpdates)
      setChecked(productUpdates)
      setConfirmed(matches)
      setFailed(!matches)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  if (saved === null) {
    return failed ? <ErrorMessage message={text.error} onDismiss={() => setFailed(false)} /> : null
  }

  return (
    <section className="card">
      <h3>{text.title}</h3>
      <EmailConsentCheckbox checked={checked} disabled={busy}
        onChange={value => { setChecked(value); setConfirmed(false) }} />
      <div className="form-actions">
        <button type="button" disabled={busy || checked === saved} onClick={save}>{text.save}</button>
      </div>
      {confirmed && <p role="status">{text.saved}</p>}
      {failed && <ErrorMessage message={text.error} onDismiss={() => setFailed(false)} />}
    </section>
  )
}
