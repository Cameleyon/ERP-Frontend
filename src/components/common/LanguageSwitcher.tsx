import { useI18n } from "../../i18n/I18nContext"
import type { Language } from "../../i18n/messages"

const languages: Language[] = ["fr", "en", "es"]

type Props = {
  className?: string
  linkToHomepage?: boolean
}

export default function LanguageSwitcher({ className = "", linkToHomepage = false }: Props) {
  const { language, setLanguage, copy } = useI18n()

  return (
    <div className={`language-switcher ${className}`.trim()}>
      {languages.map((option) => {
        const active = language === option
        const itemClass = `language-switcher-button ${active ? "active" : ""}`
        return linkToHomepage ? (
          <a key={option} className={itemClass}
            href={`/${option}${window.location.search}${window.location.hash}`}
            hrefLang={option} aria-current={active ? "page" : undefined}>
            {copy.language[option]}
          </a>
        ) : (
          <button key={option} type="button" className={itemClass}
            aria-pressed={active} onClick={() => setLanguage(option)}>
            {copy.language[option]}
          </button>
        )
      })}
    </div>
  )
}
