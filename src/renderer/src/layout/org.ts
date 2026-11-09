import type { LayoutContext } from './builder'
import type { VerticalDirection } from './model'
import { placeVertical } from './primitives'

/**
 * Org chart: root at the top (orgDown) or bottom (orgUp), with each generation
 * occupying a horizontal sibling row below/above its parent.
 */
export function layoutOrg(
  { root, builder, spacing }: LayoutContext,
  direction: VerticalDirection
): void {
  placeVertical(root, 0, 0, direction, 'center', builder, spacing)
}
