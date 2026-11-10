import { useI18n } from "../../i18n/I18nContext"
import { MarketingConsentWithdrawal } from "./MarketingConsent"

export default function SupportContact() {
  const { language } = useI18n()
  const label = language === "fr" ? "Assistance technique" : language === "es" ? "Asistencia técnica" : "Technical support"
  const response = language === "fr" ? "Réponse sous 24 heures." : language === "es" ? "Respuesta en un plazo de 24 horas." : "Response within 24 hours."

  return (
    <p className="support-contact">
      <span>{label} : <a href="mailto:contact@cameleyondynamics.com">contact@cameleyondynamics.com</a></span>
      <span>{response}</span>
      <MarketingConsentWithdrawal />
    </p>
  )
}
