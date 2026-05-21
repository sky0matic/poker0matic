import { afterEach, describe, expect, it, vi } from 'vitest'
import i18n from '../i18n'

describe('i18n plugin', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('uses English as the default and fallback locale', () => {
    expect(i18n.global.locale.value).toBe('en')
    expect(i18n.global.fallbackLocale.value).toBe('en')
  })

  it.each<['en' | 'ja', string]>([
    ['en', 'hello world'],
    ['ja', 'こんにちは、世界'],
  ])('translates message.hello correctly for locale %s', (locale, expected) => {
    // Arrange
    i18n.global.locale.value = locale

    // Assert
    expect(i18n.global.t('message.hello')).toBe(expected)
  })
})
