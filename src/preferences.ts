import type {Locale} from './board-card';

export type Theme = 'light' | 'dark';
const LOCALE_KEY = 'fate-dice-locale';
const THEME_KEY = 'fate-dice-theme';

export function getInitialLocale(): Locale {
  const stored = localStorage.getItem(LOCALE_KEY);
  if (stored === 'ru' || stored === 'en') return stored;
  return navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

export function getInitialTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyPreferences(locale: Locale, theme: Theme): void {
  localStorage.setItem(LOCALE_KEY, locale);
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.lang = locale;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}
