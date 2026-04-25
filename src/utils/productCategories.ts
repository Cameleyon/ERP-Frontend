import type { Language } from "../i18n/messages"

const presetCategoryOptions = [
  { key: "GROCERIES", fr: "Epicerie", en: "Groceries", es: "Abarrotes" },
  { key: "BEAUTY", fr: "Beaute et soins", en: "Beauty and personal care", es: "Belleza y cuidado personal" },
  { key: "HOUSEHOLD", fr: "Maison et entretien", en: "Household supplies", es: "Hogar y mantenimiento" },
  { key: "ELECTRONICS", fr: "Electronique", en: "Electronics", es: "Electronica" },
  { key: "CLOTHING", fr: "Vetements et accessoires", en: "Clothing and accessories", es: "Ropa y accesorios" },
  { key: "OFFICE", fr: "Papeterie et bureau", en: "Office and stationery", es: "Papeleria y oficina" },
  { key: "PHARMACY", fr: "Pharmacie", en: "Pharmacy", es: "Farmacia" },
  { key: "HARDWARE", fr: "Quincaillerie", en: "Hardware", es: "Ferreteria" },
  { key: "RESTAURANT", fr: "Restaurant et cuisine", en: "Restaurant and kitchen", es: "Restaurante y cocina" },
  { key: "SERVICES", fr: "Services", en: "Services", es: "Servicios" },
] as const

export function getLocalizedPresetCategories(language: Language) {
  return presetCategoryOptions.map((option) => ({
    key: option.key,
    label: option[language],
  }))
}

export function findPresetCategoryKey(category: string) {
  const normalizedCategory = category.trim().toLowerCase()

  if (!normalizedCategory) {
    return ""
  }

  const matchedOption = presetCategoryOptions.find((option) =>
    option.fr.toLowerCase() === normalizedCategory ||
    option.en.toLowerCase() === normalizedCategory ||
    option.es.toLowerCase() === normalizedCategory,
  )

  return matchedOption?.key ?? ""
}
