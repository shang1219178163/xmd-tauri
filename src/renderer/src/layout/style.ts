import type {
  EdgeKind,
  StyleProperties,
  Theme,
  ThemePart,
  Topic
} from '@shared/types'

const DEFAULT_FONT_SIZE = 16

/** Pick the theme part that applies to a topic. */
export function resolveThemePart(
  theme: Theme,
  depth: number,
  isRoot: boolean,
  isFloating: boolean
): ThemePart | undefined {
  if (isFloating) return theme.floatingTopic
  if (isRoot || depth <= 0) return theme.centralTopic
  if (depth === 1) return theme.mainTopic
  if (depth === 2) return theme.subTopic
  return theme.level3 ?? theme.subTopic
}

/**
 * Merge explicit topic style properties over the matching theme part. Theme
 * values are therefore fallbacks for any property the topic does not override.
 */
export function resolveTopicStyle(
  topic: Topic,
  theme: Theme,
  depth: number,
  isRoot: boolean,
  isFloating: boolean
): StyleProperties {
  const part = resolveThemePart(theme, depth, isRoot, isFloating)
  return {
    ...(part?.properties ?? {}),
    ...(topic.style?.properties ?? {})
  }
}

/** Read a style value as a string; numbers are converted for convenience. */
export function asString(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return undefined
}

/**
 * Parse a font size into CSS pixels.
 * `24pt` -> 32px, `16px` -> 16px. Missing/invalid values fall back to 16px.
 */
export function parseFontSize(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_FONT_SIZE
  }
  if (typeof value !== 'string') return DEFAULT_FONT_SIZE

  const match = /^\s*(-?\d+(?:\.\d+)?)\s*(pt|px|em|rem|%)?\s*$/i.exec(value)
  if (!match) return DEFAULT_FONT_SIZE

  const amount = Number.parseFloat(match[1])
  if (!Number.isFinite(amount) || amount <= 0) return DEFAULT_FONT_SIZE

  switch ((match[2] ?? '').toLowerCase()) {
    case 'pt':
      // 1pt = 4/3 px at the standard 96dpi baseline.
      return (amount * 4) / 3
    case 'em':
    case 'rem':
      return amount * DEFAULT_FONT_SIZE
    case '%':
      return (amount / 100) * DEFAULT_FONT_SIZE
    default:
      return amount
  }
}

/** Parse a stroke width into CSS pixels (`pt`, `px` or bare numbers). */
export function parseLineWidth(value: unknown, fallback = 2): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value : fallback
  }
  if (typeof value !== 'string') return fallback

  const match = /^\s*(\d+(?:\.\d+)?)\s*(pt|px)?\s*$/i.exec(value)
  if (!match) return fallback

  const amount = Number.parseFloat(match[1])
  if (!Number.isFinite(amount) || amount < 0) return fallback

  return (match[2] ?? '').toLowerCase() === 'pt' ? (amount * 4) / 3 : amount
}

/** Derive the branch connection kind from an XMind `line-class` value. */
export function edgeKindFromLineClass(value: unknown): EdgeKind {
  const text = (asString(value) ?? '').toLowerCase()
  if (text.includes('roundedelbow')) return 'roundedElbow'
  if (text.includes('roundedfold')) return 'roundedFold'
  if (text.includes('bight')) return 'bight'
  if (text.includes('fold')) return 'fold'
  if (text.includes('brace')) return 'brace'
  if (text.includes('elbow')) return 'elbow'
  if (text.includes('straight')) return 'straight'
  if (text.includes('tapered')) return 'tapered'
  return 'curve'
}

/** XMind encodes dashed branches either in the class name or the line style. */
export function isDashedLine(lineClass: unknown, lineStyle: unknown): boolean {
  const classText = (asString(lineClass) ?? '').toLowerCase()
  const styleText = (asString(lineStyle) ?? '').toLowerCase()
  return classText.includes('dash') || styleText.includes('dash')
}
