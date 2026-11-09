/**
 * `.xmind` archive reader/writer.
 *
 * Modern XMind files are ZIP archives that store the workbook in
 * `content.json` (plus `metadata.json`), while XMind 8 files use
 * `content.xml`. Reading supports both; writing produces a modern archive
 * that also contains a legacy `content.xml` for compatibility.
 */
import JSZip from 'jszip'
import type {
  Marker,
  Relationship,
  Sheet,
  Style,
  Theme,
  Topic,
  TopicChildren,
  Workbook
} from '@shared/types'
import { DEFAULT_THEME, createEmptyWorkbook, newId } from '@shared/defaults'
import { buildXmindXml, parseXmindXml } from './legacy'

type AnyRecord = Record<string, unknown>

/** 1x1 transparent PNG used as the archive thumbnail. */
const THUMBNAIL_PNG = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196,
  137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 218, 99, 100, 96, 248, 95, 15, 0, 2, 135, 1, 128, 235, 71, 186, 146, 0, 0,
  0, 0, 73, 69, 78, 68, 174, 66, 96, 130
])

function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isSheetLike(value: unknown): boolean {
  if (!isRecord(value)) return false
  return isRecord(value.rootTopic) || value.class === 'sheet'
}

function normalizeChildren(value: unknown): TopicChildren {
  const record = isRecord(value) ? value : {}
  return {
    attached: Array.isArray(record.attached) ? record.attached.map(normalizeTopic) : [],
    detached: Array.isArray(record.detached) ? record.detached.map(normalizeTopic) : []
  }
}

function normalizeMarkers(value: unknown): Marker[] | undefined {
  if (!Array.isArray(value)) return undefined
  const markers = value
    .map((marker) => {
      if (typeof marker === 'string') return { markerId: marker }
      if (isRecord(marker) && typeof marker.markerId === 'string') return { markerId: marker.markerId }
      return undefined
    })
    .filter((marker): marker is Marker => Boolean(marker))
  return markers.length ? markers : undefined
}

function normalizeLabels(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const labels = value.filter((label): label is string => typeof label === 'string')
  return labels.length ? labels : undefined
}

function normalizeStyle(value: unknown): Style | undefined {
  if (!isRecord(value)) return undefined
  const properties = isRecord(value.properties) ? (value.properties as Style['properties']) : {}
  return {
    ...value,
    id: typeof value.id === 'string' ? value.id : newId('style'),
    properties
  }
}

function normalizeTheme(value: unknown): Theme {
  if (!isRecord(value)) return structuredClone(DEFAULT_THEME)
  return {
    ...structuredClone(DEFAULT_THEME),
    ...value,
    id: typeof value.id === 'string' ? value.id : newId('theme')
  } as Theme
}

function normalizeRelationship(value: unknown): Relationship | undefined {
  if (!isRecord(value)) return undefined
  const end1Id = typeof value.end1Id === 'string' ? value.end1Id : typeof value.end1 === 'string' ? value.end1 : ''
  const end2Id = typeof value.end2Id === 'string' ? value.end2Id : typeof value.end2 === 'string' ? value.end2 : ''
  if (!end1Id || !end2Id) return undefined
  return {
    ...value,
    id: typeof value.id === 'string' ? value.id : newId('relation'),
    end1Id,
    end2Id,
    title: typeof value.title === 'string' ? value.title : undefined
  }
}

export function normalizeTopic(value: unknown): Topic {
  const record = isRecord(value) ? value : {}
  const title =
    typeof record.title === 'string'
      ? record.title
      : typeof record.title === 'number'
        ? String(record.title)
        : 'Untitled'
  const topic: Topic = {
    ...record,
    id: typeof record.id === 'string' && record.id ? record.id : newId('topic'),
    title,
    children: normalizeChildren(record.children)
  }
  const markers = normalizeMarkers(record.markers)
  if (markers) topic.markers = markers
  else delete topic.markers
  const labels = normalizeLabels(record.labels)
  if (labels) topic.labels = labels
  else delete topic.labels
  const style = normalizeStyle(record.style)
  if (style) topic.style = style
  return topic
}

export function normalizeSheet(value: unknown, index = 0): Sheet {
  const record = isRecord(value) ? value : {}
  const rootTopic = normalizeTopic(record.rootTopic)
  const title =
    typeof record.title === 'string' && record.title
      ? record.title
      : rootTopic.title || `Map ${index + 1}`
  const relationships = Array.isArray(record.relationships)
    ? record.relationships
        .map(normalizeRelationship)
        .filter((relationship): relationship is Relationship => Boolean(relationship))
    : []
  const sheet: Sheet = {
    ...record,
    id: typeof record.id === 'string' && record.id ? record.id : newId('sheet'),
    class: 'sheet',
    title,
    rootTopic,
    theme: normalizeTheme(record.theme),
    relationships: relationships.length ? relationships : undefined
  }
  // Legacy files may carry a numeric wrapper copy of the sheet; never write
  // that wrapper back into a clean workbook.
  for (const key of Object.keys(sheet)) {
    if (/^\d+$/.test(key)) delete (sheet as unknown as Record<string, unknown>)[key]
  }
  return sheet
}

/**
 * `content.json` appears in several shapes in the wild:
 *  - `[sheet, sheet]`
 *  - `[{ "0": sheet, "1": sheet }]`
 *  - `{ sheets: [sheet, sheet] }`
 */
function extractSheets(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    const sheets: unknown[] = []
    for (const item of value) {
      if (Array.isArray(item)) {
        sheets.push(...extractSheets(item))
        continue
      }
      if (!isRecord(item)) continue
      // Some older files carry a finished sheet in the direct fields AND the
      // same sheet again under a numeric wrapper key. The direct form is the
      // newer, richer one (its title and relationships are current), so it wins.
      if (isSheetLike(item)) {
        sheets.push(item)
        continue
      }
      if (Array.isArray(item.sheets)) {
        sheets.push(...extractSheets(item.sheets))
        continue
      }
      const numericKeys = Object.keys(item)
        .filter((key) => /^\d+$/.test(key))
        .sort((a, b) => Number(a) - Number(b))
      if (numericKeys.length) {
        for (const key of numericKeys) sheets.push(item[key])
        continue
      }
      if (isRecord(item.sheet)) sheets.push(item.sheet)
    }
    return sheets
  }
  if (isRecord(value)) {
    if (Array.isArray(value.sheets)) return extractSheets(value.sheets)
    if (isSheetLike(value)) return [value]
  }
  return []
}

async function readJson(zip: JSZip, path: string): Promise<unknown> {
  const file = zip.file(path)
  if (!file) return undefined
  try {
    return JSON.parse(await file.async('string')) as unknown
  } catch {
    return undefined
  }
}

/** Read an `.xmind` archive into the shared workbook model. */
export async function readXmind(data: Uint8Array | ArrayBuffer): Promise<Workbook> {
  const zip = await JSZip.loadAsync(data)
  let sheets: Sheet[] = []

  const content = await readJson(zip, 'content.json')
  if (content !== undefined) {
    const seen = new Set<string>()
    sheets = extractSheets(content)
      .map((sheet, index) => normalizeSheet(sheet, index))
      .filter((sheet) => {
        if (seen.has(sheet.id)) return false
        seen.add(sheet.id)
        return true
      })
  }

  if (!sheets.length) {
    const legacyFile = zip.file('content.xml')
    if (legacyFile) {
      try {
        const xml = await legacyFile.async('string')
        sheets = parseXmindXml(xml).map((sheet, index) => normalizeSheet(sheet, index))
      } catch {
        sheets = []
      }
    }
  }

  if (!sheets.length) return createEmptyWorkbook()

  const metadata = await readJson(zip, 'metadata.json')
  const activeFromMetadata =
    isRecord(metadata) && typeof metadata.activeSheetId === 'string' ? metadata.activeSheetId : undefined
  const activeSheetId =
    activeFromMetadata && sheets.some((sheet) => sheet.id === activeFromMetadata)
      ? activeFromMetadata
      : sheets[0].id

  return { sheets, activeSheetId }
}

/** Serialize a workbook into an `.xmind` archive. */
export async function writeXmind(workbook: Workbook): Promise<Uint8Array> {
  const zip = new JSZip()
  const sheets = workbook.sheets.length ? workbook.sheets : createEmptyWorkbook().sheets
  const activeSheetId = sheets.some((sheet) => sheet.id === workbook.activeSheetId)
    ? workbook.activeSheetId
    : sheets[0].id

  zip.file('content.json', JSON.stringify(sheets, null, 2))
  zip.file(
    'metadata.json',
    JSON.stringify(
      {
        creator: { name: 'xmd', version: '1.0.0' },
        activeSheetId
      },
      null,
      2
    )
  )
  zip.file(
    'manifest.json',
    JSON.stringify(
      {
        'file-entries': {
          'content.json': {},
          'metadata.json': {},
          'Thumbnails/thumbnail.png': {}
        }
      },
      null,
      2
    )
  )
  zip.file('content.xml', buildXmindXml({ sheets, activeSheetId }))
  zip.file('Thumbnails/thumbnail.png', THUMBNAIL_PNG)

  return zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  })
}
