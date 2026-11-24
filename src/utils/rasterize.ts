import type { SvgImage } from '@/utils/roundHistoryExport'

/** iOS Safari refuses canvases above 16,777,216 pixels (4096 × 4096): `toBlob` then yields nothing. */
export const MAX_CANVAS_AREA = 16_777_216
/** Largest canvas side every supported browser accepts. */
export const MAX_CANVAS_DIMENSION = 16_384

function loadImage (src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', () => reject(new Error('The SVG image could not be loaded')))
    image.src = src
  })
}

/**
 * Largest scale, up to `scale`, at which the canvas stays within the browser limits:
 * high-density output first lowers towards 1×, then the image shrinks below its natural size.
 */
export function canvasScale (image: Pick<SvgImage, 'width' | 'height'>, scale: number): number {
  const areaLimit = Math.sqrt(MAX_CANVAS_AREA / (image.width * image.height))
  const dimensionLimit = MAX_CANVAS_DIMENSION / Math.max(image.width, image.height)
  return Math.min(scale, areaLimit, dimensionLimit)
}

/** Draws `image` on a canvas up to `scale` times larger (sharp on high-density screens) and encodes it as a PNG. */
export async function svgToPngBlob (image: SvgImage, scale = 2): Promise<Blob> {
  const element = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(image.svg)}`)
  const effectiveScale = canvasScale(image, scale)
  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(image.width * effectiveScale)
  canvas.height = Math.floor(image.height * effectiveScale)
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('The canvas has no 2d context')
  }

  context.scale(effectiveScale, effectiveScale)
  context.drawImage(element, 0, 0, image.width, image.height)
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The canvas could not be encoded as PNG')), 'image/png')
  })
}
