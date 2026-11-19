import type { Language } from "../../i18n/messages"

const labels = {
  en: {
    ADMIN: "Administrator", CASHIER: "Cashier", SUPER_ADMIN: "Platform administrator",
    TRIAL: "Trial", ACTIVE: "Active", PAST_DUE: "Payment overdue", SUSPENDED: "Suspended", CANCELLED: "Cancelled",
    MONTHLY: "Monthly", YEARLY: "Yearly", AUTOMATIC_CARD: "Automatic card payment", MANUAL: "Manual",
    CARD: "Card", INVOICE: "Invoice", BANK_TRANSFER: "Bank transfer", CASH: "Cash", OTHER: "Other", NONE: "None",
  },
  fr: {
    ADMIN: "Administrateur", CASHIER: "Caissier", SUPER_ADMIN: "Administrateur de plateforme",
    TRIAL: "Essai", ACTIVE: "Actif", PAST_DUE: "Paiement en retard", SUSPENDED: "Suspendu", CANCELLED: "Annulé",
    MONTHLY: "Mensuel", YEARLY: "Annuel", AUTOMATIC_CARD: "Paiement automatique par carte", MANUAL: "Manuel",
    CARD: "Carte", INVOICE: "Facture", BANK_TRANSFER: "Virement bancaire", CASH: "Espèces", OTHER: "Autre", NONE: "Aucun",
  },
  es: {
    ADMIN: "Administrador", CASHIER: "Cajero", SUPER_ADMIN: "Administrador de la plataforma",
    TRIAL: "Período de prueba", ACTIVE: "Activo", PAST_DUE: "Pago vencido", SUSPENDED: "Suspendido", CANCELLED: "Cancelado",
    MONTHLY: "Mensual", YEARLY: "Anual", AUTOMATIC_CARD: "Pago automático con tarjeta", MANUAL: "Manual",
    CARD: "Tarjeta", INVOICE: "Factura", BANK_TRANSFER: "Transferencia bancaria", CASH: "Efectivo", OTHER: "Otro", NONE: "Ninguno",
  },
}

export function profileValueLabel(value: string | null | undefined, language: Language) {
  if (!value) return "-"
  if (value === "STRIPE") return "Stripe"
  return labels[language][value as keyof typeof labels.en] ?? value
}
