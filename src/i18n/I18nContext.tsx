import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useAuth } from "../auth/AuthContext"
import { messages, type AppMessages, type Language } from "./messages"

type I18nContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  copy: AppMessages
}

const STORAGE_KEY = "cameleyon-ui-language"

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

function isSupportedLanguage(value: unknown): value is Language {
  return value === "en" || value === "fr" || value === "es"
}

function detectInitialLanguage(): Language {
  if (typeof window === "undefined") return "en"
  const pathLanguage = window.location.pathname.match(/^\/(en|fr|es)\/?$/)?.[1]
  if (isSupportedLanguage(pathLanguage)) return pathLanguage

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (isSupportedLanguage(stored)) return stored
  return "en"
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth()
  const [browserLanguage, setBrowserLanguage] = useState<Language>(detectInitialLanguage)
  const [sessionLanguage, setSessionLanguage] = useState<{ token: string; language: Language } | null>(null)
  if (sessionLanguage && sessionLanguage.token !== token) setSessionLanguage(null)

  const accountLanguage = token && isSupportedLanguage(user?.preferredLanguage) ? user.preferredLanguage : null
  const language = accountLanguage && sessionLanguage?.token === token
    ? sessionLanguage.language
    : accountLanguage ?? browserLanguage

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, browserLanguage)
  }, [browserLanguage])

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.translate = false
    document.body.translate = false
  }, [language])

  const value = useMemo<I18nContextValue>(() => ({
    language,
    setLanguage: (nextLanguage) => {
      if (accountLanguage && token) setSessionLanguage({ token, language: nextLanguage })
      else setBrowserLanguage(nextLanguage)
    },
    copy: messages[language],
  }), [accountLanguage, language, token])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error("useI18n must be used within a LanguageProvider")
  }

  return context
}
