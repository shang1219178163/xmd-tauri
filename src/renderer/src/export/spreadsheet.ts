/** Excel (.xlsx) export using the `xlsx` package. */
import * as XLSX from 'xlsx'
import type { Topic, Workbook } from '@shared/types'

const HEADERS: string[] = ['Sheet', 'Level', 'Topic', 'Parent', 'Notes', 'Labels', 'Markers']

type Row = [string, number, string, string, string, string, string]

function walkTopic(topic: Topic, sheetTitle: string, parent: Topic | undefined, depth: number, rows: Row[]): void {
  rows.push([
    sheetTitle,
    depth + 1,
    topic.title || '',
    parent?.title ?? '',
    topic.notes?.plain?.content ?? '',
    (topic.labels ?? []).join(', '),
    (topic.markers ?? []).map((marker) => marker.markerId).join(', ')
  ])
  for (const child of topic.children?.attached ?? []) walkTopic(child, sheetTitle, topic, depth + 1, rows)
  for (const child of topic.children?.detached ?? []) walkTopic(child, sheetTitle, topic, depth + 1, rows)
}

/** Build an .xlsx workbook with one flat "Topics" sheet. */
export async function workbookToXlsx(workbook: Workbook): Promise<Uint8Array> {
  const rows: Row[] = []
  for (const sheet of workbook.sheets) {
    walkTopic(sheet.rootTopic, sheet.title || sheet.rootTopic.title || 'Sheet', undefined, 0, rows)
  }
  const worksheet = XLSX.utils.aoa_to_sheet([HEADERS, ...rows])
  worksheet['!cols'] = [
    { wch: 18 },
    { wch: 7 },
    { wch: 34 },
    { wch: 26 },
    { wch: 44 },
    { wch: 22 },
    { wch: 22 }
  ]
  const xlsxWorkbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(xlsxWorkbook, worksheet, 'Topics')
  const output = XLSX.write(xlsxWorkbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return new Uint8Array(output)
}
