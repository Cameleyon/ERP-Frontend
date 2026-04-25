export type CostRubricLanguage = "fr" | "en"

export type DefaultCostRubricOption = {
  code: string
  displayOrder: number
  fr: string
  en: string
}

export const DEFAULT_COST_RUBRIC_OPTIONS: DefaultCostRubricOption[] = [
  { code: "COST_OF_GOODS", displayOrder: 0, fr: "Cout des marchandises", en: "Cost of goods" },
  { code: "TRANSPORT", displayOrder: 10, fr: "Transport", en: "Transport" },
  { code: "STORAGE", displayOrder: 20, fr: "Entreposage", en: "Storage" },
  { code: "HANDLING", displayOrder: 30, fr: "Manutention", en: "Handling" },
]

export function getLocalizedCostRubricName(code: string, fallbackName: string, language: CostRubricLanguage) {
  const matchedOption = DEFAULT_COST_RUBRIC_OPTIONS.find((option) => option.code === code)
  if (!matchedOption) {
    return fallbackName
  }

  return language === "fr" ? matchedOption.fr : matchedOption.en
}
