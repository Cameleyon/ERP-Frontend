import { useEffect, useState } from "react"
import { useI18n } from "../../i18n/I18nContext"

const start = "2026-11-18T02:00:00Z"
const end = "2026-11-18T03:00:00Z"
const endsAt = Date.parse(end)

const messages = {
  en: {
    title: "Scheduled maintenance",
    date: "November 18, 2026",
    impact: "No interruption to CAMELEYON-ERP is expected.",
  },
  fr: {
    title: "Maintenance planifiée",
    date: "18 novembre 2026",
    impact: "Aucune interruption de CAMELEYON-ERP n’est prévue.",
  },
  es: {
    title: "Mantenimiento programado",
    date: "18 de noviembre de 2026",
    impact: "No se prevé ninguna interrupción de CAMELEYON-ERP.",
  },
}

export default function MaintenanceNotice() {
  const { language } = useI18n()
  const [visible, setVisible] = useState(() => Date.now() < endsAt)

  useEffect(() => {
    if (!visible) return
    const timer = window.setInterval(() => {
      if (Date.now() >= endsAt) setVisible(false)
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [visible])

  if (!visible) return null

  const { title, date, impact } = messages[language]
  return (
    <aside className="maintenance-notice" aria-label={title}>
      <strong>{title}</strong>
      {" · "}<time dateTime={start}>{date}, 02:00</time>
      {"–"}<time dateTime={end}>03:00 UTC</time>
      {". "}{impact}
    </aside>
  )
}
