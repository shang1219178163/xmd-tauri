import { describe, expect, it } from 'vitest'
import { createStarterWorkbook, createTopic } from '@shared/defaults'
import { STRUCTURE_LIST, structureClassOf } from '@shared/structures'
import { THEME_PRESETS } from '../data/themes'
import type { LayoutEdge } from '@shared/types'
import { sheetToSvg } from './svg'
import { edgeToPath } from '../model/edge-path'
import { workbookToPlainText, workbookToMarkdown } from './text'
import { buildPdfHtml } from './pdf'
import { workbookToXlsx } from './spreadsheet'
import { workbookToDocx } from './document'
import { workbookToPptx } from './presentation'

describe('SVG export', () => {
  it('renders an SVG with dimensions, edges and topic titles', () => {
    const workbook = createStarterWorkbook()
    const { svg, width, height } = sheetToSvg(workbook)

    expect(width).toBeGreaterThan(0)
    expect(height).toBeGreaterThan(0)
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
    expect(svg).toContain('<path')
    expect(svg).toContain('中心主题')
    expect(svg).toContain('分支主题 1')
    expect(svg).toContain('分支主题 3')
  })

  it('honours the sheet hand-drawn setting', () => {
    const workbook = createStarterWorkbook()
    workbook.sheets[0].theme = structuredClone(THEME_PRESETS[1].theme)
    workbook.sheets[0].settings = { rainbow: false, handDrawn: false }
    expect(sheetToSvg(workbook).svg).not.toContain('filter="url(#rough-edge)"')
    workbook.sheets[0].settings = { rainbow: false, handDrawn: true }
    expect(sheetToSvg(workbook).svg).toContain('filter="url(#rough-edge)"')
  })

  it('escapes XML-sensitive characters', () => {
    const workbook = createStarterWorkbook()
    workbook.sheets[0].rootTopic.title = 'A & B <C>'
    workbook.sheets[0].rootTopic.children = { attached: [createTopic('"quoted"')], detached: [] }
    const { svg } = sheetToSvg(workbook)
    expect(svg).toContain('A &amp; B &lt;C&gt;')
    expect(svg).toContain('&quot;quoted&quot;')
  })

  it('renders bight theme branches through the shared edge path', () => {
    const workbook = createStarterWorkbook()
    workbook.sheets[0].theme.mainTopic = {
      properties: { 'line-class': 'org.xmind.branchConnection.bight' }
    }
    const { svg } = sheetToSvg(workbook)
    const curves = [...svg.matchAll(/<path d="M [^"]* C [^"]*"/g)]
    expect(curves).toHaveLength(3)
  })

  it('renders cross fill patterns with a second hatch line', () => {
    const workbook = createStarterWorkbook()
    const central = workbook.sheets[0].theme.centralTopic ?? { properties: {} }
    workbook.sheets[0].theme.centralTopic = {
      ...central,
      properties: { ...central.properties, 'fill-pattern': 'cross' }
    }
    const { svg } = sheetToSvg(workbook)
    const patterns = [...svg.matchAll(/<pattern[^>]*>(.*?)<\/pattern>/g)].map((match) => match[1])
    expect(patterns.some((pattern) => (pattern.match(/<line/g) ?? []).length === 2)).toBe(true)
  })

  it('defaults every structure to solid fills', () => {
    const workbook = createStarterWorkbook()
    const hatched = STRUCTURE_LIST.filter((structure) => {
      workbook.sheets[0].rootTopic.structureClass = structureClassOf(structure.key)
      return sheetToSvg(workbook).svg.includes('id="hatch-')
    }).map((structure) => structure.key)
    expect(hatched).toEqual([])
  })

  it('keeps an explicitly requested hatch pattern on rainbow branches', () => {
    const workbook = createStarterWorkbook()
    const branch = workbook.sheets[0].rootTopic.children?.attached?.[0]
    if (!branch) throw new Error('starter workbook is missing a branch topic')
    branch.style = { properties: { 'fill-pattern': 'diagonal' } }
    expect(sheetToSvg(workbook).svg).toContain('id="hatch-')
  })

  it('colours exported branches from the rainbow palette', () => {
    const { svg } = sheetToSvg(createStarterWorkbook())
    const strokes = [...svg.matchAll(/<path d="M [^"]*" fill="none" stroke="([^"]+)"/g)].map(
      (match) => match[1]
    )
    expect(new Set(strokes).size).toBeGreaterThan(1)
  })

  it('exports brace and fishbone decorations', () => {
    const brace = createStarterWorkbook()
    brace.sheets[0].rootTopic.structureClass = 'org.xmind.ui.brace.right'
    const braceSvg = sheetToSvg(brace).svg
    expect(braceSvg).toContain('Q ')
    expect(braceSvg).toContain('stroke-linecap="round"')

    const fishbone = createStarterWorkbook()
    fishbone.sheets[0].rootTopic.structureClass = 'org.xmind.ui.fishbone.leftHeaded'
    const fishSvg = sheetToSvg(fishbone).svg
    expect(fishSvg).toContain('<path')
    expect(fishSvg).toContain('stroke-linejoin="round"')
  })
})

describe('SVG branch paths', () => {
  it('renders the same branch path as the canvas', () => {
    const edge: LayoutEdge = {
      id: 'e',
      fromId: 'a',
      toId: 'b',
      points: [
        { x: 100, y: 20 },
        { x: 113, y: 20 },
        { x: 130.4, y: -20 },
        { x: 200, y: -20 }
      ],
      orientation: 'horizontal',
      kind: 'curve'
    }
    expect(edgeToPath(edge)).toBe('M 100 20 L 113 20 Q 130.4 -20 200 -20')
  })

  it('shares extended line types with the canvas', () => {
    const edge: LayoutEdge = {
      id: 'e',
      fromId: 'a',
      toId: 'b',
      points: [
        { x: 100, y: 20 },
        { x: 113, y: 20 },
        { x: 178.25, y: 20 },
        { x: 156.5, y: -20 },
        { x: 200, y: -20 }
      ],
      orientation: 'horizontal',
      kind: 'bight'
    }
    expect(edgeToPath(edge)).toBe('M 100 20 L 113 20 C 178.25 20 156.5 -20 200 -20')
  })

  it('returns an empty path for empty points', () => {
    const edge: LayoutEdge = {
      id: 'e',
      fromId: 'a',
      toId: 'b',
      points: [],
      orientation: 'horizontal',
      kind: 'curve'
    }
    expect(edgeToPath(edge)).toBe('')
  })
})

describe('plain text and markdown export', () => {
  it('includes every topic title', () => {
    const workbook = createStarterWorkbook()
    const text = workbookToPlainText(workbook)
    for (const title of ['中心主题', '分支主题 1', '分支主题 2', '分支主题 3']) {
      expect(text).toContain(title)
    }
  })

  it('re-exports the markdown exporter', () => {
    const markdown = workbookToMarkdown(createStarterWorkbook())
    expect(markdown).toContain('# 中心主题')
  })
})

describe('PDF HTML export', () => {
  it('embeds one SVG page per sheet', () => {
    const html = buildPdfHtml(createStarterWorkbook(), true)
    expect(html).toContain('@page')
    expect(html).toContain('landscape')
    expect(html).toContain('<svg')
    expect(html).toContain('class="page"')
  })
})

describe('binary document exports', () => {
  it('returns non-empty xlsx bytes', async () => {
    const bytes = await workbookToXlsx(createStarterWorkbook())
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(0)
  })

  it('returns non-empty docx bytes', async () => {
    const bytes = await workbookToDocx(createStarterWorkbook())
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(0)
  })

  it('returns non-empty pptx bytes', async () => {
    const bytes = await workbookToPptx(createStarterWorkbook())
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(0)
  })
})
