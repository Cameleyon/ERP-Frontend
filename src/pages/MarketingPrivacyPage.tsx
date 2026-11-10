import { useEffect, useRef, useSyncExternalStore } from "react"
import { useI18n } from "../i18n/I18nContext"
import { metaPixel } from "../utils/metaPixel"

const contact = "contact@cameleyondynamics.com"
const notices = {
  en: {
    title: "Privacy and marketing cookies",
    home: "Back to home",
    purpose: "Why we use marketing cookies",
    purposeText: "With your permission, CAMELEYON Dynamics uses marketing cookies and similar technologies to measure which advertising campaigns lead to visits and confirmed registrations on CAMELEYON ERP.",
    data: "What may be shared",
    dataText: "Third-party advertising measurement services may receive the page address, campaign identifiers, cookie identifiers, browser and device information, IP address and measurement events, such as a visit or a confirmed registration. We do not send names, email addresses, passwords, verification codes or payment details through this tracking.",
    choice: "Your choice",
    choiceText: "Marketing measurement is off unless you accept it. Refusing does not affect access to the service. Your choice lasts for the current tab session. To withdraw consent, open Privacy from the footer in the tab where you accepted. Withdrawal stops future tracking in that tab but does not undo data already sent.",
    withdraw: "Withdraw marketing consent",
    disabled: "Marketing measurement is off for this session.",
    questions: "Contact",
    questionsText: "For questions about marketing data, recipients, retention or your privacy choices, email us at",
  },
  fr: {
    title: "Confidentialité et cookies marketing",
    home: "Retour à l’accueil",
    purpose: "Pourquoi nous utilisons ces cookies",
    purposeText: "Avec votre accord, CAMELEYON Dynamics utilise des cookies et des technologies similaires pour mesurer quelles campagnes publicitaires génèrent des visites et des inscriptions confirmées sur CAMELEYON ERP.",
    data: "Ce qui peut être partagé",
    dataText: "Des services tiers de mesure publicitaire peuvent recevoir l’adresse de la page, les identifiants de campagne et de cookies, des informations sur le navigateur et l’appareil, l’adresse IP et des événements de mesure, comme une visite ou une inscription confirmée. Ce suivi ne transmet ni nom, ni adresse e-mail, ni mot de passe, ni code de vérification, ni données de paiement.",
    choice: "Votre choix",
    choiceText: "La mesure marketing reste désactivée sans votre accord. Un refus ne change pas votre accès au service. Votre choix est conservé pendant la session de l’onglet. Pour retirer votre accord, ouvrez Confidentialité depuis le pied de page dans l’onglet où vous avez accepté. Le retrait arrête le suivi dans cet onglet, sans annuler les envois déjà effectués.",
    withdraw: "Retirer le consentement marketing",
    disabled: "La mesure marketing est désactivée pour cette session.",
    questions: "Contact",
    questionsText: "Pour toute question sur les données marketing, leurs destinataires, leur conservation ou vos choix de confidentialité, écrivez-nous à",
  },
  es: {
    title: "Privacidad y cookies de marketing",
    home: "Volver al inicio",
    purpose: "Por qué usamos estas cookies",
    purposeText: "Con tu permiso, CAMELEYON Dynamics usa cookies y tecnologías similares para medir qué campañas publicitarias generan visitas y registros confirmados en CAMELEYON ERP.",
    data: "Qué información se puede compartir",
    dataText: "Los servicios de terceros que miden el rendimiento publicitario pueden recibir la dirección de la página, identificadores de campañas y cookies, datos del navegador y del dispositivo, la dirección IP y eventos como una visita o un registro confirmado. Este seguimiento no envía nombres, correos electrónicos, contraseñas, códigos de verificación ni datos de pago.",
    choice: "Tu elección",
    choiceText: "La medición de marketing está desactivada si no la aceptas. Rechazarla no afecta el acceso al servicio. Tu elección se mantiene durante la sesión de la pestaña. Para retirar tu consentimiento, abre Privacidad desde el pie de página en la pestaña donde lo aceptaste. Esto detiene el seguimiento en esa pestaña sin anular los datos ya enviados.",
    withdraw: "Retirar el consentimiento de marketing",
    disabled: "La medición de marketing está desactivada para esta sesión.",
    questions: "Contacto",
    questionsText: "Si tienes preguntas sobre los datos de marketing, sus destinatarios, su conservación o tus preferencias de privacidad, escríbenos a",
  },
}

function MarketingPrivacyChoice({ tracker, text }: {
  tracker: NonNullable<typeof metaPixel>
  text: (typeof notices)[keyof typeof notices]
}) {
  const choice = useSyncExternalStore(tracker.subscribe, tracker.readConsent, () => null)
  const statusRef = useRef<HTMLParagraphElement>(null)
  return (
    <div className="marketing-privacy-choice">
      {choice === "accepted" && (
        <button type="button" onClick={() => {
          tracker.chooseConsent("refused")
          statusRef.current?.focus()
        }}>{text.withdraw}</button>
      )}
      <p role="status" tabIndex={-1} ref={statusRef}>{choice === "refused" ? text.disabled : ""}</p>
    </div>
  )
}

export default function MarketingPrivacyPage() {
  const { language } = useI18n()
  const text = notices[language]

  useEffect(() => {
    document.title = `${text.title} | CAMELEYON ERP`
  }, [text.title])

  return (
    <main className="public-page marketing-privacy-page">
      <header>
        <a className="public-brand-link" href={`/${language}`}>
          <img src="/icon.png" alt="" width={38} height={38} />
          <span>CAMELEYON ERP</span>
        </a>
      </header>
      <h1>{text.title}</h1>
      <section aria-labelledby="privacy-purpose">
        <h2 id="privacy-purpose">{text.purpose}</h2>
        <p>{text.purposeText}</p>
      </section>
      <section aria-labelledby="privacy-data">
        <h2 id="privacy-data">{text.data}</h2>
        <p>{text.dataText}</p>
      </section>
      <section aria-labelledby="privacy-choice">
        <h2 id="privacy-choice">{text.choice}</h2>
        <p>{text.choiceText}</p>
        {metaPixel?.isAvailable() && <MarketingPrivacyChoice tracker={metaPixel} text={text} />}
      </section>
      <section aria-labelledby="privacy-contact">
        <h2 id="privacy-contact">{text.questions}</h2>
        <p>{text.questionsText} <a href={`mailto:${contact}`}>{contact}</a>.</p>
      </section>
      <a href={`/${language}`}>{text.home}</a>
    </main>
  )
}
