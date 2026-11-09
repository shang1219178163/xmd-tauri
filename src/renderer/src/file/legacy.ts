/**
 * XMind 8 legacy XML (content.xml) reader/writer.
 *
 * XMind 8 stores a workbook as a ZIP archive with a content.xml document using
 * the `urn:xmind:xmap:xmlns:content:2.0` namespace. This module implements the
 * subset needed to open and save those files: sheets, topics, attached and
 * detached children, marker refs, labels, notes, boundaries, summaries,
 * relationships and a minimal inline theme representation.
 */
import { XMLBuilder, XMLParser } from 'fast-xml-parser'
import {
  DEFAULT_THEME,
  createTopic,
  newId
} from '@shared/defaults'
import type {
  Boundary,
  Marker,
  Note,
  Relationship,
  Sheet,
  Style,
  StyleProperties,
  Summary,
  Theme,
  Topic,
  Workbook
} from '@shared/types'

type AnyRecord = Record<string, unknown>

const XML_ATTRIBUTE = '@_'

function attr(node: unknown, name: string): string | undefined {
  if (!node || typeof node !== 'object') return undefined
  const value = (node as AnyRecord)[`${XML_ATTRIBUTE}${name}`]
  if (value === undefined || value === null) return undefined
  return String(value)
}

function asArray<T = unknown>(value: unknown): T[] {
  if (value === undefined || value === null) return []
  return (Array.isArray(value) ? value : [value]) as T[]
}

/** Extract text from a string, number or parsed XML node (including nested #text). */
function deepText(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(deepText).join('')
  if (typeof value === 'object') {
    const record = value as AnyRecord
    if (record['#text'] !== undefined) return deepText(record['#text'])
    return Object.entries(record)
      .filter(([key]) => !key.startsWith(XML_ATTRIBUTE) && key !== '#text')
      .map(([, child]) => deepText(child))
      .join('')
  }
  return ''
}

function textOf(value: unknown): string {
  return deepText(value).trim()
}

function collectProperties(node: unknown): StyleProperties {
  const properties: StyleProperties = {}
  if (!node || typeof node !== 'object') return properties
  for (const [key, value] of Object.entries(node as AnyRecord)) {
    if (key.startsWith(XML_ATTRIBUTE) || key === '#text') continue
    // `<property name="..." value="..."/>` form
    if (key === 'property') {
      for (const item of asArray(value)) {
        const name = attr(item, 'name')
        const raw = attr(item, 'value')
        if (name && raw !== undefined) properties[name] = raw
      }
      continue
    }
    if (value === undefined || value === null) continue
    if (typeof value === 'object' && !Array.isArray(value)) {
      const nested = (value as AnyRecord)['#text']
      if (nested !== undefined) properties[key] = String(nested)
      continue
    }
    if (Array.isArray(value)) {
      if (value.every((item) => typeof item === 'string' || typeof item === 'number')) {
        properties[key] = value.join(',')
      }
      continue
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      properties[key] = value
    }
  }
  return properties
}

function cloneTheme(themeId?: string): Theme {
  return { ...structuredClone(DEFAULT_THEME), id: themeId || DEFAULT_THEME.id }
}

function parseThemePart(id: string | undefined, properties: StyleProperties): { id: string; properties: StyleProperties } {
  return { id: id ?? newId('style'), properties }
}

function parseTheme(node: unknown, themeId?: string): Theme {
  const theme = cloneTheme(themeId)
  const themeNode = asArray(node)[0]
  if (!themeNode || typeof themeNode !== 'object') return theme
  const record = themeNode as AnyRecord
  const id = attr(record, 'id') || themeId || theme.id
  theme.id = id
  const propertiesNode = record['theme-properties'] ?? record.properties
  if (propertiesNode) {
    const properties = collectProperties(propertiesNode)
    const mapPart = theme.map
    theme.map = parseThemePart(mapPart?.id, {
      ...(mapPart?.properties ?? {}),
      ...properties
    })
  }
  // Some files put individual theme parts inline.
  const partNames: Array<keyof Theme> = [
    'centralTopic',
    'mainTopic',
    'subTopic',
    'floatingTopic',
    'summaryTopic',
    'calloutTopic',
    'importantTopic',
    'minorTopic',
    'boundary',
    'summary',
    'relationship',
    'global'
  ]
  for (const name of partNames) {
    const partNode = record[name as string]
    if (!partNode || typeof partNode !== 'object') continue
    const partRecord = partNode as AnyRecord
    const properties = collectProperties(partRecord['topic-properties'] ?? partRecord.properties ?? partNode)
    if (Object.keys(properties).length) {
      const part = parseThemePart(attr(partRecord, 'id'), properties)
      ;(theme as unknown as AnyRecord)[name] = part
    }
  }
  return theme
}

function parseMarkers(node: AnyRecord): Marker[] {
  const refs = (node['marker-refs'] as AnyRecord | undefined)?.['marker-ref'] ?? node['marker-ref']
  return asArray(refs)
    .map((ref) => attr(ref, 'marker-id'))
    .filter((id): id is string => Boolean(id))
    .map((markerId) => ({ markerId }))
}

function parseLabels(node: AnyRecord): string[] {
  const labels = (node.labels as AnyRecord | undefined)?.label
  return asArray(labels)
    .map((label) => textOf(label))
    .filter(Boolean)
}

function parseNotes(node: AnyRecord): Note | undefined {
  const notesNode = node.notes
  if (!notesNode || typeof notesNode !== 'object') return undefined
  const record = notesNode as AnyRecord
  const plain = textOf(record.plain)
  const html = deepText(record.html).trim()
  if (!plain && !html) return undefined
  const note: Note = {}
  if (plain) note.plain = { content: plain }
  if (html) {
    note.html = { content: html }
    note.realHTML = { content: html }
  }
  return note
}

function parseStyle(node: AnyRecord): Style | undefined {
  const styleId = attr(node, 'style-id')
  const propertiesNode = node['topic-properties']
  if (!styleId && !propertiesNode) return undefined
  return {
    id: styleId ?? newId('style'),
    properties: propertiesNode ? collectProperties(propertiesNode) : {}
  }
}

function parseBoundaries(node: AnyRecord): Boundary[] | undefined {
  const boundaries = (node.boundaries as AnyRecord | undefined)?.boundary
  const list = asArray(boundaries)
    .map((boundary): Boundary | undefined => {
      const record = boundary && typeof boundary === 'object' ? (boundary as AnyRecord) : {}
      const id = attr(record, 'id')
      if (!id) return undefined
      const style = parseStyle(record)
      return {
        id,
        range: attr(record, 'range'),
        title: attr(record, 'title') || textOf(record.title) || undefined,
        ...(style ? { style } : {})
      } satisfies Boundary
    })
    .filter((item): item is Boundary => Boolean(item))
  return list.length ? list : undefined
}

function parseSummaries(node: AnyRecord): Summary[] | undefined {
  const summaries = (node.summaries as AnyRecord | undefined)?.summary
  const list = asArray(summaries)
    .map((summary): Summary | undefined => {
      const record = summary && typeof summary === 'object' ? (summary as AnyRecord) : {}
      const id = attr(record, 'id')
      if (!id) return undefined
      const nestedTopicNode = asArray(record.topic)[0]
      const nestedTopic = nestedTopicNode ? parseTopic(nestedTopicNode) : undefined
      const title = attr(record, 'title') || textOf(record.title) || nestedTopic?.title || undefined
      const style = parseStyle(record)
      return {
        id,
        range: attr(record, 'range'),
        topicId: attr(record, 'topic-id'),
        title,
        ...(style ? { style } : {}),
        ...(nestedTopic ? { children: { attached: [nestedTopic], detached: [] } } : {})
      } satisfies Summary
    })
    .filter((item): item is Summary => Boolean(item))
  return list.length ? list : undefined
}

function parseChildren(node: AnyRecord): Topic['children'] {
  const childrenNode = node.children
  if (!childrenNode || typeof childrenNode !== 'object') return { attached: [], detached: [] }
  const topicsNodes = asArray<AnyRecord>((childrenNode as AnyRecord).topics)
  const attached: Topic[] = []
  const detached: Topic[] = []
  for (const topicsNode of topicsNodes) {
    const type = attr(topicsNode, 'type') ?? 'attached'
    const target = type === 'detached' ? detached : attached
    for (const child of asArray(topicsNode.topic)) target.push(parseTopic(child))
  }
  // Some writers omit the <topics> wrapper.
  if (!topicsNodes.length) {
    for (const child of asArray((childrenNode as AnyRecord).topic)) attached.push(parseTopic(child))
  }
  return { attached, detached }
}

export function parseTopic(node: unknown): Topic {
  const record = node && typeof node === 'object' ? (node as AnyRecord) : {}
  const topic: Topic = {
    id: attr(record, 'id') ?? newId('topic'),
    title: textOf(record.title) || 'Untitled',
    children: parseChildren(record)
  }
  const className = attr(record, 'class')
  if (className) topic.class = className
  const structureClass = attr(record, 'structure-class')
  if (structureClass) topic.structureClass = structureClass
  const style = parseStyle(record)
  if (style) topic.style = style
  const markers = parseMarkers(record)
  if (markers.length) topic.markers = markers
  const labels = parseLabels(record)
  if (labels.length) topic.labels = labels
  const notes = parseNotes(record)
  if (notes) topic.notes = notes
  const boundaries = parseBoundaries(record)
  if (boundaries) topic.boundaries = boundaries
  const summaries = parseSummaries(record)
  if (summaries) topic.summaries = summaries
  const hyperlink = attr(record, 'href') ?? attr(record, 'xlink:href')
  if (hyperlink) {
    topic.hyperlink = hyperlink
    topic.href = hyperlink
  }
  if (attr(record, 'branch') === 'folded') topic.collapsed = true
  return topic
}

function parseRelationships(node: unknown): Relationship[] {
  const relationships = asArray<AnyRecord>((node as AnyRecord | undefined)?.relationship)
  return relationships
    .map((relationship): Relationship | undefined => {
      const id = attr(relationship, 'id')
      const end1Id = attr(relationship, 'end1')
      const end2Id = attr(relationship, 'end2')
      if (!id || !end1Id || !end2Id) return undefined
      return {
        id,
        end1Id,
        end2Id,
        title: textOf(relationship.title) || undefined
      } satisfies Relationship
    })
    .filter((item): item is Relationship => Boolean(item))
}

export function parseSheet(node: unknown, index = 0): Sheet {
  const record = node && typeof node === 'object' ? (node as AnyRecord) : {}
  const rootNode = asArray(record.topic)[0]
  const rootTopic = rootNode ? parseTopic(rootNode) : createTopic('Central Topic')
  const title = textOf(record.title) || rootTopic.title || `Map ${index + 1}`
  const theme = parseTheme(record.theme, attr(record, 'theme'))
  const relationships = parseRelationships(record.relationships)
  const sheet: Sheet = {
    id: attr(record, 'id') ?? newId('sheet'),
    class: 'sheet',
    title,
    rootTopic,
    theme,
    topicPositioning: 'fixed',
    extensions: []
  }
  if (relationships.length) sheet.relationships = relationships
  const style = parseStyle(record)
  if (style) sheet.style = style
  return sheet
}

/** Parse an XMind 8 `content.xml` document into sheets. */
export function parseXmindXml(xml: string): Sheet[] {
  if (!xml || !xml.trim()) return []
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: XML_ATTRIBUTE,
    trimValues: true,
    parseTagValue: false,
    parseAttributeValue: false,
    allowBooleanAttributes: true,
    isArray: (name) =>
      ['sheet', 'topic', 'topics', 'marker-ref', 'label', 'boundary', 'summary', 'relationship'].includes(name)
  })
  let document: AnyRecord
  try {
    document = parser.parse(xml.replace(/^﻿/, '')) as AnyRecord
  } catch {
    return []
  }
  const root = (document['xmap-content'] ?? document['xmap'] ?? document) as AnyRecord
  return asArray(root.sheet).map((sheet, index) => parseSheet(sheet, index))
}

/* ------------------------------------------------------------------ */
/* Building                                                            */
/* ------------------------------------------------------------------ */

function propertiesToXml(properties: StyleProperties): AnyRecord {
  const node: AnyRecord = {}
  for (const [key, value] of Object.entries(properties)) {
    if (!/^[A-Za-z_][\w.:-]*$/.test(key)) continue
    node[key] = String(value)
  }
  return node
}

function topicToXml(topic: Topic): AnyRecord {
  const node: AnyRecord = {
    [`${XML_ATTRIBUTE}id`]: topic.id
  }
  if (topic.class) node[`${XML_ATTRIBUTE}class`] = topic.class
  if (topic.structureClass) node[`${XML_ATTRIBUTE}structure-class`] = topic.structureClass
  if (topic.collapsed) node[`${XML_ATTRIBUTE}branch`] = 'folded'
  if (topic.style?.id) node[`${XML_ATTRIBUTE}style-id`] = topic.style.id
  const hyperlink = topic.hyperlink ?? topic.href
  if (hyperlink) node[`${XML_ATTRIBUTE}href`] = hyperlink

  node.title = topic.title || 'Untitled'

  if (topic.markers?.length) {
    node['marker-refs'] = {
      'marker-ref': topic.markers.map((marker) => ({
        [`${XML_ATTRIBUTE}marker-id`]: marker.markerId
      }))
    }
  }
  if (topic.labels?.length) {
    node.labels = { label: topic.labels }
  }
  if (topic.notes) {
    const notes: AnyRecord = {}
    if (topic.notes.plain?.content) notes.plain = topic.notes.plain.content
    if (topic.notes.html?.content) notes.html = topic.notes.html.content
    if (Object.keys(notes).length) node.notes = notes
  }
  if (topic.boundaries?.length) {
    node.boundaries = {
      boundary: topic.boundaries.map((boundary) => ({
        [`${XML_ATTRIBUTE}id`]: boundary.id,
        ...(boundary.range ? { [`${XML_ATTRIBUTE}range`]: boundary.range } : {}),
        ...(boundary.title ? { [`${XML_ATTRIBUTE}title`]: boundary.title } : {})
      }))
    }
  }
  if (topic.summaries?.length) {
    node.summaries = {
      summary: topic.summaries.map((summary) => {
        const summaryNode: AnyRecord = {
          [`${XML_ATTRIBUTE}id`]: summary.id
        }
        if (summary.range) summaryNode[`${XML_ATTRIBUTE}range`] = summary.range
        if (summary.topicId) summaryNode[`${XML_ATTRIBUTE}topic-id`] = summary.topicId
        if (summary.title) summaryNode.title = summary.title
        const summaryTopic = summary.children?.attached?.[0]
        if (summaryTopic) summaryNode.topic = topicToXml(summaryTopic)
        return summaryNode
      })
    }
  }

  const attached = topic.children?.attached ?? []
  const detached = topic.children?.detached ?? []
  if (attached.length || detached.length) {
    const topics: AnyRecord[] = []
    if (attached.length) {
      topics.push({
        [`${XML_ATTRIBUTE}type`]: 'attached',
        topic: attached.map(topicToXml)
      })
    }
    if (detached.length) {
      topics.push({
        [`${XML_ATTRIBUTE}type`]: 'detached',
        topic: detached.map(topicToXml)
      })
    }
    node.children = { topics }
  }
  return node
}

function themeToXml(theme: Theme): AnyRecord {
  const node: AnyRecord = {
    [`${XML_ATTRIBUTE}id`]: theme.id
  }
  const properties: StyleProperties = {
    ...(theme.global?.properties ?? {}),
    ...(theme.map?.properties ?? {})
  }
  if (Object.keys(properties).length) node['theme-properties'] = propertiesToXml(properties)
  return node
}

function sheetToXml(sheet: Sheet): AnyRecord {
  const node: AnyRecord = {
    [`${XML_ATTRIBUTE}id`]: sheet.id,
    [`${XML_ATTRIBUTE}theme`]: sheet.theme?.id ?? DEFAULT_THEME.id
  }
  node.title = sheet.title
  node.topic = topicToXml(sheet.rootTopic)
  node.theme = themeToXml(sheet.theme ?? DEFAULT_THEME)
  const relationships = sheet.relationships ?? []
  if (relationships.length) {
    node.relationships = {
      relationship: relationships.map((relationship) => {
        const relationshipNode: AnyRecord = {
          [`${XML_ATTRIBUTE}id`]: relationship.id,
          [`${XML_ATTRIBUTE}end1`]: relationship.end1Id,
          [`${XML_ATTRIBUTE}end2`]: relationship.end2Id
        }
        if (relationship.title) relationshipNode.title = relationship.title
        return relationshipNode
      })
    }
  }
  if (sheet.style?.id) node[`${XML_ATTRIBUTE}style-id`] = sheet.style.id
  return node
}

/** Build an XMind 8 `content.xml` document from a workbook. */
export function buildXmindXml(workbook: Workbook): string {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: XML_ATTRIBUTE,
    suppressEmptyNode: true,
    suppressBooleanAttributes: false,
    format: true,
    indentBy: '  ',
    processEntities: true
  })
  const document: AnyRecord = {
    '?xml': { [`${XML_ATTRIBUTE}version`]: '1.0', [`${XML_ATTRIBUTE}encoding`]: 'UTF-8', [`${XML_ATTRIBUTE}standalone`]: 'no' },
    'xmap-content': {
      [`${XML_ATTRIBUTE}xmlns`]: 'urn:xmind:xmap:xmlns:content:2.0',
      [`${XML_ATTRIBUTE}xmlns:fo`]: 'http://www.w3.org/1999/XSL/Format',
      [`${XML_ATTRIBUTE}xmlns:svg`]: 'http://www.w3.org/2000/svg',
      [`${XML_ATTRIBUTE}xmlns:xhtml`]: 'http://www.w3.org/1999/xhtml',
      [`${XML_ATTRIBUTE}xmlns:xlink`]: 'http://www.w3.org/1999/xlink',
      [`${XML_ATTRIBUTE}version`]: '2.0',
      sheet: workbook.sheets.map(sheetToXml)
    }
  }
  return builder.build(document)
}

export type { Sheet }
