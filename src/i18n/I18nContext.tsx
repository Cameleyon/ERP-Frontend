import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { messages, type AppMessages, type Language } from "./messages"

type I18nContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  copy: AppMessages
}

const STORAGE_KEY = "cameleyon-ui-language"

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

function detectInitialLanguage(): Language {
  if (typeof window === "undefined") {
    return "fr"
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === "fr" || stored === "en") {
    return stored
  }

  return window.navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en"
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(detectInitialLanguage)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language)
    document.documentElement.lang = language
  }, [language])

  const value = useMemo<I18nContextValue>(() => ({
    language,
    setLanguage: setLanguageState,
    copy: messages[language],
  }), [language])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error("useI18n must be used within a LanguageProvider")
  }

  return context
}
