import type { Theme, Topic } from '@shared/types'
import { parseFontSize, resolveTopicStyle } from './style'

export interface MeasureOptions {
  theme: Theme
  depth: number
  isRoot?: boolean
  isFloating?: boolean
}

const HORIZONTAL_PADDING = 28
const MIN_WIDTH = 72
const MAX_WIDTH = 340
const MARKER_WIDTH = 18
const MIN_HEIGHT = 36
const LABEL_ROW_HEIGHT = 18
const IMAGE_MIN_WIDTH = 120
const IMAGE_MIN_HEIGHT = 90
const LATIN_EM = 0.56
const CJK_EM = 1
const DEFAULT_FONT_SIZE = 16

/**
 * Measure a topic box. Pure and deterministic: text is estimated from the
 * title using approximate em widths, never from a DOM measurement.
 */
export function measureTopic(topic: Topic, opts: MeasureOptions): { width: number; height: number } {
  const isRoot = opts.isRoot ?? opts.depth === 0
  const isFloating = opts.isFloating ?? false
  const style = resolveTopicStyle(topic, opts.theme, opts.depth, isRoot, isFloating)
  const fontSize = parseFontSize(style['fo:font-size'])
  const customWidth = positiveNumber(topic.customWidth)
  const customHeight = positiveNumber(topic.customHeight)
  const hasImage = topic.image !== undefined

  let width: number
  if (customWidth !== undefined) {
    width = customWidth
  } else {
    const titleWidth = estimateTextWidth(topic.title ?? '', fontSize)
    const markerWidth = (topic.markers?.length ?? 0) * MARKER_WIDTH
    const maxWidth = isRoot ? 480 : MAX_WIDTH
    width =
      clamp(Math.ceil(titleWidth + HORIZONTAL_PADDING), MIN_WIDTH, maxWidth) + markerWidth
  }
  if (hasImage) width = Math.max(width, IMAGE_MIN_WIDTH)

  let height: number
  if (customHeight !== undefined) {
    height = customHeight
  } else {
    const textWidth = Math.max(24, width - HORIZONTAL_PADDING)
    const lineCount = Math.max(1, estimateLineCount(topic.title ?? '', textWidth, fontSize))
    height = Math.max(MIN_HEIGHT, lineCount * fontSize * 1.35 + 14)
    if ((topic.labels?.length ?? 0) > 0) height += LABEL_ROW_HEIGHT
  }
  if (hasImage) height = Math.max(height, IMAGE_MIN_HEIGHT)

  return { width, height }
}

/** How many visual lines a title needs inside `maxWidth` pixels. */
export function estimateLineCount(text: string, maxWidth: number, fontSize: number): number {
  const width = Math.max(1, maxWidth)
  let lines = 0
  for (const paragraph of text.split(/\r?\n/)) {
    const paragraphWidth = estimateTextWidth(paragraph, fontSize)
    lines += Math.max(1, Math.ceil(paragraphWidth / width))
  }
  return Math.max(1, lines)
}

/** Estimate the rendered width of a title in pixels. */
export function estimateTextWidth(text: string, fontSize: number): number {
  const size = Number.isFinite(fontSize) && fontSize > 0 ? fontSize : DEFAULT_FONT_SIZE
  let widest = 0

  for (const line of text.split(/\r?\n/)) {
    let lineWidth = 0
    for (const char of Array.from(line)) {
      const codePoint = char.codePointAt(0) ?? 0
      if (codePoint === 9) {
        lineWidth += size * 2
      } else if (isWideCharacter(codePoint)) {
        lineWidth += size * CJK_EM
      } else {
        lineWidth += size * LATIN_EM
      }
    }
    if (lineWidth > widest) widest = lineWidth
  }

  return widest
}

function positiveNumber(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** CJK, full-width punctuation, Hangul and emoji occupy roughly one em. */
function isWideCharacter(codePoint: number): boolean {
  return (
    (codePoint >= 0x1100 && codePoint <= 0x115f) ||
    (codePoint >= 0x2e80 && codePoint <= 0x303e) ||
    (codePoint >= 0x3041 && codePoint <= 0x33ff) ||
    (codePoint >= 0x3400 && codePoint <= 0x4dbf) ||
    (codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
    (codePoint >= 0xa000 && codePoint <= 0xa4cf) ||
    (codePoint >= 0xa960 && codePoint <= 0xa97f) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
    (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
    (codePoint >= 0xff00 && codePoint <= 0xff60) ||
    (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
    (codePoint >= 0x1f300 && codePoint <= 0x1faff) ||
    (codePoint >= 0x20000 && codePoint <= 0x3fffd)
  )
}
