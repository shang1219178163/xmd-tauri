/** Plain-text and Markdown exports. */
import type { Topic, Workbook } from '@shared/types'

export { workbookToMarkdown } from '../file/markdown'

function walkTopic(topic: Topic, depth: number, lines: string[]): void {
  lines.push(`${'  '.repeat(depth)}${topic.title || 'Untitled'}`)
  const note = topic.notes?.plain?.content
  if (note) {
    for (const line of note.split(/\r?\n/)) {
      lines.push(`${'  '.repeat(depth + 1)}${line}`)
    }
  }
  for (const child of topic.children?.attached ?? []) walkTopic(child, depth + 1, lines)
  for (const child of topic.children?.detached ?? []) walkTopic(child, depth + 1, lines)
}

/** Render the workbook as an indented outline of plain text. */
export function workbookToPlainText(workbook: Workbook): string {
  if (!workbook.sheets.length) return ''
  return workbook.sheets
    .map((sheet) => {
      const lines: string[] = []
      if (workbook.sheets.length > 1) lines.push(sheet.title || sheet.rootTopic.title || 'Sheet')
      walkTopic(sheet.rootTopic, 0, lines)
      return lines.join('\n')
    })
    .join('\n\n')
}
