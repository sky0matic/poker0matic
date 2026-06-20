import { afterEach, describe, expect, it } from 'vitest'
import i18n, { availableLocales, detectLocale, LOCALE_STORAGE_KEY, setLocale } from '../i18n'

describe('i18n plugin', () => {
  afterEach(() => {
    i18n.global.locale.value = 'en'
    localStorage.removeItem(LOCALE_STORAGE_KEY)
  })

  it('uses English as the fallback locale', () => {
    expect(i18n.global.fallbackLocale.value).toBe('en')
  })

  it.each<[string, string, string]>([
    ['en', 'app.nav.home', 'Home'],
    ['fr', 'app.nav.home', 'Accueil'],
    ['es', 'app.nav.home', 'Inicio'],
  ])('translates %s key %s correctly', (locale, key, expected) => {
    // Arrange
    i18n.global.locale.value = locale

    // Assert
    expect(i18n.global.t(key)).toBe(expected)
  })

  describe('availableLocales', () => {
    it('exposes en, fr and es with nativeName', () => {
      const codes = availableLocales.map(l => l.code)
      expect(codes).toContain('en')
      expect(codes).toContain('fr')
      expect(codes).toContain('es')
      for (const loc of availableLocales) {
        expect(loc.nativeName).toBeTruthy()
      }
    })
  })

  describe('setLocale', () => {
    it('updates the active locale and persists it to localStorage', () => {
      // Act
      setLocale('fr')

      // Assert
      expect(i18n.global.locale.value).toBe('fr')
      expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('fr')
    })

    it('does not update locale for an unknown code', () => {
      // Act
      setLocale('zz')

      // Assert
      expect(i18n.global.locale.value).toBe('en')
      expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull()
    })
  })

  describe('detectLocale', () => {
    it.each<[string[], string[], string]>([
      [['en-US'], ['en', 'fr', 'es'], 'en'],
      [['fr'], ['en', 'fr', 'es'], 'fr'],
      [['fr'], ['en', 'fr', 'es'], 'fr'],
      [['zh'], ['en', 'fr', 'es'], 'en'],
      [['zh', 'fr'], ['en', 'fr', 'es'], 'fr'],
    ])('detects "%s" from %s as "%s"', (langs, available, expected) => {
      // Assert
      expect(detectLocale(available, langs)).toBe(expected)
    })
  })
})
