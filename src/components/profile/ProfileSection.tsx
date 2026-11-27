import type { ReactNode } from "react"

export default function ProfileSection({ title, children, collapsible = false }: {
  title: string; children: ReactNode; collapsible?: boolean
}) {
  if (collapsible) return <details className="profile-section stock-panel admin-disclosure">
    <summary>{title}</summary>
    <div className="profile-section-body">{children}</div>
  </details>
  return <section className="profile-section stock-panel">
    <h2>{title}</h2>
    <div className="profile-section-body">{children}</div>
  </section>
}
