import { useEffect, useEffectEvent, useRef } from "react"

export type MenuSiteSelection = { site: number | null; revision: number }

export function useMenuSiteChange(selection: MenuSiteSelection | undefined, onChange: (site: number | null) => void) {
  const revision = selection?.revision ?? 0
  const previous = useRef(revision)
  const apply = useEffectEvent(() => onChange(selection?.site ?? null))
  useEffect(() => {
    if (revision === previous.current) return
    previous.current = revision
    apply()
  }, [revision])
}
