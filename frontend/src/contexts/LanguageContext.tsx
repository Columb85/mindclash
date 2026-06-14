'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Locale = 'en' | 'ru' | 'es' | 'de' | 'zh';

export const locales: Locale[] = ['en', 'ru', 'es', 'de', 'zh'];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
  es: 'Español',
  de: 'Deutsch',
  zh: '中文',
};

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Import translation files directly
const translationFiles = {
  en: () => import('../locales/en.json').then(m => m.default),
  ru: () => import('../locales/ru.json').then(m => m.default),
  es: () => import('../locales/es.json').then(m => m.default),
  de: () => import('../locales/de.json').then(m => m.default),
  zh: () => import('../locales/zh.json').then(m => m.default),
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  // DISABLED: Multi-language support temporarily disabled - English only
  // const [locale, setLocale] = useState<Locale>('en');
  const [locale] = useState<Locale>('en'); // Always English
  const setLocale = (_locale: Locale) => {}; // No-op function
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // DISABLED: Browser language detection - always use English
  useEffect(() => {
    // const browserLang = navigator.language.split('-')[0] as Locale;
    // const initialLocale = locales.includes(browserLang) ? browserLang : 'en';
    // setLocale(initialLocale);
    // loadTranslations(initialLocale);
    loadTranslations('en'); // Always load English
  }, []);

  // Load translations when locale changes
  const loadTranslations = async (lang: Locale) => {
    try {
      const data = await translationFiles[lang]();
      setTranslations(data);
      setIsLoaded(true);
    } catch {
      // Fallback to English if loading fails
      if (lang !== 'en') {
        loadTranslations('en');
      } else {
        setIsLoaded(true);
      }
    }
  };

  // Load new translations when locale changes
  useEffect(() => {
    loadTranslations(locale);
  }, [locale]);

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations;
    for (const k of keys) {
      value = value?.[k];
    }
    return (typeof value === 'string' ? value : undefined) || key;
  };

  // Don't render children until translations are loaded
  if (!isLoaded) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
