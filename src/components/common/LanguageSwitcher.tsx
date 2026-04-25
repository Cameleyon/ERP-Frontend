import { useI18n } from "../../i18n/I18nContext"

type Props = {
  className?: string
}

export default function LanguageSwitcher({ className = "" }: Props) {
  const { language, setLanguage, copy } = useI18n()

  return (
    <div className={`language-switcher ${className}`.trim()}>
      <button
        type="button"
        className={`language-switcher-button ${language === "fr" ? "active" : ""}`}
        onClick={() => setLanguage("fr")}
      >
        {copy.language.fr}
      </button>
      <button
        type="button"
        className={`language-switcher-button ${language === "en" ? "active" : ""}`}
        onClick={() => setLanguage("en")}
      >
        {copy.language.en}
      </button>
      <button
        type="button"
        className={`language-switcher-button ${language === "es" ? "active" : ""}`}
        onClick={() => setLanguage("es")}
      >
        {copy.language.es}
      </button>
    </div>
  )
}
