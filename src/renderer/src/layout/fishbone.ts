import type { LayoutBuilder, LayoutContext } from './builder'
import { placeHorizontal } from './primitives'
import type { MeasuredTopic } from './model'
import type { LayoutSpacing } from './settings'

export type FishboneHead = 'left' | 'right'

/**
 * Fishbone: a horizontal spine with alternating branches above and below it.
 * The head (root) is at the left for fishboneLeft and at the right for
 * fishboneRight; branches are spaced along the spine away from the head.
 * A main branch's children sit beside its bone and connect horizontally.
 */
export function layoutFishbone(
  { root, builder, spacing }: LayoutContext,
  head: FishboneHead
): void {
  const rootX = head === 'left' ? 0 : -root.width
  builder.add(root, rootX, -root.height / 2, 'center')

  const step = head === 'left' ? 1 : -1
  let cursor =
    head === 'left'
      ? root.width + spacing.fishboneHeadGap
      : -root.width - spacing.fishboneHeadGap

  root.children.forEach((child, index) => {
    const above = index % 2 === 0
    const centerX =
      head === 'left'
        ? cursor + child.stackWidth / 2
        : cursor - child.stackWidth / 2
    const nodeX = centerX - child.width / 2
    const nodeY = above
      ? -spacing.axisOffset - child.height
      : spacing.axisOffset
    builder.add(child, nodeX, nodeY, above ? 'left' : 'right')
    placeFishboneChildren(child, nodeX, nodeY, builder, spacing, head)
    cursor += step * (child.stackWidth + spacing.fishboneBranchGap)
  })
}

function placeFishboneChildren(
  parent: MeasuredTopic,
  parentX: number,
  parentY: number,
  builder: LayoutBuilder,
  spacing: LayoutSpacing,
  head: FishboneHead
): void {
  const children = parent.children
  if (!children.length) return

  // Children sit on the far side from the head, between the branch and spine.
  const direction = head === 'left' ? 'right' : 'left'
  const anchorX =
    direction === 'right'
      ? parentX + parent.width + spacing.levelX
      : parentX - spacing.levelX
  const branchCenterY = parentY + parent.height / 2
  const centerY = branchCenterY / 2
  const total =
    children.reduce((sum, child) => sum + child.stackHeight, 0) +
    spacing.siblingY * (children.length - 1)
  let cursor = centerY - total / 2

  for (const child of children) {
    placeHorizontal(
      child,
      anchorX,
      cursor + child.stackHeight / 2,
      direction,
      direction,
      builder,
      spacing
    )
    cursor += child.stackHeight + spacing.siblingY
  }
}
