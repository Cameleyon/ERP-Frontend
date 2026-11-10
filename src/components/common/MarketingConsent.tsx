import { useState, useSyncExternalStore } from "react"
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
  const [expanded, setExpanded] = useState(false)
  const text = language === "fr" ? {
    title: "Préférences publicitaires",
    description: "Avec votre accord, le pixel Meta utilise des cookies pour mesurer les visites et les inscriptions confirmées liées à nos publicités Facebook et Instagram. Vous pouvez refuser ou changer d’avis sans perdre l’accès à l’application.",
    allow: "Accepter", decline: "Refuser", privacy: "Confidentialité de Meta",
    accepted: "Mesure publicitaire autorisée.", refused: "Mesure publicitaire refusée.",
  } : language === "es" ? {
    title: "Preferencias de publicidad",
    description: "Con tu permiso, el píxel de Meta usa cookies para medir las visitas y los registros confirmados relacionados con nuestros anuncios de Facebook e Instagram. Puedes rechazarlo o cambiar de opinión sin perder el acceso a la aplicación.",
    allow: "Aceptar", decline: "Rechazar", privacy: "Privacidad de Meta",
    accepted: "Medición publicitaria permitida.", refused: "Medición publicitaria rechazada.",
  } : {
    title: "Advertising preferences",
    description: "With your permission, Meta Pixel uses cookies to measure visits and confirmed registrations related to our Facebook and Instagram ads. You can decline or change your choice without losing access to the app.",
    allow: "Accept", decline: "Decline", privacy: "Meta privacy policy",
    accepted: "Ad measurement allowed.", refused: "Ad measurement declined.",
  }

  if (isLoading) return null
  const open = expanded || (!isAuthenticated && choice === null)

  function choose(next: "accepted" | "refused") {
    tracker.chooseConsent(next)
    setExpanded(false)
  }

  return (
    <aside className="marketing-preferences" aria-label={text.title}>
      {open ? (
        <section className="marketing-preferences-panel" aria-labelledby="marketing-preferences-title">
          <h2 id="marketing-preferences-title">{text.title}</h2>
          <p>{text.description} <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noreferrer">{text.privacy}</a></p>
          {choice && <p>{choice === "accepted" ? text.accepted : text.refused}</p>}
          <div className="marketing-preferences-actions">
            <button type="button" onClick={() => choose("refused")}>{text.decline}</button>
            <button type="button" onClick={() => choose("accepted")}>{text.allow}</button>
          </div>
        </section>
      ) : (
        <button type="button" className="marketing-preferences-toggle" onClick={() => setExpanded(true)}>
          {text.title}
        </button>
      )}
    </aside>
  )
}
