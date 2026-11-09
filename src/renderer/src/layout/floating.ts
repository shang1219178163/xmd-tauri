import type { LayoutBuilder } from './builder'
import type { LayoutNode, Point } from '@shared/types'
import type { MeasuredTopic } from './model'
import { placeHorizontalAtTop } from './primitives'
import type { LayoutSpacing } from './settings'

/**
 * Position detached/floating topics around the root center. `topic.position`
 * is treated as the top-left offset from the root center. With flexible
 * floating enabled, saved positions are honored; otherwise topics are
 * auto-arranged in a column so the layout stays tidy.
 */
export function layoutFloating(
  floating: MeasuredTopic[],
  rootNode: LayoutNode,
  builder: LayoutBuilder,
  spacing: LayoutSpacing,
  honorPosition = true
): void {
  const center: Point = {
    x: rootNode.x + rootNode.width / 2,
    y: rootNode.y + rootNode.height / 2
  }

  floating.forEach((topic, index) => {
    if (builder.has(topic.id)) return

    const position = honorPosition ? topic.topic.position : undefined
    const x = position ? center.x + position.x : center.x + 200 + index * 40
    const y = position ? center.y + position.y : center.y + 200 + index * 100
    const direction = x + topic.width / 2 < center.x ? 'left' : 'right'

    placeHorizontalAtTop(topic, x, y, direction, direction, builder, spacing)
  })
}
