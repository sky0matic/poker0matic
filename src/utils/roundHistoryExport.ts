import type { CardValue } from '@/config/cardDecks'
import type { ClipboardContent } from '@/utils/clipboard'
import type { VoteBucket } from '@/utils/roomStats'

/** A round's chart, with every text already localized. */
export interface RoundChartInput {
  /** E.g. "Round 2 · 01:15". */
  title: string
  /** E.g. ["Average 5.5", "Median 5"]; joined on one line, omitted when empty. */
  stats: string[]
  /** E.g. "Suggested estimate: 5"; omitted when `null`. */
  suggestionLabel: string | null
  buckets: VoteBucket[]
  /** Card whose row is bold. */
  suggestion: CardValue | null
}

export interface SvgImage {
  svg: string
  width: number
  height: number
}

export interface ChartPalette {
  background: string
  text: string
  muted: string
  primary: string
  track: string
}

/** Light colours whatever the app theme, so the image reads well pasted into any chat. */
export const CHART_PALETTE: ChartPalette = {
  background: '#FFFFFF',
  text: '#212121',
  muted: '#757575',
  primary: '#1867C0',
  track: '#EEEEEE',
}

/** What the round history asks to copy: a round or the whole history, as text or as an image. */
export interface HistoryCopyRequest {
  kind: 'round' | 'roundImage' | 'history' | 'historyImage'
  content: ClipboardContent
}

export const CHART_WIDTH = 480
const PADDING = 16
const TITLE_HEIGHT = 24
const LINE_HEIGHT = 20
const GAP = 8
const ROW_HEIGHT = 24
const LABEL_END = PADDING + 56
const TRACK_START = LABEL_END + 8
const COUNT_START = CHART_WIDTH - PADDING - 32
const TRACK_WIDTH = COUNT_START - 8 - TRACK_START
const BAR_HEIGHT = 12
const MIN_BAR_WIDTH = 4
const FONT_FAMILY = 'Roboto, Arial, sans-serif'

function escapeXml (value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&apos;')
}

function text (x: number, y: number, content: string, attributes: string): string {
  return `<text x="${x}" y="${y}" ${attributes}>${escapeXml(content)}</text>`
}

/** The chart's elements from y = 0, without background, and the height they take (padding included). */
function chartBody (input: RoundChartInput, palette: ChartPalette): { markup: string, height: number } {
  const parts: string[] = []
  let y = PADDING

  parts.push(text(PADDING, y + 17, input.title, `class="title" font-size="16" font-weight="bold" fill="${palette.text}"`))
  y += TITLE_HEIGHT

  if (input.stats.length > 0) {
    parts.push(text(PADDING, y + 14, input.stats.join(' · '), `class="stats" font-size="13" fill="${palette.muted}"`))
    y += LINE_HEIGHT
  }

  if (input.suggestionLabel != null) {
    parts.push(text(PADDING, y + 14, input.suggestionLabel, `class="suggestion" font-size="13" font-weight="bold" fill="${palette.primary}"`))
    y += LINE_HEIGHT
  }

  if (input.buckets.length > 0) {
    y += GAP
    const maxCount = Math.max(1, ...input.buckets.map(bucket => bucket.count))
    for (const bucket of input.buckets) {
      const barWidth = Math.max(MIN_BAR_WIDTH, Math.round((bucket.count / maxCount) * TRACK_WIDTH))
      const barY = y + (ROW_HEIGHT - BAR_HEIGHT) / 2
      const weight = bucket.vote === input.suggestion ? ' font-weight="bold"' : ''
      parts.push(
        `<g class="bar-row"${weight}>`
        + text(LABEL_END, y + 16, String(bucket.vote), `class="bar-label" font-size="13" text-anchor="end" fill="${palette.text}"`)
        + `<rect class="bar-track" x="${TRACK_START}" y="${barY}" width="${TRACK_WIDTH}" height="${BAR_HEIGHT}" rx="3" fill="${palette.track}"/>`
        + `<rect class="bar-fill" x="${TRACK_START}" y="${barY}" width="${barWidth}" height="${BAR_HEIGHT}" rx="3" fill="${palette.primary}"/>`
        + text(COUNT_START, y + 16, String(bucket.count), `class="bar-count" font-size="13" fill="${palette.text}"`)
        + '</g>',
      )
      y += ROW_HEIGHT
    }
  }

  return { markup: parts.join(''), height: y + PADDING }
}

function svgDocument (markup: string, height: number, palette: ChartPalette): SvgImage {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CHART_WIDTH}" height="${height}" viewBox="0 0 ${CHART_WIDTH} ${height}" font-family="${FONT_FAMILY}">`
    + `<rect width="100%" height="100%" fill="${palette.background}"/>`
    + markup
    + '</svg>'
  return { svg, width: CHART_WIDTH, height }
}

/** A self-contained SVG of one round's vote distribution, with its title, stats and suggested estimate. */
export function roundChartSvg (input: RoundChartInput, palette: ChartPalette = CHART_PALETTE): SvgImage {
  const body = chartBody(input, palette)
  return svgDocument(body.markup, body.height, palette)
}

/** A single SVG stacking every round's chart, in the given order, under `title`. */
export function historyChartSvg (title: string, inputs: RoundChartInput[], palette: ChartPalette = CHART_PALETTE): SvgImage {
  const parts = [text(PADDING, PADDING + 19, title, `class="history-title" font-size="18" font-weight="bold" fill="${palette.text}"`)]
  let y = PADDING + TITLE_HEIGHT + GAP

  for (const input of inputs) {
    const body = chartBody(input, palette)
    parts.push(
      `<g class="round-chart" transform="translate(0,${y})">`
      + `<line x1="${PADDING}" y1="0" x2="${CHART_WIDTH - PADDING}" y2="0" stroke="${palette.track}" stroke-width="1"/>`
      + body.markup
      + '</g>',
    )
    y += body.height
  }

  return svgDocument(parts.join(''), y, palette)
}

/** The history as plain text: `title` then one summary per line. */
export function historyText (title: string, summaries: string[]): string {
  return [title, ...summaries].join('\n')
}
