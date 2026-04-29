import type { Language } from "../i18n/messages"

const presetCategoryOptions = [
  { key: "FOOD", fr: "Aliments", en: "Food", es: "Alimentos" },
  { key: "BEVERAGES", fr: "Boissons", en: "Beverages", es: "Bebidas" },
  { key: "CLOTHING", fr: "Vetements", en: "Clothing", es: "Ropa" },
  { key: "SHOES", fr: "Chaussures", en: "Shoes", es: "Zapatos" },
  { key: "ACCESSORIES", fr: "Accessoires", en: "Accessories", es: "Accesorios" },
  { key: "ELECTRONICS", fr: "Electronique", en: "Electronics", es: "Electronica" },
  { key: "HOME", fr: "Maison", en: "Home", es: "Hogar" },
  { key: "BEAUTY", fr: "Beaute", en: "Beauty", es: "Belleza" },
  { key: "HEALTH", fr: "Sante", en: "Health", es: "Salud" },
  { key: "PHARMACY", fr: "Pharmacie", en: "Pharmacy", es: "Farmacia" },
  { key: "OFFICE", fr: "Papeterie", en: "Stationery", es: "Papeleria" },
  { key: "TOYS", fr: "Jouets", en: "Toys", es: "Juguetes" },
  { key: "SPORTS", fr: "Sport", en: "Sports", es: "Deportes" },
  { key: "AUTO", fr: "Auto", en: "Auto", es: "Auto" },
  { key: "HARDWARE", fr: "Quincaillerie", en: "Hardware", es: "Ferreteria" },
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
