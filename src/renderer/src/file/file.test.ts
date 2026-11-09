import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { createEmptyWorkbook, createStarterWorkbook } from '@shared/defaults'
import type { Sheet, Topic, Workbook } from '@shared/types'
import { flattenTopics } from '../model/tree'
import { readXmind, writeXmind } from './xmind'
import { buildXmindXml, parseXmindXml } from './legacy'
import { markdownToWorkbook, workbookToMarkdown } from './markdown'
import { opmlToWorkbook, workbookToOpml } from './opml'
import { htmlToOutline } from './word'

function titlesOf(workbook: Workbook): string[] {
  return workbook.sheets.flatMap((sheet) => flattenTopics(sheet.rootTopic).map((topic) => topic.title))
}

function expectValidTopics(topic: Topic): void {
  expect(typeof topic.id).toBe('string')
  expect(topic.id.length).toBeGreaterThan(0)
  expect(typeof topic.title).toBe('string')
  expect(topic.children).toBeDefined()
  expect(Array.isArray(topic.children?.attached)).toBe(true)
  expect(Array.isArray(topic.children?.detached)).toBe(true)
  for (const child of [...(topic.children?.attached ?? []), ...(topic.children?.detached ?? [])]) {
    expectValidTopics(child)
  }
}

const LEGACY_XML = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<xmap-content xmlns="urn:xmind:xmap:xmlns:content:2.0"
  xmlns:fo="http://www.w3.org/1999/XSL/Format"
  xmlns:svg="http://www.w3.org/2000/svg"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
  xmlns:xlink="http://www.w3.org/1999/xlink" version="2.0">
  <sheet id="sheet-1" theme="theme-1">
    <title>Legacy Sheet</title>
    <topic id="root-1" structure-class="org.xmind.ui.map.clockwise">
      <title>Root</title>
      <children>
        <topics type="attached">
          <topic id="child-1">
            <title>Child One</title>
            <marker-refs>
              <marker-ref marker-id="priority-1"/>
              <marker-ref marker-id="star-red"/>
            </marker-refs>
            <labels><label>alpha</label><label>beta</label></labels>
            <notes><plain>Some note</plain></notes>
            <children>
              <topics type="attached">
                <topic id="grand-1"><title>Grandchild</title></topic>
              </topics>
            </children>
          </topic>
          <topic id="child-2"><title>Child Two</title></topic>
        </topics>
        <topics type="detached">
          <topic id="float-1"><title>Floating</title></topic>
        </topics>
      </children>
      <boundaries><boundary id="boundary-1" range="(child-1,child-2)" title="Group"/></boundaries>
      <summaries>
        <summary id="summary-1" range="(child-1,child-2)" topic-id="child-1">
          <topic id="summary-topic-1"><title>Summary Topic</title></topic>
        </summary>
      </summaries>
    </topic>
    <relationships>
      <relationship id="rel-1" end1="child-1" end2="child-2"><title>depends on</title></relationship>
    </relationships>
  </sheet>
</xmap-content>`

describe('xmind archive IO', () => {
  it('round-trips a workbook through content.json array', async () => {
    const workbook = createStarterWorkbook()
    const bytes = await writeXmind(workbook)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(0)

    const zip = await JSZip.loadAsync(bytes)
    const contentJson = await zip.file('content.json')!.async('string')
    const parsedContent = JSON.parse(contentJson)
    expect(Array.isArray(parsedContent)).toBe(true)
    expect(parsedContent).toHaveLength(1)
    expect(zip.file('content.xml')).toBeTruthy()
    expect(zip.file('Thumbnails/thumbnail.png')).toBeTruthy()

    const restored = await readXmind(bytes)
    expect(restored.sheets).toHaveLength(1)
    expect(restored.activeSheetId).toBe(workbook.activeSheetId)
    expect(restored.sheets[0].id).toBe(workbook.sheets[0].id)
    expect(titlesOf(restored)).toEqual(titlesOf(workbook))
    expectValidTopics(restored.sheets[0].rootTopic)
  })

  it('preserves topic fields, theme and data-url images', async () => {
    const workbook = createStarterWorkbook()
    const root = workbook.sheets[0].rootTopic
    root.hyperlink = 'https://example.com'
    root.labels = ['alpha', 'beta']
    root.notes = { plain: { content: 'note text' } }
    root.markers = [{ markerId: 'star-red' }]
    root.image = { src: 'data:image/png;base64,AAAA', width: 20, height: 20, alt: 'dot' }
    workbook.sheets[0].theme = {
      ...workbook.sheets[0].theme,
      id: 'theme-custom',
      map: { properties: { 'svg:fill': '#fefefe' } }
    }

    const restored = await readXmind(await writeXmind(workbook))
    const restoredRoot = restored.sheets[0].rootTopic
    expect(restoredRoot.hyperlink).toBe('https://example.com')
    expect(restoredRoot.labels).toEqual(['alpha', 'beta'])
    expect(restoredRoot.notes?.plain?.content).toBe('note text')
    expect(restoredRoot.markers?.map((marker) => marker.markerId)).toEqual(['star-red'])
    expect(restoredRoot.image?.src).toBe('data:image/png;base64,AAAA')
    expect(restored.sheets[0].theme.id).toBe('theme-custom')
    expect(restored.sheets[0].theme.map?.properties['svg:fill']).toBe('#fefefe')
  })

  it('reads content.json wrapped in numeric keys and honors metadata.activeSheetId', async () => {
    const base = createStarterWorkbook().sheets[0]
    const sheetA = JSON.parse(JSON.stringify(base)) as Sheet
    const sheetB = JSON.parse(JSON.stringify(base)) as Sheet
    sheetB.id = 'sheet-b'
    sheetB.title = 'Second Map'
    sheetB.rootTopic.id = 'root-b'
    sheetB.rootTopic.title = 'Root B'

    const zip = new JSZip()
    zip.file('content.json', JSON.stringify([{ 0: sheetA, 1: sheetB }]))
    zip.file('metadata.json', JSON.stringify({ activeSheetId: 'sheet-b' }))
    const bytes = await zip.generateAsync({ type: 'uint8array' })

    const workbook = await readXmind(bytes)
    expect(workbook.sheets.map((sheet) => sheet.title)).toEqual(['Map 1', 'Second Map'])
    expect(workbook.activeSheetId).toBe('sheet-b')
    expect(workbook.sheets[1].rootTopic.title).toBe('Root B')
    for (const sheet of workbook.sheets) expectValidTopics(sheet.rootTopic)
  })

  it('prefers the direct sheet over a stale numeric-wrapper copy of the same sheet', async () => {
    const sheet = createStarterWorkbook().sheets[0]
    sheet.title = 'Current Title'
    const childIds = (sheet.rootTopic.children?.attached ?? []).map((topic) => topic.id)
    sheet.relationships = [
      { id: 'rel-keep', end1Id: childIds[0], end2Id: childIds[1], title: 'relates to' }
    ]
    const stale = JSON.parse(JSON.stringify(sheet)) as Sheet
    stale.title = 'Map 1'
    stale.relationships = []

    const zip = new JSZip()
    zip.file('content.json', JSON.stringify([{ ...sheet, 0: stale }]))
    const bytes = await zip.generateAsync({ type: 'uint8array' })

    const workbook = await readXmind(bytes)
    expect(workbook.sheets).toHaveLength(1)
    expect(workbook.sheets[0].title).toBe('Current Title')
    expect(workbook.sheets[0].relationships).toHaveLength(1)
    expect(workbook.sheets[0].relationships?.[0].title).toBe('relates to')
    expect('0' in (workbook.sheets[0] as unknown as Record<string, unknown>)).toBe(false)

    const roundTripped = await readXmind(await writeXmind(workbook))
    expect(roundTripped.sheets[0].title).toBe('Current Title')
    expect(roundTripped.sheets[0].relationships).toHaveLength(1)
  })

  it('reads an object with a sheets array and fills missing ids/titles/children', async () => {
    const zip = new JSZip()
    zip.file(
      'content.json',
      JSON.stringify({
        sheets: [
          {
            title: 'Wrapped',
            rootTopic: {
              title: 'Root',
              children: { attached: [{ title: 'Child' }] }
            }
          }
        ]
      })
    )
    const bytes = await zip.generateAsync({ type: 'uint8array' })

    const workbook = await readXmind(bytes)
    expect(workbook.sheets).toHaveLength(1)
    expect(workbook.sheets[0].title).toBe('Wrapped')
    expect(workbook.sheets[0].id.length).toBeGreaterThan(0)
    expect(workbook.sheets[0].rootTopic.title).toBe('Root')
    expect(workbook.sheets[0].rootTopic.children?.attached?.[0].title).toBe('Child')
    expect(workbook.activeSheetId).toBe(workbook.sheets[0].id)
    expectValidTopics(workbook.sheets[0].rootTopic)
  })

  it('falls back to the first sheet when metadata points at an unknown sheet', async () => {
    const sheet = createStarterWorkbook().sheets[0]
    const zip = new JSZip()
    zip.file('content.json', JSON.stringify([sheet]))
    zip.file('metadata.json', JSON.stringify({ activeSheetId: 'missing-sheet' }))
    const bytes = await zip.generateAsync({ type: 'uint8array' })

    const workbook = await readXmind(bytes)
    expect(workbook.activeSheetId).toBe(sheet.id)
  })

  it('reads content.xml when content.json is absent', async () => {
    const zip = new JSZip()
    zip.file('content.xml', LEGACY_XML)
    const bytes = await zip.generateAsync({ type: 'uint8array' })

    const workbook = await readXmind(bytes)
    expect(workbook.sheets).toHaveLength(1)
    expect(workbook.sheets[0].title).toBe('Legacy Sheet')
    expect(workbook.sheets[0].rootTopic.title).toBe('Root')
    expect(workbook.activeSheetId).toBe('sheet-1')
  })

  it('returns an empty workbook when the archive has no content file', async () => {
    const zip = new JSZip()
    zip.file('readme.txt', 'nothing here')
    const bytes = await zip.generateAsync({ type: 'uint8array' })
    const workbook = await readXmind(bytes)
    expect(workbook.sheets.length).toBe(createEmptyWorkbook().sheets.length)
  })
})

describe('markdown import/export', () => {
  it('round-trips headings and nested bullets', () => {
    const workbook = createStarterWorkbook()
    const markdown = workbookToMarkdown(workbook)
    expect(markdown).toContain('# 中心主题')
    expect(markdown).toContain('## 分支主题 1')

    const restored = markdownToWorkbook(markdown)
    expect(titlesOf(restored)).toEqual(titlesOf(workbook))
  })

  it('parses a first heading and indented bullet lists', () => {
    const workbook = markdownToWorkbook(`# Root Topic

- Alpha
  - Alpha Child
    * Alpha Grandchild
- Beta
+ Gamma`)
    const root = workbook.sheets[0].rootTopic
    expect(root.title).toBe('Root Topic')
    expect(root.children?.attached?.map((topic) => topic.title)).toEqual(['Alpha', 'Beta', 'Gamma'])
    expect(root.children?.attached?.[0].children?.attached?.map((topic) => topic.title)).toEqual([
      'Alpha Child'
    ])
    expect(root.children?.attached?.[0].children?.attached?.[0].children?.attached?.map((topic) => topic.title)).toEqual([
      'Alpha Grandchild'
    ])
  })

  it('handles multiple sheets separated by a horizontal rule', () => {
    const workbook = markdownToWorkbook('# One\n\n- A\n\n---\n\n# Two\n\n- B')
    expect(workbook.sheets.map((sheet) => sheet.rootTopic.title)).toEqual(['One', 'Two'])
    expect(workbook.activeSheetId).toBe(workbook.sheets[0].id)
  })

  it('parses ordered lists as child topics', () => {
    const workbook = markdownToWorkbook(`# Roadmap

## Milestones
1. Requirements freeze
2. Gray release
   1) Canary
3. Launch`)
    const root = workbook.sheets[0].rootTopic
    const milestones = root.children?.attached?.[0]
    expect(milestones?.title).toBe('Milestones')
    expect(milestones?.children?.attached?.map((topic) => topic.title)).toEqual([
      'Requirements freeze',
      'Gray release',
      'Launch'
    ])
    expect(milestones?.children?.attached?.[1].children?.attached?.map((topic) => topic.title)).toEqual(['Canary'])
  })
})

describe('word import outline', () => {
  it('maps headings and nested lists to topics', () => {
    const outline = htmlToOutline(
      '<h1>Meeting</h1><h2>Agenda</h2><ul><li>Budget</li><li>Schedule<ul><li>Q1</li></ul></li></ul>'
    )
    const workbook = markdownToWorkbook(outline)
    const root = workbook.sheets[0].rootTopic
    expect(root.title).toBe('Meeting')
    expect(root.children?.attached?.map((topic) => topic.title)).toEqual(['Agenda'])
    const agenda = root.children?.attached?.[0]
    expect(agenda?.children?.attached?.map((topic) => topic.title)).toEqual(['Budget', 'Schedule'])
    expect(agenda?.children?.attached?.[1].children?.attached?.map((topic) => topic.title)).toEqual(['Q1'])
  })

  it('uses the first plain paragraph as the root when there are no headings', () => {
    const outline = htmlToOutline(
      '<p><strong>Meeting notes</strong></p><p>\t•\tBudget</p><p>Conclusion: start next week.</p>'
    )
    expect(outline.split('\n')).toEqual(['# Meeting notes', '- Budget', '- Conclusion: start next week.'])
    const workbook = markdownToWorkbook(outline)
    expect(workbook.sheets[0].rootTopic.title).toBe('Meeting notes')
    expect(workbook.sheets[0].rootTopic.children?.attached?.map((topic) => topic.title)).toEqual([
      'Budget',
      'Conclusion: start next week.'
    ])
  })
})

describe('opml import/export', () => {
  it('round-trips sheets, roots and children', () => {
    const workbook = createStarterWorkbook()
    const opml = workbookToOpml(workbook)
    expect(opml).toContain('<opml')
    expect(opml).toContain('_xmindSheet="true"')

    const restored = opmlToWorkbook(opml)
    expect(restored.sheets).toHaveLength(1)
    expect(restored.sheets[0].title).toBe(workbook.sheets[0].title)
    expect(titlesOf(restored)).toEqual(titlesOf(workbook))
  })

  it('imports a generic single-root OPML outline', () => {
    const workbook = opmlToWorkbook(`<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>Imported</title></head>
  <body>
    <outline text="Imported">
      <outline text="First"/>
      <outline text="Second"><outline text="Nested"/></outline>
    </outline>
  </body>
</opml>`)
    expect(workbook.sheets).toHaveLength(1)
    expect(workbook.sheets[0].rootTopic.title).toBe('Imported')
    expect(workbook.sheets[0].rootTopic.children?.attached?.map((topic) => topic.title)).toEqual([
      'First',
      'Second'
    ])
  })
})

describe('legacy XMind 8 XML', () => {
  it('parses sheets, topics, markers, labels, notes, boundaries, summaries and relationships', () => {
    const sheets = parseXmindXml(LEGACY_XML)
    expect(sheets).toHaveLength(1)
    const sheet = sheets[0]
    expect(sheet.id).toBe('sheet-1')
    expect(sheet.title).toBe('Legacy Sheet')
    expect(sheet.rootTopic.title).toBe('Root')
    expect(sheet.rootTopic.children?.attached?.map((topic) => topic.title)).toEqual(['Child One', 'Child Two'])
    expect(sheet.rootTopic.children?.detached?.map((topic) => topic.title)).toEqual(['Floating'])

    const child = sheet.rootTopic.children?.attached?.[0]
    expect(child?.markers?.map((marker) => marker.markerId)).toEqual(['priority-1', 'star-red'])
    expect(child?.labels).toEqual(['alpha', 'beta'])
    expect(child?.notes?.plain?.content).toBe('Some note')
    expect(child?.children?.attached?.[0].title).toBe('Grandchild')
    expect(sheet.rootTopic.boundaries?.[0].title).toBe('Group')
    expect(sheet.rootTopic.summaries?.[0].title).toBe('Summary Topic')
    expect(sheet.rootTopic.summaries?.[0].topicId).toBe('child-1')
    expect(sheet.relationships?.[0]).toMatchObject({ end1Id: 'child-1', end2Id: 'child-2', title: 'depends on' })
  })

  it('builds XML that parses back into the same structure', () => {
    const sheet = parseXmindXml(LEGACY_XML)[0]
    const xml = buildXmindXml({ sheets: [sheet], activeSheetId: sheet.id })
    expect(xml).toContain('xmap-content')
    expect(xml).toContain('urn:xmind:xmap:xmlns:content:2.0')

    const reparsed = parseXmindXml(xml)
    expect(reparsed).toHaveLength(1)
    expect(reparsed[0].rootTopic.title).toBe('Root')
    expect(reparsed[0].rootTopic.children?.attached?.map((topic) => topic.title)).toEqual(['Child One', 'Child Two'])
    expect(reparsed[0].rootTopic.children?.detached?.map((topic) => topic.title)).toEqual(['Floating'])
    const child = reparsed[0].rootTopic.children?.attached?.[0]
    expect(child?.markers?.map((marker) => marker.markerId)).toEqual(['priority-1', 'star-red'])
    expect(child?.labels).toEqual(['alpha', 'beta'])
    expect(child?.notes?.plain?.content).toBe('Some note')
    expect(reparsed[0].rootTopic.boundaries?.[0].title).toBe('Group')
    expect(reparsed[0].rootTopic.summaries?.[0].title).toBe('Summary Topic')
    expect(reparsed[0].relationships?.[0].title).toBe('depends on')
  })
})
