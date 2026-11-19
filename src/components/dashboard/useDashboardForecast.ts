import { useEffect, useMemo, useState } from "react"
import { getCurrentForecast, type WeeklyForecastResponse } from "../../api/forecastApi"
import { ForecastSessionCache } from "../../utils/dashboardForecast"

export function useDashboardForecast(session: string, scope: string, enabled: boolean, locationId: number | null) {
  // Lifetime is the authenticated dashboard instance; nothing financial is persisted in browser storage.
  const cache = useMemo(() => ({ session, requests: new ForecastSessionCache<WeeklyForecastResponse>() }), [session])
  const [state, setState] = useState<{ cache: typeof cache; scope: string; data: WeeklyForecastResponse | null; failed: boolean } | null>(null)
  useEffect(() => {
    if (!enabled) return
    let active = true
    let timer: number | undefined
    const schedule = (delay: number) => { window.clearTimeout(timer); timer = window.setTimeout(refresh, delay) }
    const refresh = () => {
      window.clearTimeout(timer)
      void cache.requests.load(scope, () => getCurrentForecast(locationId, AbortSignal.timeout(15_000))).then(
        data => {
          if (!active) return
          setState(previous => previous?.cache === cache && previous.scope === scope && previous.data === data && !previous.failed
            ? previous : { cache, scope, data, failed: false })
          schedule(cache.requests.remainingFreshness(scope))
        },
        () => { if (active) { setState({ cache, scope, data: null, failed: true }); schedule(60_000) } },
      )
    }
    refresh()
    const onVisible = () => { if (document.visibilityState === "visible") refresh() }
    window.addEventListener("focus", refresh)
    document.addEventListener("visibilitychange", onVisible)
    return () => { active = false; window.clearTimeout(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", onVisible) }
  }, [cache, scope, enabled, locationId])
  if (!enabled) return { data: null, failed: false, loading: false }
  if (state?.scope !== scope || state.cache !== cache) return { data: null, failed: false, loading: true }
  if (!state.failed && !cache.requests.isFresh(scope)) return { data: null, failed: false, loading: true }
  return { data: state.data, failed: state.failed, loading: false }
}
