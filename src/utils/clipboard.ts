/** Copy text to clipboard. Tries the modern Clipboard API first,
 *  falls back to execCommand (works in iframes and without permissions). */
export async function copyText (text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch { /* fall through to execCommand */ }
  }
  try {
    const el = document.createElement('textarea')
    el.value = text
    el.style.position = 'fixed'
    el.style.opacity = '0'
    el.style.pointerEvents = 'none'
    el.style.top = '0'
    el.style.left = '0'
    document.body.append(el)
    el.focus()
    el.select()
    const ok = document.execCommand('copy')
    el.remove()
    return ok
  } catch {
    return false
  }
}
