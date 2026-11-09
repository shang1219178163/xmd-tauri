import type { LayoutContext } from './builder'
import type { MeasuredTopic } from './model'
import { placeVertical } from './primitives'

/**
 * Tree table: root at the top-left, one row per topic in pre-order, and one
 * column per depth level. Column widths use the widest node at that depth.
 */
export function layoutTreetable({ root, builder, spacing }: LayoutContext): void {
  const rows: MeasuredTopic[] = []
  const visit = (topic: MeasuredTopic): void => {
    rows.push(topic)
    for (const child of topic.children) visit(child)
  }
  visit(root)

  const widestAtDepth: number[] = []
  for (const topic of rows) {
    widestAtDepth[topic.depth] = Math.max(
      widestAtDepth[topic.depth] ?? 0,
      topic.width
    )
  }

  const columnX: number[] = [0]
  for (let depth = 1; depth < widestAtDepth.length; depth++) {
    columnX[depth] =
      columnX[depth - 1] + (widestAtDepth[depth - 1] ?? 0) + spacing.treetableColGap
  }

  let y = 0
  for (const topic of rows) {
    builder.add(topic, columnX[topic.depth] ?? 0, y, 'center')
    y += topic.height + spacing.treetableRowGap
  }
}

/**
 * Spreadsheet: root at the top-left, each top-level child opens a column to
 * the right of the root, and its descendants fill that column downwards.
 */
export function layoutSpreadsheet({ root, builder, spacing }: LayoutContext): void {
  builder.add(root, 0, 0, 'center')

  let cursor = root.width + spacing.spreadsheetColGap
  for (const child of root.children) {
    const columnWidth =
      Math.max(child.width, child.stackWidth) + spacing.spreadsheetCellPadding
    placeVertical(child, cursor + columnWidth / 2, 0, 'down', 'right', builder, spacing)
    cursor += columnWidth + spacing.spreadsheetColGap
  }
}
