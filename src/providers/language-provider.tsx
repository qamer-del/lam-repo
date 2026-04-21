'use client'

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { ar, en } from '@/lib/translations'

type Locale = 'en' | 'ar'

type TranslationKeys = keyof typeof en

interface LanguageContextType {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (k: TranslationKeys) => string
}

const LanguageContext = createContext<LanguageContextType>({
  locale: 'en',
  setLocale: () => {},
  t: () => '',
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('locale') as Locale
    if (saved === 'ar' || saved === 'en') {
      setLocaleState(saved)
    }
    setMounted(true)
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('locale', newLocale)
  }

  useEffect(() => {
    if (mounted) {
      document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.lang = locale
    }
  }, [locale, mounted])

  const t = (key: TranslationKeys) => {
    const dict = locale === 'ar' ? ar : en
    return dict[key] || en[key] || key
  }

  if (!mounted) return null // avoid hydration mismatch

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      <div className={`${locale === 'ar' ? 'font-cairo' : 'font-inter'} h-full w-full`}>
        {children}
      </div>
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
