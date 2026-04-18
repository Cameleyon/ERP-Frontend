import { useI18n } from "../../i18n/I18nContext"

type Props = {
  value: string
}

export default function StatusBadge({ value }: Props) {
  const { language } = useI18n()

  const normalizedValue =
    value === "COMPLETED"
      ? language === "fr" ? "Terminée" : "Completed"
      : value === "CANCELLED"
        ? language === "fr" ? "Annulée" : "Cancelled"
        : value === "ACTIVE"
          ? language === "fr" ? "Actif" : "Active"
          : value === "INACTIVE"
            ? language === "fr" ? "Inactif" : "Inactive"
            : value

  const className =
    value === "COMPLETED"
      ? "status-badge status-completed"
      : value === "CANCELLED"
        ? "status-badge status-cancelled"
        : "status-badge status-default"

  return <span className={className}>{normalizedValue}</span>
}
