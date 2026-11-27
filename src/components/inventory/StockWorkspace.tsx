import type { ReactNode, Ref } from "react"
import "../layout/internalTokens.css"
import "./stockWorkspace.css"

export function StockHeading({ title, description, headingRef, children }: {
  title: string; description?: string; headingRef?: Ref<HTMLHeadingElement>; children?: ReactNode
}) {
  return <div className="stock-heading">
    <div><h1 ref={headingRef} tabIndex={-1}>{title}</h1>{description && <p>{description}</p>}</div>
    {children && <div className="stock-actions">{children}</div>}
  </div>
}

export function StockFacts({ entries }: { entries: readonly (readonly [string, ReactNode])[] }) {
  return <dl className="stock-facts">{entries.map(([term, value]) =>
    <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl>
}

export function StockStatus({ active, children }: { active: boolean; children: ReactNode }) {
  return <span className={active ? "stock-status is-active" : "stock-status"}>{children}</span>
}
