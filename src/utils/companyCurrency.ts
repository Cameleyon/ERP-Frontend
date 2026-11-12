export const COMPANY_CURRENCY_REQUIRED_EVENT = "cameleyon:company-currency-required"
export const COMPANY_CURRENCY_REQUIRED_CODE = "COMPANY_CURRENCY_REQUIRED"

export class CompanyCurrencyRequiredError extends Error {}

export function currencyRequiredText(language: string) {
  return language === "fr" ? {
    title: "Devise de l'entreprise non renseignée",
    message: "Pour effectuer une vente ou enregistrer des coûts, veuillez d'abord définir la devise de votre entreprise dans Profil.",
    staffMessage: "La devise de l'entreprise n'est pas encore définie. Demandez au propriétaire ou à un administrateur de la renseigner dans Profil avant d'effectuer une vente ou d'enregistrer des coûts.",
    action: "Définir la devise", close: "Fermer",
  } : language === "es" ? {
    title: "Moneda de la empresa no configurada",
    message: "Antes de realizar una venta o registrar costos, defina la moneda de su empresa en Perfil.",
    staffMessage: "La moneda de la empresa no está configurada. Pida al propietario o a un administrador que la defina en Perfil antes de realizar ventas o registrar costos.",
    action: "Definir moneda", close: "Cerrar",
  } : {
    title: "Business currency not configured",
    message: "Before making a sale or recording costs, please set your business currency in Profile.",
    staffMessage: "The business currency is not configured. Ask the owner or an administrator to set it in Profile before making sales or recording costs.",
    action: "Set currency", close: "Close",
  }
}

export async function checkCompanyCurrencyResponse(response: Response) {
  if (response.status !== 409) return
  let body: { code?: string; message?: string }
  try { body = await response.clone().json() } catch { return }
  if (body?.code !== COMPANY_CURRENCY_REQUIRED_CODE && body?.message !== COMPANY_CURRENCY_REQUIRED_CODE) return
  window.dispatchEvent(new CustomEvent(COMPANY_CURRENCY_REQUIRED_EVENT))
  throw new CompanyCurrencyRequiredError(currencyRequiredText(document.documentElement.lang).message)
}
