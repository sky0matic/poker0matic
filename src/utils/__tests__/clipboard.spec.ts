import { faker } from '@faker-js/faker'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { copyToClipboard } from '../clipboard'

class FakeClipboardItem {
  static supports = vi.fn((_type: string) => true)
  constructor (public items: Record<string, Promise<Blob>>) {}
}

describe('utils/clipboard', () => {
  let text: string
  let png: Blob
  let write: ReturnType<typeof vi.fn>
  let writeText: ReturnType<typeof vi.fn>

  function stubClipboard (clipboard: object | undefined) {
    vi.stubGlobal('navigator', { ...navigator, clipboard })
  }

  beforeEach(() => {
    text = faker.lorem.sentence()
    png = new Blob([faker.string.alphanumeric(8)], { type: 'image/png' })
    write = vi.fn().mockResolvedValue(undefined)
    writeText = vi.fn().mockResolvedValue(undefined)
    FakeClipboardItem.supports.mockReturnValue(true)
    vi.stubGlobal('ClipboardItem', FakeClipboardItem)
    vi.stubGlobal('isSecureContext', true)
    stubClipboard({ write, writeText })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('writes text-only content with writeText and returns text', async () => {
    // Act
    const result = await copyToClipboard({ text })

    // Assert
    expect(result).toBe('text')
    expect(writeText).toHaveBeenCalledWith(text)
    expect(write).not.toHaveBeenCalled()
  })

  it('writes one ClipboardItem holding only the png promise, synchronously, and returns image', async () => {
    // Arrange
    let resolvePng: (blob: Blob) => void = () => {}
    const pngPromise = new Promise<Blob>(resolve => {
      resolvePng = resolve
    })

    // Act
    const pending = copyToClipboard({ text, png: () => pngPromise })
    const calledBeforeResolve = write.mock.calls.length
    resolvePng(png)
    const result = await pending

    // Assert
    expect(calledBeforeResolve).toBe(1)
    expect(result).toBe('image')
    const [[items]] = write.mock.calls as [[FakeClipboardItem[]]]
    expect(items).toHaveLength(1)
    expect(Object.keys(items[0].items)).toEqual(['image/png'])
    await expect(items[0].items['image/png']).resolves.toBe(png)
    expect(FakeClipboardItem.supports).toHaveBeenCalledWith('image/png')
    expect(writeText).not.toHaveBeenCalled()
  })

  it.each([
    ['ClipboardItem is undefined', () => vi.stubGlobal('ClipboardItem', undefined)],
    ['ClipboardItem.supports rejects image/png', () => FakeClipboardItem.supports.mockReturnValue(false)],
    ['clipboard.write rejects', () => write.mockRejectedValue(new Error('NotAllowedError'))],
    ['clipboard.write is unavailable', () => stubClipboard({ writeText })],
    ['the context is not secure', () => vi.stubGlobal('isSecureContext', false)],
  ])('falls back to writeText when %s', async (_label, arrange) => {
    // Arrange
    arrange()

    // Act
    const result = await copyToClipboard({ text, png: () => Promise.resolve(png) })

    // Assert
    expect(result).toBe('text')
    expect(writeText).toHaveBeenCalledWith(text)
  })

  it.each([
    ['clipboard is undefined', () => stubClipboard(undefined)],
    ['write and writeText reject', () => {
      write.mockRejectedValue(new Error('NotAllowedError'))
      writeText.mockRejectedValue(new Error('NotAllowedError'))
    }],
  ])('returns failed when %s', async (_label, arrange) => {
    // Arrange
    arrange()

    // Act
    const results = await Promise.all([copyToClipboard({ text }), copyToClipboard({ text, png: () => Promise.resolve(png) })])

    // Assert
    expect(results).toEqual(['failed', 'failed'])
  })
})
