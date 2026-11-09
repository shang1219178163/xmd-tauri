import type { LayoutBuilder } from './builder'
import type {
  HorizontalDirection,
  MeasuredTopic,
  Side,
  VerticalDirection
} from './model'
import type { LayoutSpacing } from './settings'

/**
 * Place a subtree flowing horizontally. `x` is the left edge when the
 * direction is right, and the right edge when it is left. The subtree is
 * vertically centered on `centerY`.
 */
export function placeHorizontal(
  topic: MeasuredTopic,
  x: number,
  centerY: number,
  direction: HorizontalDirection,
  side: Side,
  builder: LayoutBuilder,
  spacing: LayoutSpacing
): void {
  const nodeX = direction === 'right' ? x : x - topic.width
  const nodeY = centerY - topic.height / 2
  builder.add(topic, nodeX, nodeY, side)
  placeHorizontalChildren(topic, nodeX, nodeY, direction, side, builder, spacing)
}

/** Place a subtree using a fixed top-left corner (used for floating topics). */
export function placeHorizontalAtTop(
  topic: MeasuredTopic,
  x: number,
  y: number,
  direction: HorizontalDirection,
  side: Side,
  builder: LayoutBuilder,
  spacing: LayoutSpacing
): void {
  builder.add(topic, x, y, side)
  placeHorizontalChildren(topic, x, y, direction, side, builder, spacing)
}

/** Place only the visible children of an already-positioned topic. */
export function placeHorizontalChildren(
  topic: MeasuredTopic,
  nodeX: number,
  nodeY: number,
  direction: HorizontalDirection,
  side: Side,
  builder: LayoutBuilder,
  spacing: LayoutSpacing
): void {
  const children = topic.children
  if (children.length === 0) return

  const total =
    children.reduce((sum, child) => sum + child.stackHeight, 0) +
    spacing.siblingY * (children.length - 1)
  let cursor = nodeY + topic.height / 2 - total / 2
  const childX =
    direction === 'right'
      ? nodeX + topic.width + spacing.levelX
      : nodeX - spacing.levelX

  for (const child of children) {
    placeHorizontal(
      child,
      childX,
      cursor + child.stackHeight / 2,
      direction,
      side,
      builder,
      spacing
    )
    cursor += child.stackHeight + spacing.siblingY
  }
}

/**
 * Place a subtree flowing vertically. `anchorY` is the top edge when the
 * direction is down, and the bottom edge when it is up. Children are spread
 * horizontally around `centerX` (the "horizontal sibling row" for org charts).
 */
export function placeVertical(
  topic: MeasuredTopic,
  centerX: number,
  anchorY: number,
  direction: VerticalDirection,
  side: Side,
  builder: LayoutBuilder,
  spacing: LayoutSpacing
): void {
  const nodeX = centerX - topic.width / 2
  const nodeY = direction === 'down' ? anchorY : anchorY - topic.height
  builder.add(topic, nodeX, nodeY, side)

  const children = topic.children
  if (children.length === 0) return

  const total =
    children.reduce((sum, child) => sum + child.stackWidth, 0) +
    spacing.siblingX * (children.length - 1)
  let cursor = centerX - total / 2
  const childAnchorY =
    direction === 'down'
      ? nodeY + topic.height + spacing.levelY
      : nodeY - spacing.levelY

  for (const child of children) {
    placeVertical(
      child,
      cursor + child.stackWidth / 2,
      childAnchorY,
      direction,
      side,
      builder,
      spacing
    )
    cursor += child.stackWidth + spacing.siblingX
  }
}
