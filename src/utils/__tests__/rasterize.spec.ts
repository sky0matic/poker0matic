import type { SvgImage } from '../roundHistoryExport'
import { faker } from '@faker-js/faker'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { canvasScale, MAX_CANVAS_AREA, MAX_CANVAS_DIMENSION, svgToPngBlob } from '../rasterize'

class FakeImage extends EventTarget {
  static fails = false
  static loaded: FakeImage[] = []
  private source = ''

  get src (): string {
    return this.source
  }

  set src (value: string) {
    this.source = value
    FakeImage.loaded.push(this)
    queueMicrotask(() => this.dispatchEvent(new Event(FakeImage.fails ? 'error' : 'load')))
  }
}

describe('utils/rasterize', () => {
  let image: SvgImage
  let context: { scale: ReturnType<typeof vi.fn>, drawImage: ReturnType<typeof vi.fn> }
  let png: Blob
  let getContext: ReturnType<typeof vi.spyOn>
  let toBlob: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    image = { svg: `<svg xmlns="http://www.w3.org/2000/svg"><text>${faker.lorem.word()}</text></svg>`, width: 480, height: faker.number.int({ min: 100, max: 600 }) }
    context = { scale: vi.fn(), drawImage: vi.fn() }
    png = new Blob(['png'], { type: 'image/png' })
    FakeImage.fails = false
    FakeImage.loaded = []
    vi.stubGlobal('Image', FakeImage)
    getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
    toBlob = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(png))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('draws the SVG on a canvas scaled by the factor and resolves a PNG blob', async () => {
    // Act
    const result = await svgToPngBlob(image, 3)

    // Assert
    expect(result).toBe(png)
    expect(FakeImage.loaded[0].src).toBe(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(image.svg)}`)
    const [canvas] = getContext.mock.contexts as HTMLCanvasElement[]
    expect(canvas.width).toBe(image.width * 3)
    expect(canvas.height).toBe(image.height * 3)
    expect(context.scale).toHaveBeenCalledWith(3, 3)
    expect(context.drawImage).toHaveBeenCalledWith(FakeImage.loaded[0], 0, 0, image.width, image.height)
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png')
  })

  it.each([
    ['keeps the requested scale for a small chart', 480, 300, 2, 2],
    ['lowers the scale towards 1× when the area exceeds the limit at full scale', 960, 10_000, 2, Math.sqrt(MAX_CANVAS_AREA / (960 * 10_000))],
    ['shrinks below 1× when the area exceeds the limit', 4000, 5000, 2, Math.sqrt(MAX_CANVAS_AREA / (4000 * 5000))],
    ['shrinks below 1× when a side exceeds the limit', 480, 60_000, 2, MAX_CANVAS_DIMENSION / 60_000],
  ])('canvasScale %s', (_label, width, height, scale, expected) => {
    // Act
    const result = canvasScale({ width, height }, scale)

    // Assert
    expect(result).toBeCloseTo(expected, 10)
    expect(width * result * height * result).toBeLessThanOrEqual(MAX_CANVAS_AREA + 1e-6)
    expect(Math.max(width, height) * result).toBeLessThanOrEqual(MAX_CANVAS_DIMENSION + 1e-6)
  })

  it('caps the canvas size within the iOS Safari limits for a very tall image', async () => {
    // Arrange
    const tall = { ...image, height: faker.number.int({ min: 20_000, max: 80_000 }) }

    // Act
    await svgToPngBlob(tall)

    // Assert
    const [canvas] = getContext.mock.contexts as HTMLCanvasElement[]
    const effectiveScale = canvasScale(tall, 2)
    expect(effectiveScale).toBeLessThan(2)
    expect(canvas.width).toBe(Math.floor(tall.width * effectiveScale))
    expect(canvas.height).toBe(Math.floor(tall.height * effectiveScale))
    expect(canvas.width * canvas.height).toBeLessThanOrEqual(MAX_CANVAS_AREA)
    expect(Math.max(canvas.width, canvas.height)).toBeLessThanOrEqual(MAX_CANVAS_DIMENSION)
    expect(context.scale).toHaveBeenCalledWith(effectiveScale, effectiveScale)
    expect(context.drawImage).toHaveBeenCalledWith(FakeImage.loaded[0], 0, 0, tall.width, tall.height)
  })

  it.each([
    ['the image fails to load', () => {
      FakeImage.fails = true
    }],
    ['the canvas has no 2d context', () => getContext.mockReturnValue(null)],
    ['toBlob yields no blob', () => toBlob.mockImplementation((callback: BlobCallback) => callback(null))],
  ])('rejects when %s', async (_label, arrange) => {
    // Arrange
    arrange()

    // Act
    const result = svgToPngBlob(image)

    // Assert
    await expect(result).rejects.toThrow(Error)
  })
})
