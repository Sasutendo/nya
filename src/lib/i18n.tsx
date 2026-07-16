import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type Language = 'de' | 'en'
type TextPicker = (english: string, german: string) => string

interface LanguageContextValue {
  language: Language
  setLanguage: (language: Language) => void
  toggleLanguage: () => void
  text: TextPicker
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'de', setLanguage: () => undefined, toggleLanguage: () => undefined, text: (_english, german) => german,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem('nya-language')
      if (stored === 'de' || stored === 'en') return stored
    } catch { /* German remains the default. */ }
    return 'de'
  })

  useEffect(() => {
    document.documentElement.lang = language
    try { localStorage.setItem('nya-language', language) } catch { /* Keep the selection for this visit. */ }
  }, [language])

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage,
    toggleLanguage: () => setLanguage((current) => current === 'de' ? 'en' : 'de'),
    text: (english, german) => language === 'de' ? german : english,
  }), [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() { return useContext(LanguageContext) }

export function localizeAuthoredDefault(value: string, english: string, german: string, language: Language): string {
  if (language === 'de' && value === english) return german
  if (language === 'en' && value === german) return english
  return value
}
