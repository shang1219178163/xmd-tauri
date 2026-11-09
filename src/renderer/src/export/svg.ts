/**
 * Static SVG rendering of a workbook's active sheet.
 *
 * Uses the shared layout engine so exported images match the on-canvas
 * positions. Edges are drawn first, then relationship curves, boundaries are
 * omitted and topic shapes/text/markers/labels/images are layered on top.
 */
import type {
  EdgeKind,
  LayoutDecoration,
  LayoutEdge,
  LayoutNode,
  Point,
  Sheet,
  Workbook
} from '@shared/types'
import { rainbowPalette } from '@shared/defaults'
import { layoutSheet } from '../layout'
import { activeSheet } from '../model/tree'
import {
  mixWithBlack,
  mixWithWhite,
  resolveTopicStyle,
  shapeOf,
  wrapText,
  type ResolvedStyle
} from '../model/style'
import { markerById } from '../data/markers'
import { braceVerticalPath, edgeToPath } from '../model/edge-path'

const PADDING = 36

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function colorOf(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function backgroundOf(sheet: Sheet): string {
  if (sheet.background) return sheet.background
  return colorOf(sheet.theme?.map?.properties?.['svg:fill'], '#ffffff')
}

/** Cubic/elbow/straight path between two points, matching the canvas renderer. */
function edgePath(a: Point, b: Point, kind: string): string {
  if (kind === 'straight') return `M ${round(a.x)} ${round(a.y)} L ${round(b.x)} ${round(b.y)}`
  const dx = Math.abs(b.x - a.x)
  const dy = Math.abs(b.y - a.y)
  if (dx >= dy) {
    const control = Math.max(24, dx * 0.45)
    return `M ${round(a.x)} ${round(a.y)} C ${round(a.x + control)} ${round(a.y)}, ${round(
      b.x - control
    )} ${round(b.y)}, ${round(b.x)} ${round(b.y)}`
  }
  const control = Math.max(24, dy * 0.45)
  return `M ${round(a.x)} ${round(a.y)} C ${round(a.x)} ${round(a.y + control)}, ${round(b.x)} ${round(
    b.y - control
  )}, ${round(b.x)} ${round(b.y)}`
}

function edgeMarkup(edge: LayoutEdge, style: ResolvedStyle | undefined, kind: EdgeKind): string {
  if (!edge.points.length) return ''
  const color = colorOf(edge.color, style?.lineColor ?? '#93c5fd')
  const width = edge.width ?? style?.lineWidth ?? 2
  const dash = edge.dashed ? ' stroke-dasharray="6 5"' : ''
  const path = edgeToPath(edge)
  if (kind === 'tapered') {
    return `<path d="${path}" fill="${escapeXml(color)}" stroke="${escapeXml(
      color
    )}" stroke-width="0.5"${dash}/>`
  }
  return `<path d="${path}" fill="none" stroke="${escapeXml(
    color
  )}" stroke-width="${round(width)}" stroke-linecap="round" stroke-linejoin="round"${dash}/>`
}

function decorationMarkup(decoration: LayoutDecoration): string {
  if (!decoration.points.length) return ''
  const color = colorOf(decoration.color, '#93c5fd')
  const width = decoration.width ?? 2
  const [start, end] = decoration.points
  if (!start) return ''
  const path =
    decoration.kind === 'brace' && end
      ? braceVerticalPath(start, end)
      : `M ${decoration.points.map((point) => `${round(point.x)} ${round(point.y)}`).join(' L ')}`
  return `<path d="${path}" fill="none" stroke="${escapeXml(color)}" stroke-width="${round(
    width
  )}" stroke-linecap="round" stroke-linejoin="round"/>`
}

function pillWidth(text: string, fontSize: number): number {
  let width = 0
  for (const char of text) {
    width += /[⺀-鿿가-힯＀-￯]/.test(char) ? fontSize : fontSize * 0.56
  }
  return width + 12
}

function textMarkup(
  node: LayoutNode,
  style: ResolvedStyle,
  lines: string[],
  startY: number,
  lineHeight: number,
  align: 'left' | 'center'
): string {
  const anchorX = align === 'left' ? node.x + 12 : node.x + node.width / 2
  const anchor = align === 'left' ? 'start' : 'middle'
  const decoration = node.topic.hyperlink || node.topic.href ? ' text-decoration="underline"' : ''
  const spans = lines
    .map(
      (line, index) =>
        `<tspan x="${round(anchorX)}" y="${round(startY + index * lineHeight)}">${escapeXml(line || ' ')}</tspan>`
    )
    .join('')
  return `<text text-anchor="${anchor}" fill="${escapeXml(style.color)}" font-family="${escapeXml(
    style.fontFamily
  )}" font-size="${round(style.fontSize)}" font-weight="${escapeXml(style.fontWeight)}" font-style="${escapeXml(
    style.fontStyle
  )}"${decoration}>${spans}</text>`
}

function shapeMarkup(node: LayoutNode, style: ResolvedStyle, fillValue: string): string {
  const width = node.width
  const height = node.height
  const fill = escapeXml(fillValue)
  const stroke = escapeXml(style.borderColor)
  const strokeWidth = round(style.borderWidth)
  const kind = shapeOf(style.shapeClass)
  const filter = style.handDrawn ? ' filter="url(#rough-edge)"' : ''
  if (kind === 'ellipse') {
    return `<ellipse cx="${round(node.x + width / 2)}" cy="${round(node.y + height / 2)}" rx="${round(
      width / 2
    )}" ry="${round(height / 2)}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${filter}/>`
  }
  if (kind === 'diamond') {
    const points = [
      `${round(node.x + width / 2)},${round(node.y)}`,
      `${round(node.x + width)},${round(node.y + height / 2)}`,
      `${round(node.x + width / 2)},${round(node.y + height)}`,
      `${round(node.x)},${round(node.y + height / 2)}`
    ].join(' ')
    return `<polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${filter}/>`
  }
  if (kind === 'underline') {
    return `<line x1="${round(node.x)}" y1="${round(node.y + height - 1)}" x2="${round(
      node.x + width
    )}" y2="${round(node.y + height - 1)}" stroke="${stroke}" stroke-width="${Math.max(1, strokeWidth)}"/>`
  }
  const rx = kind === 'capsule' ? height / 2 : kind === 'rounded' ? Math.min(10, height / 3) : 0
  return `<rect x="${round(node.x)}" y="${round(node.y)}" width="${round(width)}" height="${round(
    height
  )}" rx="${round(rx)}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${filter}/>`
}

function markerMarkup(node: LayoutNode): string {
  const markers = node.topic.markers ?? []
  if (!markers.length) return ''
  const icons = markers
    .slice(0, 7)
    .map((marker) => markerById(marker.markerId)?.icon ?? marker.markerId)
    .join(' ')
  return `<text x="${round(node.x + 8)}" y="${round(node.y + 13)}" font-size="11" fill="#475569">${escapeXml(
    icons
  )}</text>`
}

function labelMarkup(node: LayoutNode, style: ResolvedStyle): string {
  const labels = (node.topic.labels ?? []).filter(Boolean).slice(0, 4)
  if (!labels.length) return ''
  let x = node.x
  const y = node.y + node.height + 4
  const fontSize = 9
  const height = 15
  const parts: string[] = []
  for (const label of labels) {
    const width = pillWidth(label, fontSize)
    parts.push(
      `<rect x="${round(x)}" y="${round(y)}" width="${round(width)}" height="${height}" rx="${height / 2}" fill="#ffffff" fill-opacity="0.92" stroke="${escapeXml(
        style.borderColor
      )}" stroke-opacity="0.6"/>`,
      `<text x="${round(x + width / 2)}" y="${round(y + height / 2 + 3.2)}" text-anchor="middle" font-size="${fontSize}" fill="${escapeXml(
        style.color
      )}">${escapeXml(label)}</text>`
    )
    x += width + 4
  }
  return `<g>${parts.join('')}</g>`
}

function imageMarkup(node: LayoutNode): string {
  const image = node.topic.image
  if (!image?.src) return ''
  const height = Math.min(72, Math.max(0, node.height - 34))
  if (height <= 0) return ''
  return `<image href="${escapeXml(image.src)}" x="${round(node.x + 6)}" y="${round(
    node.y + 6
  )}" width="${round(Math.max(1, node.width - 12))}" height="${round(
    height
  )}" preserveAspectRatio="xMidYMid slice"/>`
}

function topicMarkup(node: LayoutNode, sheet: Sheet, style: ResolvedStyle, fillValue: string): string {
  const labels = node.topic.labels ?? []
  const hasImage = Boolean(node.topic.image?.src)
  const imageHeight = hasImage ? Math.min(72, Math.max(0, node.height - 34)) : 0
  const textTop = node.y + (hasImage ? imageHeight + 6 : 0)
  const textAreaHeight = node.height - (hasImage ? imageHeight + 6 : 0) - (labels.length ? 15 : 0)
  const maxTextWidth = Math.max(24, node.width - 24)
  const lineHeight = style.fontSize * 1.35
  const wrapped = wrapText(node.topic.title || ' ', maxTextWidth, style.fontSize)
  const maxLines = Math.max(1, Math.floor((textAreaHeight - 4) / lineHeight))
  const visible =
    wrapped.length > maxLines
      ? [...wrapped.slice(0, maxLines - 1), `${wrapped[maxLines - 1].slice(0, -1)}…`]
      : wrapped
  const startY =
    textTop + Math.max(6, (textAreaHeight - visible.length * lineHeight) / 2) + style.fontSize
  const alignProperty = String(
    node.topic.style?.properties?.['fo:text-align'] ??
      node.topic.style?.properties?.['text-align'] ??
      sheet.theme?.subTopic?.properties?.['fo:text-align'] ??
      'center'
  ).toLowerCase()
  const align: 'left' | 'center' = alignProperty.startsWith('left') || alignProperty === 'start' ? 'left' : 'center'

  return `<g data-topic-id="${escapeXml(node.id)}">${shapeMarkup(node, style, fillValue)}${imageMarkup(
    node
  )}${markerMarkup(node)}${textMarkup(node, style, visible, startY, lineHeight, align)}${labelMarkup(
    node,
    style
  )}</g>`
}

function relationshipsMarkup(sheet: Sheet, nodes: Map<string, LayoutNode>): string {
  const relationships = sheet.relationships ?? []
  const parts: string[] = []
  for (const relationship of relationships) {
    const from = nodes.get(relationship.end1Id)
    const to = nodes.get(relationship.end2Id)
    if (!from || !to) continue
    const a = { x: from.x + from.width / 2, y: from.y + from.height / 2 }
    const b = { x: to.x + to.width / 2, y: to.y + to.height / 2 }
    const color = colorOf(relationship.style?.properties?.['line-color'], '#f59e0b')
    parts.push(
      `<path d="${edgePath(a, b, 'curve')}" fill="none" stroke="${escapeXml(
        color
      )}" stroke-width="2" stroke-dasharray="6 4" marker-end="url(#relationship-arrow)"/>`
    )
    if (relationship.title) {
      parts.push(
        `<text x="${round((a.x + b.x) / 2)}" y="${round(
          (a.y + b.y) / 2 - 6
        )}" text-anchor="middle" font-size="10" fill="${escapeXml(color)}">${escapeXml(
          relationship.title
        )}</text>`
      )
    }
  }
  return parts.join('')
}

export interface SvgResult {
  svg: string
  width: number
  height: number
}

/** Render the workbook's active sheet as a standalone SVG document. */
export function sheetToSvg(workbook: Workbook): SvgResult {
  const sheet = activeSheet(workbook)
  const layout = layoutSheet(sheet)
  const nodes = Array.from(layout.nodes.values())
  const bounds = layout.bounds

  const width = Math.max(1, Math.ceil((Number.isFinite(bounds.width) ? bounds.width : 0) + PADDING * 2))
  const height = Math.max(1, Math.ceil((Number.isFinite(bounds.height) ? bounds.height : 0) + PADDING * 2))
  const offsetX = PADDING - (Number.isFinite(bounds.x) ? bounds.x : 0)
  const offsetY = PADDING - (Number.isFinite(bounds.y) ? bounds.y : 0)

  const detachedIds = new Set((sheet.rootTopic.children?.detached ?? []).map((topic) => topic.id))
  const rainbowEnabled =
    sheet.settings?.rainbow === true ||
    (sheet.settings?.rainbow !== false && (sheet.theme as { rainbow?: boolean }).rainbow === true)
  const palette = rainbowPalette(sheet.settings?.rainbowPalette)
  const attachedRoots = sheet.rootTopic.children?.attached ?? []
  const rootIndex = new Map(attachedRoots.map((topic, index) => [topic.id, index] as const))
  const styles = new Map<string, ResolvedStyle>()
  for (const node of nodes) {
    let style = resolveTopicStyle(node.topic, sheet, node.depth, detachedIds.has(node.id))
    if (rainbowEnabled) {
      let current: LayoutNode | undefined = node
      while (current && current.depth > 1 && current.parentId) current = layout.nodes.get(current.parentId)
      const index = current ? rootIndex.get(current.id) : undefined
      if (index !== undefined) {
        const color = palette[index % palette.length]
        const custom = node.topic.style?.properties ?? {}
        if (node.depth === 1) {
          style = {
            ...style,
            fill: typeof custom['svg:fill'] === 'string' ? style.fill : color,
            color: typeof custom['fo:color'] === 'string' ? style.color : '#FFFFFF',
            borderColor: 'transparent',
            borderWidth: 0,
            lineColor: color,
            lineWidth: Math.max(style.lineWidth, 2.5),
            handDrawn: true
          }
        } else {
          style = {
            ...style,
            fill: typeof custom['svg:fill'] === 'string' ? style.fill : mixWithWhite(color, 0.9),
            color: typeof custom['fo:color'] === 'string' ? style.color : mixWithBlack(color, 0.42),
            borderColor: typeof custom['border-line-color'] === 'string' ? style.borderColor : mixWithWhite(color, 0.32),
            lineColor: color,
            fillPattern: undefined,
            handDrawn: true
          }
        }
      }
    }
    if (sheet.settings?.handDrawn === true) style = { ...style, handDrawn: true }
    styles.set(node.id, style)
  }

  const hatch = new Map<
    string,
    { id: string; fill: string; patternColor: string; pattern: 'diagonal' | 'cross' }
  >()
  for (const style of styles.values()) {
    if (!style.fillPattern) continue
    const key = `${style.fill}|${style.patternColor ?? ''}|${style.fillPattern}`
    if (!hatch.has(key)) {
      hatch.set(key, {
        id: `hatch-${hatch.size}`,
        fill: style.fill,
        patternColor: style.patternColor ?? 'rgba(255,255,255,0.25)',
        pattern: style.fillPattern
      })
    }
  }
  const fillFor = (style: ResolvedStyle): string => {
    if (!style.fillPattern) return style.fill
    const def = hatch.get(`${style.fill}|${style.patternColor ?? ''}|${style.fillPattern}`)
    return def ? `url(#${def.id})` : style.fill
  }
  const hatchDefs = Array.from(hatch.values())
    .map((def) => {
      const cross =
        def.pattern === 'cross'
          ? `<line x1="0" y1="4.5" x2="9" y2="4.5" stroke="${escapeXml(def.patternColor)}" stroke-width="2.4"/>`
          : ''
      return `<pattern id="${def.id}" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="${escapeXml(def.fill)}"/><line x1="0" y1="0" x2="0" y2="9" stroke="${escapeXml(def.patternColor)}" stroke-width="2.4"/>${cross}</pattern>`
    })
    .join('')

  const decorations = layout.decorations.map(decorationMarkup).join('')
  const edges = layout.edges
    .map((edge) => {
      const fromStyle = styles.get(edge.fromId)
      const toStyle = styles.get(edge.toId) ?? fromStyle
      return edgeMarkup(edge, toStyle, edge.kind)
    })
    .join('')
  const topics = nodes
    .map((node) => {
      const style = styles.get(node.id)!
      return topicMarkup(node, sheet, style, fillFor(style))
    })
    .join('')
  const relationships = relationshipsMarkup(sheet, layout.nodes)

  const svg = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<defs><marker id="relationship-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b"/></marker><filter id="rough-edge" x="-6%" y="-6%" width="112%" height="112%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="1" seed="9" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="1.35" xChannelSelector="R" yChannelSelector="G"/></filter>${hatchDefs}</defs>`,
    `<rect x="0" y="0" width="${width}" height="${height}" fill="${escapeXml(backgroundOf(sheet))}"/>`,
    `<g transform="translate(${round(offsetX)} ${round(offsetY)})">`,
    decorations,
    edges,
    relationships,
    topics,
    `</g>`,
    `</svg>`
  ].join('')

  return { svg, width, height }
}
