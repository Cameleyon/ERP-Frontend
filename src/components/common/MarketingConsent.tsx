import { useSyncExternalStore } from "react"
import { useAuth } from "../../auth/AuthContext"
import { useI18n } from "../../i18n/I18nContext"
import { metaPixel } from "../../utils/metaPixel"

const tracker = metaPixel

export default function MarketingConsent() {
  if (!tracker?.isAvailable()) return null
  return <ConsentControls tracker={tracker} />
}

function ConsentControls({ tracker }: { tracker: NonNullable<typeof metaPixel> }) {
  const { isAuthenticated, isLoading } = useAuth()
  const { language } = useI18n()
  const choice = useSyncExternalStore(tracker.subscribe, tracker.readConsent, () => null)
  if (isLoading || isAuthenticated || choice !== null) return null
  const text = language === "fr" ? {
    title: "Préférences marketing",
    description: "Autoriser les cookies à des fins de mesure marketing ?",
    allow: "Accepter", decline: "Refuser", privacy: "Confidentialité",
  } : language === "es" ? {
    title: "Preferencias de marketing",
    description: "¿Permitir cookies para medir el rendimiento de marketing?",
    allow: "Aceptar", decline: "Rechazar", privacy: "Privacidad",
  } : {
    title: "Marketing preferences",
    description: "Allow cookies for marketing measurement?",
    allow: "Accept", decline: "Decline", privacy: "Privacy details",
  }

  return (
    <aside className="marketing-preferences" aria-label={text.title}>
      <section className="marketing-preferences-panel" aria-labelledby="marketing-preferences-title">
        <h2 id="marketing-preferences-title">{text.title}</h2>
        <p>{text.description} <a href={`/${language}/privacy`} target="_blank" rel="noopener noreferrer">{text.privacy}</a></p>
        <div className="marketing-preferences-actions">
          <button type="button" onClick={() => tracker.chooseConsent("refused")}>{text.decline}</button>
          <button type="button" onClick={() => tracker.chooseConsent("accepted")}>{text.allow}</button>
        </div>
      </section>
    </aside>
  )
}

export function MarketingConsentWithdrawal() {
  if (!tracker?.isAvailable()) return null
  return <WithdrawalLink tracker={tracker} />
}

function WithdrawalLink({ tracker }: { tracker: NonNullable<typeof metaPixel> }) {
  const { language } = useI18n()
  const choice = useSyncExternalStore(tracker.subscribe, tracker.readConsent, () => null)
  if (choice !== "accepted") return null
  const label = language === "fr" ? "Retirer le consentement marketing"
    : language === "es" ? "Retirar el consentimiento de marketing"
    : "Withdraw marketing consent"
  return <button type="button" className="marketing-withdrawal-link" onClick={() => tracker.chooseConsent("refused")}>{label}</button>
}
