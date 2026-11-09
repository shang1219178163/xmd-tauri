/** Word (.docx) export using the `docx` package. */
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx'
import type { Topic, Workbook } from '@shared/types'

const HEADINGS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6
] as const

function headingFor(depth: number, base: number): (typeof HEADINGS)[number] {
  const index = Math.min(HEADINGS.length - 1, Math.max(0, base + depth))
  return HEADINGS[index]
}

function topicParagraphs(topic: Topic, depth: number, base: number, output: Paragraph[]): void {
  output.push(
    new Paragraph({
      text: topic.title || 'Untitled',
      heading: headingFor(depth, base)
    })
  )
  const note = topic.notes?.plain?.content
  if (note) {
    for (const line of note.split(/\r?\n/)) {
      output.push(
        new Paragraph({
          children: [new TextRun({ text: line, italics: true, color: '555555' })],
          indent: { left: (depth + 1) * 240 }
        })
      )
    }
  }
  for (const child of topic.children?.attached ?? []) topicParagraphs(child, depth + 1, base, output)
  for (const child of topic.children?.detached ?? []) topicParagraphs(child, depth + 1, base, output)
}

/** Build a Word document from the workbook and return the raw .docx bytes. */
export async function workbookToDocx(workbook: Workbook): Promise<Uint8Array> {
  const paragraphs: Paragraph[] = []
  const multipleSheets = workbook.sheets.length > 1
  const base = multipleSheets ? 1 : 0
  workbook.sheets.forEach((sheet, index) => {
    if (multipleSheets) {
      paragraphs.push(
        new Paragraph({
          text: sheet.title || sheet.rootTopic.title || `Sheet ${index + 1}`,
          heading: HeadingLevel.HEADING_1,
          pageBreakBefore: index > 0
        })
      )
    }
    topicParagraphs(sheet.rootTopic, 0, base, paragraphs)
  })

  const document = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs
      }
    ]
  })
  const blob = await Packer.toBlob(document)
  const buffer = await blob.arrayBuffer()
  return new Uint8Array(buffer)
}
