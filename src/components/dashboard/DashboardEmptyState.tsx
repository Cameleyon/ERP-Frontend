export default function DashboardEmptyState({ title, description }: { title: string; description?: string }) {
  return <div className="dashboard-empty"><strong>{title}</strong>{description && <p>{description}</p>}</div>
}
