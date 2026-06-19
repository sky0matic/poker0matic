import type en from '../locales/en'
import { createI18n } from 'vue-i18n'

type LocaleSchema = typeof en
type LocaleMeta = { flagSvg: string, nativeName: string }
type LocaleModule = { default: LocaleSchema, meta?: LocaleMeta }
type LocaleModules = Record<string, LocaleModule>

export const LOCALE_STORAGE_KEY = 'poker_locale'

const modules = import.meta.glob('../locales/*.ts', { eager: true }) as LocaleModules
const messages: Record<string, LocaleSchema> = {}

export type LocaleInfo = { code: string, flagSvg: string, nativeName: string }
const localeList: LocaleInfo[] = []

for (const [path, mod] of Object.entries(modules)) {
  const code = path.match(/\/([^/]+)\.ts$/)?.[1]
  if (code && mod.default && typeof mod.default === 'object') {
    messages[code] = mod.default
    localeList.push({
      code,
      flagSvg: mod.meta?.flagSvg ?? '',
      nativeName: mod.meta?.nativeName ?? code,
    })
  }
}

export const availableLocales: readonly LocaleInfo[] = localeList

export function detectLocale (available: string[], languages: readonly string[] = navigator.languages): string {
  for (const lang of languages) {
    if (available.includes(lang)) {
      return lang
    }
    const prefix = lang.split('-')[0]
    const match = available.find(l => l.startsWith(prefix))
    if (match) {
      return match
    }
  }
  return 'en'
}

const availableCodes = Object.keys(messages)
const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY)
const locale = storedLocale && availableCodes.includes(storedLocale)
  ? storedLocale
  : detectLocale(availableCodes)

const i18nInstance = createI18n({
  legacy: false,
  locale,
  fallbackLocale: 'en',
  messages,
})

export function setLocale (code: string): void {
  if (!availableLocales.some(l => l.code === code)) {
    return
  }
  i18nInstance.global.locale.value = code
  localStorage.setItem(LOCALE_STORAGE_KEY, code)
}

export default i18nInstance
