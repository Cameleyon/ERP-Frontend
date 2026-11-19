import { useEffect, useRef, type ReactNode } from "react"

export default function ProfileSection({ title, children, reveal = false }: {
  title: string; children: ReactNode; reveal?: boolean
}) {
  const ref = useRef<HTMLDetailsElement>(null)
  useEffect(() => { if (reveal && ref.current) ref.current.open = true }, [reveal])
  return <details className="profile-section" ref={ref}>
    <summary><h3>{title}</h3></summary>
    <div className="profile-section-body">{children}</div>
  </details>
}
