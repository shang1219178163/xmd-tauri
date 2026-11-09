import type { LayoutContext } from './builder'
import { placeHorizontal, placeVertical } from './primitives'

/**
 * Horizontal timeline: the root anchors the left end of the axis. Top-level
 * children are spaced along the axis and alternate above/below it; deeper
 * descendants grow further away from the axis.
 */
export function layoutTimelineHorizontal({
  root,
  builder,
  spacing
}: LayoutContext): void {
  builder.add(root, 0, -root.height / 2, 'center')

  let cursor = root.width + spacing.axisStartGap
  root.children.forEach((child, index) => {
    const above = index % 2 === 0
    const centerX = cursor + child.stackWidth / 2
    placeVertical(
      child,
      centerX,
      above ? -spacing.axisOffset : spacing.axisOffset,
      above ? 'up' : 'down',
      above ? 'left' : 'right',
      builder,
      spacing
    )
    cursor += child.stackWidth + spacing.axisBranchGap
  })
}

/**
 * Vertical timeline: the root anchors the top of the axis. Top-level children
 * are stacked down the axis, alternating left/right; descendants flow away
 * from the axis horizontally.
 */
export function layoutTimelineVertical({
  root,
  builder,
  spacing
}: LayoutContext): void {
  builder.add(root, -root.width / 2, 0, 'center')

  let cursor = root.height + spacing.axisStartGap
  root.children.forEach((child, index) => {
    const right = index % 2 === 0
    const centerY = cursor + child.stackHeight / 2
    placeHorizontal(
      child,
      right ? spacing.axisOffset : -spacing.axisOffset,
      centerY,
      right ? 'right' : 'left',
      right ? 'right' : 'left',
      builder,
      spacing
    )
    cursor += child.stackHeight + spacing.axisBranchGap
  })
}
