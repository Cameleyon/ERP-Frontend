export const salesWorkspaceCopy = {
  en: {
    summary: "Sale summary", viewSummary: "View sale summary", customerPayment: "Customer and payment",
    finalTotalNote: "Tax and the final total appear on the recorded sale.", recorded: "Sale recorded",
    recordedTotals: "Recorded totals", nextSale: "Start next sale", back: "Back to Sales History",
    filters: "Date filters", transaction: "Transaction information", products: "Products sold",
    business: "Recorded business amounts", cancellation: "Sale cancellation", review: "Review cancellation",
    requestTitle: "Request cancellation?", requestNote: "The sale stays recorded until an administrator approves the request.",
    approveTitle: "Approve cancellation?", rejectTitle: "Reject cancellation?",
    rejectNote: "The request will be rejected and the sale will stay recorded.",
    restoreNote: "This cancels the recorded sale and restores the stock through the existing inventory process.",
  },
  fr: {
    summary: "Résumé de la vente", viewSummary: "Voir le résumé de la vente", customerPayment: "Client et paiement",
    finalTotalNote: "Les taxes et le total final figurent sur la vente enregistrée.", recorded: "Vente enregistrée",
    recordedTotals: "Montants enregistrés", nextSale: "Commencer une autre vente", back: "Retour à l’historique des ventes",
    filters: "Filtres de dates", transaction: "Informations sur la transaction", products: "Produits vendus",
    business: "Coûts et bénéfices enregistrés", cancellation: "Annulation de la vente", review: "Examiner l’annulation",
    requestTitle: "Demander l’annulation ?", requestNote: "La vente reste enregistrée jusqu’à l’approbation par un administrateur.",
    approveTitle: "Approuver l’annulation ?", rejectTitle: "Rejeter l’annulation ?",
    rejectNote: "La demande sera rejetée et la vente restera enregistrée.",
    restoreNote: "La vente sera annulée et le stock sera rétabli.",
  },
  es: {
    summary: "Resumen de la venta", viewSummary: "Ver resumen de la venta", customerPayment: "Cliente y pago",
    finalTotalNote: "Los impuestos y el total final figuran en la venta registrada.", recorded: "Venta registrada",
    recordedTotals: "Importes registrados", nextSale: "Iniciar otra venta", back: "Volver al historial de ventas",
    filters: "Filtros de fechas", transaction: "Información de la transacción", products: "Productos vendidos",
    business: "Costos y ganancias registrados", cancellation: "Cancelación de la venta", review: "Revisar cancelación",
    requestTitle: "¿Solicitar la cancelación?", requestNote: "La venta seguirá registrada hasta que un administrador apruebe la solicitud.",
    approveTitle: "¿Aprobar la cancelación?", rejectTitle: "¿Rechazar la cancelación?",
    rejectNote: "Se rechazará la solicitud y la venta seguirá registrada.",
    restoreNote: "Se cancelará la venta y se restablecerá el inventario.",
  },
} as const

export function salePaymentLabel(method: string | null, labels: { cash: string; creditCard: string; debitCard: string }) {
  if (method === "CASH") return labels.cash
  if (method === "CREDIT_CARD") return labels.creditCard
  if (method === "DEBIT_CARD") return labels.debitCard
  return method || "-"
}
