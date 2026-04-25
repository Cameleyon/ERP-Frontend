import { useI18n } from "../../i18n/I18nContext"

type Props = {
  value: string
}

export default function StatusBadge({ value }: Props) {
  const { copy } = useI18n()

  const normalizedValue =
    value === "COMPLETED"
      ? copy.common.statusCompleted
      : value === "CANCELLED"
        ? copy.common.statusCancelled
        : value === "ACTIVE"
          ? copy.common.statusActive
          : value === "INACTIVE"
            ? copy.common.statusInactive
            : value

  const className =
    value === "COMPLETED"
      ? "status-badge status-completed"
      : value === "CANCELLED"
        ? "status-badge status-cancelled"
        : "status-badge status-default"

  return <span className={className}>{normalizedValue}</span>
}
