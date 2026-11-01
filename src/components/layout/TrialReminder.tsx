import { useEffect, useState } from "react"
import { useAuth } from "../../auth/AuthContext"
import { useI18n } from "../../i18n/I18nContext"
import { getCompanySubscription, type CompanySubscriptionResponse } from "../../api/companySubscriptionApi"

export default function TrialReminder() {
  const { user, token } = useAuth()
  const { language } = useI18n()
  const [subscription, setSubscription] = useState<{
    companyId: number
    value: CompanySubscriptionResponse
  } | null>(null)
  const [now, setNow] = useState(Date.now)
  const companyId = user?.companyId

  useEffect(() => {
    if (!companyId) return
    let cancelled = false

    async function refresh() {
      try {
        const value = await getCompanySubscription()
        if (!cancelled) {
          setSubscription({ companyId: companyId!, value })
          setNow(Date.now())
        }
      } catch {
        if (!cancelled) setSubscription(null)
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible") void refresh()
    }

    void refresh()
    const refreshTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh()
    }, 5 * 60_000)
    const clockTimer = window.setInterval(() => setNow(Date.now()), 60_000)
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      cancelled = true
      window.clearInterval(refreshTimer)
      window.clearInterval(clockTimer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [companyId, token])

  const trial = subscription && subscription.companyId === companyId ? subscription.value : null
  if (!trial || trial.status !== "TRIAL") return null

  const end = new Date(trial.accessEndAt).getTime()
  const days = Math.ceil((end - now) / 86_400_000)
  if (!Number.isFinite(days) || days <= 0) return null

  const message = language === "fr"
    ? `Essai gratuit : ${days} ${days === 1 ? "jour restant" : "jours restants"}.`
    : language === "es"
      ? `Prueba gratuita: ${days} ${days === 1 ? "día restante" : "días restantes"}.`
      : `Free trial: ${days} ${days === 1 ? "day remaining" : "days remaining"}.`

  return (
    <div className={`trial-reminder${days <= 7 ? " trial-reminder-ending" : ""}`} role="status">
      <strong>{message}</strong>
    </div>
  )
}
