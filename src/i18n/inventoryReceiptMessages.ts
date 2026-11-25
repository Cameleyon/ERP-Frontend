const messages = {
  INVALID_INVENTORY_QUANTITY_PRECISION: ["Enter a quantity with at most two decimal places.", "Saisissez une quantité avec au plus deux décimales.", "Ingrese una cantidad con un máximo de dos decimales."],
  INVALID_RECEIPT_COST_PRECISION: ["Enter a cost with at most four decimal places.", "Saisissez un coût avec au plus quatre décimales.", "Ingrese un costo con un máximo de cuatro decimales."],
  LEGACY_RECEIPT_QUANTITY_PRECISION: ["This receipt has a historical quantity that cannot be corrected to two decimal places without changing stock precision.", "La quantité historique de cette réception ne peut pas être corrigée à deux décimales sans modifier la précision du stock.", "La cantidad histórica de esta recepción no se puede corregir a dos decimales sin cambiar la precisión del inventario."],
  INVENTORY_QUANTITY_RANGE: ["Enter a smaller quantity.", "Saisissez une quantité plus petite.", "Ingrese una cantidad menor."],
  RECEIPT_COST_CONFIRMATION_REQUIRED: ["Review and confirm the acquisition costs before saving.", "Vérifiez et confirmez les coûts d’acquisition avant l’enregistrement.", "Revise y confirme los costos de adquisición antes de guardar."],
  RECEIPT_COST_CONFIRMATION_MISMATCH: ["The acquisition costs changed. Review them and confirm again.", "Les coûts d’acquisition ont changé. Vérifiez-les et confirmez à nouveau.", "Los costos de adquisición cambiaron. Revíselos y confirme nuevamente."],
  RECEIPT_INVALID_REQUEST: ["Check the receipt fields and try again.","Vérifiez les champs de la réception et réessayez.","Revise los campos de la recepción e inténtelo de nuevo."],
  RECEIPT_PRODUCT_REQUIRED: ["Select a product before saving.","Sélectionnez un produit avant d’enregistrer.","Seleccione un producto antes de guardar."],
  RECEIPT_PRODUCT_UNAVAILABLE: ["Select a product available to your company.","Sélectionnez un produit disponible pour votre entreprise.","Seleccione un producto disponible para su empresa."],
  RECEIPT_QUANTITY_POSITIVE: ["Enter a quantity greater than zero.","Saisissez une quantité supérieure à zéro.","Ingrese una cantidad mayor que cero."],
  RECEIPT_WHOLE_QUANTITY: ["Enter a whole-number quantity for this product.","Saisissez un nombre entier pour ce produit.","Ingrese una cantidad entera para este producto."],
  RECEIPT_COST_REQUIRED: ["Enter at least one acquisition cost.","Saisissez au moins un coût d’acquisition.","Ingrese al menos un costo de adquisición."],
  RECEIPT_RUBRIC_UNAVAILABLE: ["Select an active cost rubric from your company.","Sélectionnez une rubrique de coût active de votre entreprise.","Seleccione un rubro de costo activo de su empresa."],
  RECEIPT_DEDUCTION_UNSUPPORTED: ["Use an acquisition cost rubric that does not deduct from the total.","Utilisez une rubrique de coût qui ne déduit pas de montant du total.","Utilice un rubro de costo que no deduzca importes del total."],
  RECEIPT_COST_NONNEGATIVE: ["Enter zero or a positive amount for each cost.","Saisissez zéro ou un montant positif pour chaque coût.","Ingrese cero o un importe positivo para cada costo."],
  RECEIPT_TOTAL_POSITIVE: ["Enter costs with a total greater than zero.","Saisissez des coûts dont le total est supérieur à zéro.","Ingrese costos con un total mayor que cero."],
  RECEIPT_NOT_FOUND: ["This receipt is unavailable. Refresh the list and select it again.","Cette réception est indisponible. Actualisez la liste et sélectionnez-la à nouveau.","Esta recepción no está disponible. Actualice la lista y selecciónela nuevamente."],
  RECEIPT_SITE_UNAVAILABLE: ["Check that you have access to the selected site.","Vérifiez que vous avez accès au site sélectionné.","Compruebe que tiene acceso al sitio seleccionado."],
  RECEIPT_WITHDRAWAL_EXCEEDS_STOCK: ["Enter a withdrawal quantity no greater than the remaining quantity on the receipt.","Saisissez une quantité à retirer qui ne dépasse pas la quantité restante sur la réception.","Ingrese una cantidad de retiro que no supere la cantidad restante en la recepción."],
  RECEIPT_STOCK_NEGATIVE: ["The change would make stock negative. Check the quantity and the available stock.","Cette modification rendrait le stock négatif. Vérifiez la quantité et le stock disponible.","El cambio dejaría el stock en negativo. Revise la cantidad y el stock disponible."],
  RECEIPT_AUTH_REQUIRED: ["Sign in again to access inventory receipts.","Reconnectez-vous pour accéder aux réceptions.","Vuelva a iniciar sesión para acceder a las recepciones."],
  RECEIPT_ACCESS_DENIED: ["You do not have access to this inventory operation.","Vous n’avez pas accès à cette opération d’inventaire.","No tiene acceso a esta operación de inventario."],
  INVALID_RECEIPT_OPERATION_KEY: ["The receipt reference is invalid. Check the receipt list before entering it again.","La référence de la réception est invalide. Vérifiez la liste avant de la saisir à nouveau.","La referencia de recepción no es válida. Revise la lista antes de volver a registrarla."],
} as const

export function receiptErrorMessage(code: string, language: "en" | "fr" | "es", fallback: string) {
  if (!Object.prototype.hasOwnProperty.call(messages, code)) return fallback
  const translated = messages[code as keyof typeof messages]
  return translated[language === "fr" ? 1 : language === "es" ? 2 : 0]
}
