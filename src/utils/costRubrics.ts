export type CostRubricLanguage = "fr" | "en" | "es"

export type DefaultCostRubricOption = {
  code: string
  displayOrder: number
  fr: string
  en: string
  es: string
}

export const DEFAULT_COST_RUBRIC_OPTIONS: DefaultCostRubricOption[] = [
  { code: "COST_OF_GOODS", displayOrder: 0, fr: "Cout des marchandises", en: "Cost of goods", es: "Costo de mercancias" },
  { code: "TRANSPORT", displayOrder: 10, fr: "Transport", en: "Transport", es: "Transporte" },
  { code: "STORAGE", displayOrder: 20, fr: "Entreposage", en: "Storage", es: "Almacenamiento" },
  { code: "HANDLING", displayOrder: 30, fr: "Manutention", en: "Handling", es: "Manipulacion" },
]

export function getLocalizedCostRubricName(code: string, fallbackName: string, language: CostRubricLanguage) {
  const matchedOption = DEFAULT_COST_RUBRIC_OPTIONS.find((option) => option.code === code)
  if (!matchedOption) {
    return fallbackName
  }

  if (language === "fr") {
    return matchedOption.fr
  }

  if (language === "es") {
    return matchedOption.es
  }

  return matchedOption.en
}
