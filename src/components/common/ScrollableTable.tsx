import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { useI18n } from "../../i18n/I18nContext"

export default function ScrollableTable({ headingId, children }: { headingId: string; children: ReactNode }) {
  const { copy } = useI18n()
  const viewportId = useId()
  const viewportRef = useRef<HTMLDivElement>(null)
  const [scroll, setScroll] = useState({ left: false, right: false })
  const scrollable = scroll.left || scroll.right

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = viewport
      const left = scrollLeft > 1
      const right = scrollWidth - clientWidth - scrollLeft > 1
      setScroll((previous) => previous.left === left && previous.right === right ? previous : { left, right })
    }
    const observer = new ResizeObserver(update)
    observer.observe(viewport)
    const table = viewport.querySelector("table")
    if (table) observer.observe(table)
    viewport.addEventListener("scroll", update, { passive: true })
    return () => {
      observer.disconnect()
      viewport.removeEventListener("scroll", update)
    }
  }, [])

  function scrollTable(direction: -1 | 1) {
    const viewport = viewportRef.current
    if (viewport) viewport.scrollBy({ left: direction * viewport.clientWidth * 0.85 })
  }

  return (
    <>
      {scrollable && (
        <div className="table-scroll-actions">
          <button type="button" className="secondary-button" aria-label={copy.common.scrollTableLeft}
            title={copy.common.scrollTableLeft} aria-controls={viewportId} disabled={!scroll.left} onClick={() => scrollTable(-1)}>
            <span aria-hidden="true">←</span>
          </button>
          <button type="button" className="secondary-button" aria-label={copy.common.scrollTableRight}
            title={copy.common.scrollTableRight} aria-controls={viewportId} disabled={!scroll.right} onClick={() => scrollTable(1)}>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      )}
      <div className="scrollable-table" id={viewportId} ref={viewportRef} role="region"
        aria-labelledby={headingId} tabIndex={scrollable ? 0 : undefined}>
        {children}
      </div>
    </>
  )
}
