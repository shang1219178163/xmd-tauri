import type { LayoutContext } from './builder'
import type { Side } from './model'
import { placeVertical } from './primitives'

const COLUMNS = 3

/**
 * Matrix: a three-column grid of cells with the root occupying a central cell.
 * Each top-level child fills its own cell and grows downwards inside it.
 */
export function layoutMatrix({ root, builder, spacing }: LayoutContext): void {
  const children = root.children
  if (children.length === 0) {
    builder.add(root, -root.width / 2, -root.height / 2, 'center')
    return
  }

  const cellWidth =
    Math.max(root.width, ...children.map((child) => child.stackWidth)) +
    spacing.matrixCellPadding
  const cellHeight =
    Math.max(root.height, ...children.map((child) => child.stackHeight)) +
    spacing.matrixCellPadding

  const slotCount = children.length + 1
  const rows = Math.ceil(slotCount / COLUMNS)
  const rootRow = Math.floor(rows / 2)
  const rootSlot = rootRow * COLUMNS + 1
  const gridLeft = (-cellWidth * COLUMNS) / 2
  // Center the root cell exactly on the canvas origin (0, 0).
  const gridTop = -(rootRow + 0.5) * cellHeight

  const rootCellX = gridLeft + cellWidth
  const rootCellY = gridTop + rootRow * cellHeight

  builder.add(
    root,
    rootCellX + (cellWidth - root.width) / 2,
    rootCellY + (cellHeight - root.height) / 2,
    'center'
  )

  const rootCenterX = rootCellX + cellWidth / 2
  let childIndex = 0

  for (
    let slot = 0;
    slot < rows * COLUMNS && childIndex < children.length;
    slot++
  ) {
    if (slot === rootSlot) continue

    const row = Math.floor(slot / COLUMNS)
    const column = slot % COLUMNS
    const centerX = gridLeft + column * cellWidth + cellWidth / 2
    const cellTop = gridTop + row * cellHeight
    const child = children[childIndex]
    childIndex += 1

    const anchorY = cellTop + (cellHeight - child.stackHeight) / 2
    placeVertical(
      child,
      centerX,
      anchorY,
      'down',
      sideOf(centerX, rootCenterX),
      builder,
      spacing
    )
  }
}

function sideOf(x: number, centerX: number): Side {
  if (x < centerX - 0.001) return 'left'
  if (x > centerX + 0.001) return 'right'
  return 'center'
}
