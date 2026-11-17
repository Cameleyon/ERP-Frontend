import { useEffect, useState } from "react"
import { getEmailConsentAddress, getEmailConsentPreference, updateEmailConsentPreference } from "../../api/emailConsentApi"
import { useI18n } from "../../i18n/I18nContext"
import ErrorMessage from "./ErrorMessage"

const copy = {
  fr: {
    title: "Préférences de courriel",
    label: "J’accepte de recevoir les rappels facultatifs et les nouvelles du produit par courriel de CAMELEYON Dynamics.",
    withdrawal: "Vous pouvez retirer ce consentement dans Profil ou via le lien de désabonnement.",
    save: "Enregistrer", saved: "Préférences enregistrées.", error: "Impossible de charger ou d’enregistrer vos préférences de courriel.",
  },
  en: {
    title: "Email preferences",
    label: "I agree to receive optional reminders and product updates by email from CAMELEYON Dynamics.",
    withdrawal: "You can withdraw your consent in Profile or using the unsubscribe link.",
    save: "Save", saved: "Preferences saved.", error: "Could not load or save your email preferences.",
  },
  es: {
    title: "Preferencias de correo electrónico",
    label: "Acepto recibir recordatorios opcionales y novedades del producto por correo electrónico de CAMELEYON Dynamics.",
    withdrawal: "Puedes retirar tu consentimiento en Perfil o mediante el enlace para cancelar la suscripción.",
    save: "Guardar", saved: "Preferencias guardadas.", error: "No se pudieron cargar o guardar tus preferencias de correo electrónico.",
  },
}

type Props = {
  address: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function EmailConsentCheckbox({ address, checked, onChange, disabled }: Props) {
  const { language } = useI18n()
  const text = copy[language]
  return (
    <div>
      <label className="terms-acceptance">
        <input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} />
        <span>{text.label}</span>
      </label>
      {address && <small>{text.withdrawal} {address} · <a href="mailto:contact@cameleyondynamics.com">contact@cameleyondynamics.com</a></small>}
    </div>
  )
}

export function EmailConsentPreferences() {
  const { language } = useI18n()
  const text = copy[language]
  const [address, setAddress] = useState("")
  const [saved, setSaved] = useState<boolean | null>(null)
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([
      getEmailConsentAddress().catch(() => ""),
      getEmailConsentPreference(),
    ]).then(([disclosureAddress, { subscribed }]) => {
      if (!active) return
      setAddress(disclosureAddress)
      setSaved(subscribed)
      setChecked(subscribed)
    }).catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [])

  async function save() {
    setBusy(true)
    setFailed(false)
    setConfirmed(false)
    try {
      const { subscribed } = await updateEmailConsentPreference(checked, address)
      setSaved(subscribed)
      setChecked(subscribed)
      setConfirmed(subscribed === checked)
      setFailed(subscribed !== checked)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  if (saved === null || (!address && !saved)) {
    return failed ? <ErrorMessage message={text.error} onDismiss={() => setFailed(false)} /> : null
  }

  return (
    <section className="card">
      <h3>{text.title}</h3>
      <EmailConsentCheckbox address={address} checked={checked} disabled={busy}
        onChange={value => { setChecked(value); setConfirmed(false) }} />
      <div className="form-actions">
        <button type="button" disabled={busy || checked === saved} onClick={save}>{text.save}</button>
      </div>
      {confirmed && <p role="status">{text.saved}</p>}
      {failed && <ErrorMessage message={text.error} onDismiss={() => setFailed(false)} />}
    </section>
  )
}
