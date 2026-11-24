/** What to copy: `text` alone, or a PNG image with `text` as the fallback when images can't be copied. */
export interface ClipboardContent {
  text: string
  /** Builds the image; called synchronously so the clipboard write stays within the click gesture. */
  png?: () => Promise<Blob>
}

/** `image`: the PNG was copied; `text`: the text was copied (instead of the image, if any); `failed`: nothing was copied. */
export type CopyResult = 'image' | 'text' | 'failed'

function canWritePng (): boolean {
  return window.isSecureContext
    && typeof navigator.clipboard?.write === 'function'
    && typeof ClipboardItem !== 'undefined'
    && (typeof ClipboardItem.supports === 'function' ? ClipboardItem.supports('image/png') : true)
}

function writeText (text: string): Promise<CopyResult> {
  if (typeof navigator.clipboard?.writeText !== 'function') {
    return Promise.resolve('failed')
  }
  return navigator.clipboard.writeText(text).then(() => 'text', () => 'failed')
}

/**
 * Copies `content.png` as an image when the browser can, otherwise `content.text`.
 * `navigator.clipboard.write` is called before anything is awaited, with the image as a promise:
 * Safari only allows it within the user gesture.
 */
export function copyToClipboard (content: ClipboardContent): Promise<CopyResult> {
  if (!content.png || !canWritePng()) {
    return writeText(content.text)
  }

  let write: Promise<void>
  try {
    write = navigator.clipboard.write([new ClipboardItem({ 'image/png': content.png() })])
  } catch (error) {
    write = Promise.reject(error)
  }
  return write.then(() => 'image', () => writeText(content.text))
}
