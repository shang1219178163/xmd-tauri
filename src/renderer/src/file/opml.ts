/**
 * OPML import/export.
 *
 * Every sheet is written as a top-level `<outline>` marked with
 * `_xmindSheet="true"`; its root topic is nested inside. Generic OPML files
 * without that marker are imported as a single sheet, using the OPML head
 * title (or the only top-level outline) as the root topic.
 */
import { XMLBuilder, XMLParser } from 'fast-xml-parser'
import type { Sheet, Topic, Workbook } from '@shared/types'
import { createEmptyWorkbook, createSheet, createTopic } from '@shared/defaults'

type AnyRecord = Record<string, unknown>

const XML_ATTRIBUTE = '@_'

function attr(node: unknown, name: string): string | undefined {
  if (!node || typeof node !== 'object') return undefined
  const value = (node as AnyRecord)[`${XML_ATTRIBUTE}${name}`]
  return value === undefined || value === null ? undefined : String(value)
}

function asArray<T = unknown>(value: unknown): T[] {
  if (value === undefined || value === null) return []
  return (Array.isArray(value) ? value : [value]) as T[]
}

function textOf(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value && typeof value === 'object') {
    const record = value as AnyRecord
    if (record['#text'] !== undefined) return textOf(record['#text'])
  }
  return ''
}

function outlineText(node: unknown): string {
  return (attr(node, 'text') ?? attr(node, 'title') ?? textOf(node)).trim() || 'Untitled'
}

function topicToOutline(topic: Topic): AnyRecord {
  const node: AnyRecord = {
    [`${XML_ATTRIBUTE}text`]: topic.title || 'Untitled',
    [`${XML_ATTRIBUTE}_xmindId`]: topic.id
  }
  const note = topic.notes?.plain?.content
  if (note) node[`${XML_ATTRIBUTE}_note`] = note
  const children = topic.children?.attached ?? []
  if (children.length) node.outline = children.map(topicToOutline)
  return node
}

/** Serialize a workbook as OPML 2.0. */
export function workbookToOpml(workbook: Workbook): string {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: XML_ATTRIBUTE,
    suppressEmptyNode: true,
    suppressBooleanAttributes: false,
    format: true,
    indentBy: '  ',
    processEntities: true
  })
  const body = workbook.sheets.map((sheet) => ({
    [`${XML_ATTRIBUTE}text`]: sheet.title || sheet.rootTopic.title || 'Sheet',
    [`${XML_ATTRIBUTE}_xmindSheet`]: 'true',
    [`${XML_ATTRIBUTE}_xmindId`]: sheet.id,
    outline: topicToOutline(sheet.rootTopic)
  }))
  const document: AnyRecord = {
    '?xml': {
      [`${XML_ATTRIBUTE}version`]: '1.0',
      [`${XML_ATTRIBUTE}encoding`]: 'UTF-8',
      [`${XML_ATTRIBUTE}standalone`]: 'no'
    },
    opml: {
      [`${XML_ATTRIBUTE}version`]: '2.0',
      head: { title: 'xmd Workbook' },
      body: body.length ? { outline: body } : {}
    }
  }
  return builder.build(document)
}

function parseOutlineTopic(node: unknown): Topic {
  const record = node && typeof node === 'object' ? (node as AnyRecord) : {}
  const topic = createTopic(outlineText(record))
  const id = attr(record, 'id') ?? attr(record, '_xmindId')
  if (id) topic.id = id
  const note = attr(record, '_note')
  if (note) topic.notes = { plain: { content: note } }
  const children = asArray(record.outline)
  if (children.length) {
    topic.children = { attached: children.map(parseOutlineTopic), detached: [] }
  }
  return topic
}

function buildSheet(title: string, rootTopic: Topic, id?: string, index = 0): Sheet {
  const sheet = createSheet(title || `Map ${index + 1}`, rootTopic.title)
  if (id) sheet.id = id
  sheet.title = title || rootTopic.title || `Map ${index + 1}`
  sheet.rootTopic = rootTopic
  return sheet
}

/** Parse an OPML document into a workbook. */
export function opmlToWorkbook(xml: string): Workbook {
  if (!xml || !xml.trim()) return createEmptyWorkbook()
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: XML_ATTRIBUTE,
    trimValues: true,
    parseTagValue: false,
    parseAttributeValue: false,
    allowBooleanAttributes: true,
    isArray: (name) => name === 'outline'
  })
  let document: AnyRecord
  try {
    document = parser.parse(xml.replace(/^﻿/, '')) as AnyRecord
  } catch {
    return createEmptyWorkbook()
  }
  const opml = (document.opml ?? document) as AnyRecord
  const bodyNode = opml.body as AnyRecord | undefined
  const topLevel = asArray<AnyRecord>(bodyNode?.outline)
  if (!topLevel.length) return createEmptyWorkbook()

  const hasSheetMarkers = topLevel.every((node) => attr(node, '_xmindSheet') === 'true')
  if (hasSheetMarkers) {
    const sheets = topLevel.map((node, index) => {
      const nested = asArray<AnyRecord>(node.outline)[0]
      const rootTopic = nested ? parseOutlineTopic(nested) : createTopic(outlineText(node))
      return buildSheet(outlineText(node), rootTopic, attr(node, '_xmindId'), index)
    })
    return { sheets, activeSheetId: sheets[0].id }
  }

  const headTitle = textOf((opml.head as AnyRecord | undefined)?.title).trim()
  if (topLevel.length === 1) {
    const rootTopic = parseOutlineTopic(topLevel[0])
    const sheet = buildSheet(headTitle || rootTopic.title, rootTopic, undefined, 0)
    return { sheets: [sheet], activeSheetId: sheet.id }
  }

  const rootTitle = headTitle || 'Central Topic'
  const rootTopic = createTopic(rootTitle)
  rootTopic.children = { attached: topLevel.map(parseOutlineTopic), detached: [] }
  const sheet = buildSheet(rootTitle, rootTopic, undefined, 0)
  return { sheets: [sheet], activeSheetId: sheet.id }
}
