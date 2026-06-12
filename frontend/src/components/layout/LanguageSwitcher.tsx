'use client';

import { useLanguage, locales, localeNames, type Locale } from '@/contexts/LanguageContext';
import { GlobeIcon } from '@/components/icons/MantleIcons';

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="relative group">
      <button className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
        <GlobeIcon className="w-5 h-5 text-gray-400" size={20} />
        <span className="text-sm text-gray-300">{localeNames[locale]}</span>
      </button>

      <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <div className="py-2">
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => setLocale(loc)}
              className={`w-full px-4 py-2 text-left hover:bg-white/5 transition-colors flex items-center justify-between ${
                loc === locale ? 'bg-blue-500/10 text-blue-500' : 'text-gray-300'
              }`}
            >
              <span className="text-sm">{localeNames[loc]}</span>
              {loc === locale && (
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
