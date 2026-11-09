import type { LayoutBuilder, LayoutContext } from './builder'
import type { MeasuredTopic, Side } from './model'
import { placeHorizontal } from './primitives'
import type { LayoutSpacing } from './settings'

/**
 * Map layout: the root sits at the center. Auto balance alternates top-level
 * children right/left; turning it off keeps every branch on the right side.
 */
export function layoutMap({ root, builder, settings, spacing }: LayoutContext): void {
  builder.add(root, -root.width / 2, -root.height / 2, 'center')

  const right: MeasuredTopic[] = []
  const left: MeasuredTopic[] = []
  root.children.forEach((child, index) => {
    if (!settings.autoBalance || index % 2 === 0) right.push(child)
    else left.push(child)
  })

  placeStackedSide(right, 'right', root.width / 2 + spacing.levelX, builder, spacing)
  placeStackedSide(left, 'left', -root.width / 2 - spacing.levelX, builder, spacing)
}

function placeStackedSide(
  children: MeasuredTopic[],
  side: Side,
  anchorX: number,
  builder: LayoutBuilder,
  spacing: LayoutSpacing
): void {
  if (children.length === 0) return

  const total =
    children.reduce((sum, child) => sum + child.stackHeight, 0) +
    spacing.siblingY * (children.length - 1)
  let cursor = -total / 2

  for (const child of children) {
    placeHorizontal(
      child,
      anchorX,
      cursor + child.stackHeight / 2,
      side === 'left' ? 'left' : 'right',
      side,
      builder,
      spacing
    )
    cursor += child.stackHeight + spacing.siblingY
  }
}
