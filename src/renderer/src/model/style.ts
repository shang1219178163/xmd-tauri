import type { EdgeKind, Sheet, StyleProperties, Theme, ThemePart, Topic } from '@shared/types'

export interface ResolvedStyle {
  fill: string
  color: string
  fontFamily: string
  fontSize: number
  fontWeight: string | number
  fontStyle: string
  textDecoration: string
  borderColor: string
  borderWidth: number
  shapeClass: string
  lineColor: string
  lineWidth: number
  lineClass: string
  lineDasharray?: string
  opacity: number
  fillPattern?: 'diagonal' | 'cross'
  patternColor?: string
  handDrawn: boolean
  textAlign: 'left' | 'center' | 'right'
}

export const FONT_STACK = 'Inter, "Avenir Next", "Segoe UI", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
export const HAND_FONT_STACK = 'Bradley Hand, "STHeiti", "Songti SC", "PingFang SC", "Microsoft YaHei", sans-serif'

export function asString(value: unknown, fallback = ''): string {
  if (value === undefined || value === null) return fallback
  return String(value)
}

export function parsePx(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const text = asString(value).trim()
  if (!text) return fallback
  const match = text.match(/-?\d+(\.\d+)?/)
  if (!match) return fallback
  const n = Number(match[0])
  if (!Number.isFinite(n)) return fallback
  if (/pt\b/i.test(text)) return (n * 4) / 3
  return n
}

export function parseColor(value: unknown, fallback: string): string {
  const text = asString(value).trim()
  if (!text) return fallback
  return text
}

function themePartFor(theme: Theme, depth: number, floating: boolean, important?: boolean): ThemePart | undefined {
  if (important) return theme.importantTopic ?? theme.mainTopic
  if (floating) return theme.floatingTopic ?? theme.subTopic
  if (depth === 0) return theme.centralTopic
  if (depth === 1) return theme.mainTopic
  if (depth === 2) return theme.subTopic
  return theme.level3 ?? theme.subTopic
}

export function resolveTopicStyle(
  topic: Topic,
  sheet: Sheet,
  depth: number,
  floating = false,
  important = false
): ResolvedStyle {
  const themePart = themePartFor(sheet.theme, depth, floating, important)
  const merged: StyleProperties = {
    ...(themePart?.properties ?? {}),
    ...(topic.style?.properties ?? {})
  }
  const isRoot = depth === 0
  const defaultFontSize = isRoot ? 22 : depth === 1 ? 15 : 12.5
  const fontSize = parsePx(merged['fo:font-size'], defaultFontSize)
  const borderWidth = parsePx(merged['border-line-width'], isRoot ? 2 : 1)
  const lineWidth = parsePx(merged['line-width'], depth === 1 ? 2.5 : 1.75)
  const shapeClass = asString(merged['shape-class'], 'org.xmind.topicShape.roundedRect')
  return {
    fill: parseColor(merged['svg:fill'], isRoot ? '#ffffff' : depth === 1 ? '#2563eb' : '#eff6ff'),
    color: parseColor(merged['fo:color'], depth === 1 && !isRoot ? '#ffffff' : '#1f2937'),
    fontFamily: asString(merged['fo:font-family'], FONT_STACK),
    fontSize,
    fontWeight: (merged['fo:font-weight'] as string | number) ?? (isRoot ? 700 : depth === 1 ? 600 : 500),
    fontStyle: asString(merged['fo:font-style'], 'normal'),
    textDecoration: asString(merged['fo:text-decoration'], 'none'),
    borderColor: parseColor(merged['border-line-color'], 'transparent'),
    borderWidth,
    shapeClass,
    lineColor: parseColor(merged['line-color'], depth >= 1 ? '#93c5fd' : '#60a5fa'),
    lineWidth,
    lineClass: asString(merged['line-class'], 'org.xmind.branchConnection.curve'),
    opacity: 1,
    fillPattern: merged['fill-pattern'] === 'diagonal' || merged['fill-pattern'] === 'cross' ? merged['fill-pattern'] : undefined,
    patternColor: typeof merged['pattern-color'] === 'string' ? merged['pattern-color'] : undefined,
    handDrawn: merged['hand-drawn'] === true,
    textAlign: merged['fo:text-align'] === 'left' ? 'left' : merged['fo:text-align'] === 'right' ? 'right' : 'center'
  }
}

/** Blend a hex colour toward white (amount 0..1). */
export function mixWithWhite(color: string, amount: number): string {
  return mixColor(color, '#ffffff', amount)
}

/** Blend a hex colour toward black (amount 0..1). */
export function mixWithBlack(color: string, amount: number): string {
  return mixColor(color, '#000000', amount)
}

function mixColor(color: string, target: string, amount: number): string {
  const a = parseHex(color)
  const b = parseHex(target)
  if (!a || !b) return color
  const t = Math.max(0, Math.min(1, amount))
  const to = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0')
  return `#${to(a.r, b.r)}${to(a.g, b.g)}${to(a.b, b.b)}`
}

function parseHex(color: string): { r: number; g: number; b: number } | undefined {
  const match = color.trim().match(/^#([0-9a-fA-F]{6})/)
  if (!match) return undefined
  return {
    r: parseInt(match[1].slice(0, 2), 16),
    g: parseInt(match[1].slice(2, 4), 16),
    b: parseInt(match[1].slice(4, 6), 16)
  }
}

export function shapeOf(shapeClass: string): 'rounded' | 'rect' | 'ellipse' | 'capsule' | 'diamond' | 'underline' {
  if (/ellipse|circle/i.test(shapeClass)) return 'ellipse'
  if (/capsule|roundedRect/.test(shapeClass)) return /capsule/i.test(shapeClass) ? 'capsule' : 'rounded'
  if (/rect/i.test(shapeClass)) return 'rect'
  if (/diamond/i.test(shapeClass)) return 'diamond'
  if (/underline/i.test(shapeClass)) return 'underline'
  return 'rounded'
}

export function lineKindOf(lineClass: string): EdgeKind {
  const text = lineClass.toLowerCase()
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

/**
 * Branch line kind: a layout kind other than curve already comes from the
 * theme/sub-topic line class, so it is kept as-is (including first-level
 * bight/fold/roundedElbow branches). Curves keep the original rule: primary
 * map/logic branches stay curved, deeper branches follow the parent's line
 * style. Org/tree/timeline structures keep their layout kind.
 */
export function resolveBranchKind(
  layoutKind: EdgeKind,
  targetDepth: number,
  family: string,
  lineClass: string,
  explicitLineStyle = false
): EdgeKind {
  if (explicitLineStyle) return lineKindOf(lineClass)
  if (layoutKind !== 'curve') return layoutKind
  if (targetDepth === 1 && (family === 'map' || family === 'logic')) return 'curve'
  if (targetDepth >= 2) {
    const parentKind = lineKindOf(lineClass)
    if (parentKind === 'straight' || parentKind === 'tapered') return parentKind
  }
  return layoutKind
}

/** Split a title into lines that fit a pixel width, CJK-aware. */
export function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const value = (text ?? '').replace(/\r/g, '')
  if (!value) return ['']
  const isWide = (ch: string) =>
    /[\u1100-\u115f\u2e80-\u303e\u3041-\u33ff\u3400-\u4dbf\u4e00-\u9fff\ua000-\ua4cf\ua960-\ua97f\uac00-\ud7a3\uf900-\ufaff\ufe10-\ufe19\ufe30-\ufe6f\uff00-\uff60\uffe0-\uffe6]/.test(ch) ||
    /[\u{1f300}-\u{1faff}\u{20000}-\u{3fffd}]/u.test(ch)
  const charWidth = (ch: string) => (isWide(ch) ? 1 : 0.56) * fontSize
  const widthOf = (chunk: string) => Array.from(chunk).reduce((sum, ch) => sum + charWidth(ch), 0)
  const lines: string[] = []

  for (const paragraph of value.split('\n')) {
    if (!paragraph) {
      lines.push('')
      continue
    }
    // Keep Latin words whole; CJK text has no spaces and falls through to
    // per-character wrapping inside the oversized-token branch below.
    const tokens = paragraph.split(/(\s+)/)
    let current = ''
    let width = 0

    for (const token of tokens) {
      if (!token) continue
      const tokenWidth = widthOf(token)
      if (width + tokenWidth <= maxWidth) {
        current += token
        width += tokenWidth
        continue
      }
      if (/^\s+$/.test(token)) {
        lines.push(current.trimEnd())
        current = ''
        width = 0
        continue
      }
      if (current.trim()) {
        lines.push(current.trimEnd())
        current = ''
        width = 0
      }
      let chunk = ''
      let chunkWidth = 0
      for (const ch of token) {
        const w = charWidth(ch)
        if (chunk && chunkWidth + w > maxWidth) {
          lines.push(chunk)
          chunk = ''
          chunkWidth = 0
        }
        chunk += ch
        chunkWidth += w
      }
      current = chunk
      width = chunkWidth
    }
    lines.push(current.trimEnd())
  }

  return lines.length ? lines : ['']
}

export const COLOR_SWATCHES = [
  '#1b241f',
  '#4b5563',
  '#9ca3af',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#92400e',
  '#1e3a8a',
  '#064e3b',
  '#fef3c7',
  '#dbeafe',
  '#dcfce7',
  '#fce7f3',
  '#ede9fe',
  '#f1f5f9',
  '#e2e8f0',
  '#0f172a',
  '#334155',
  '#64748b',
  '#cbd5e1',
  '#fecaca'
]
