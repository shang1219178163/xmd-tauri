import type { LayoutBuilder, LayoutContext } from './builder'
import type {
  HorizontalDirection,
  MeasuredTopic,
  Side
} from './model'
import type { LayoutSpacing } from './settings'

/**
 * One-sided horizontal chart. Used by logicRight/Left, treeRight/Left and
 * braceRight: the root sits at the open edge and sibling subtrees stack
 * vertically. With sibling alignment on, every depth shares one column
 * anchor; otherwise each branch is indented from its own parent.
 */
export function layoutOneSided(
  { root, builder, settings, spacing }: LayoutContext,
  direction: HorizontalDirection
): void {
  const widths = widestByDepth(root)
  const anchors: number[] = [0]

  for (let depth = 1; depth < widths.length; depth++) {
    anchors[depth] =
      direction === 'right'
        ? anchors[depth - 1] + widths[depth - 1] + spacing.levelX
        : anchors[depth - 1] - widths[depth - 1] - spacing.levelX
  }

  const side: Side = direction
  const rootX =
    direction === 'right' ? anchors[0] : anchors[0] - root.width
  builder.add(root, rootX, -root.height / 2, 'center')
  placeColumns(
    root,
    rootX,
    0,
    direction,
    side,
    anchors,
    builder,
    spacing,
    settings.alignSiblings
  )
}

function placeColumns(
  parent: MeasuredTopic,
  parentX: number,
  centerY: number,
  direction: HorizontalDirection,
  side: Side,
  anchors: number[],
  builder: LayoutBuilder,
  spacing: LayoutSpacing,
  alignSiblings: boolean
): void {
  const children = parent.children
  if (children.length === 0) return

  const total =
    children.reduce((sum, child) => sum + child.stackHeight, 0) +
    spacing.siblingY * (children.length - 1)
  let cursor = centerY - total / 2

  for (const child of children) {
    const childCenterY = cursor + child.stackHeight / 2
    const childX = alignSiblings
      ? direction === 'right'
        ? anchors[child.depth]
        : anchors[child.depth] - child.width
      : direction === 'right'
        ? parentX + parent.width + spacing.levelX
        : parentX - spacing.levelX - child.width

    builder.add(child, childX, childCenterY - child.height / 2, side)
    placeColumns(
      child,
      childX,
      childCenterY,
      direction,
      side,
      anchors,
      builder,
      spacing,
      alignSiblings
    )
    cursor += child.stackHeight + spacing.siblingY
  }
}

function widestByDepth(root: MeasuredTopic): number[] {
  const widths: number[] = []
  const visit = (topic: MeasuredTopic): void => {
    widths[topic.depth] = Math.max(widths[topic.depth] ?? 0, topic.width)
    for (const child of topic.children) visit(child)
  }
  visit(root)
  return widths
}
