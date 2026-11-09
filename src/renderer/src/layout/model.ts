import type { Topic } from '@shared/types'

export type Side = 'left' | 'right' | 'center'
export type HorizontalDirection = 'left' | 'right'
export type VerticalDirection = 'up' | 'down'

export interface MeasureContext {
  depth: number
  isRoot: boolean
  isFloating: boolean
}

export type MeasureFn = (
  topic: Topic,
  context: MeasureContext
) => { width: number; height: number }

/**
 * A visible topic after measuring. `children` only contains visible attached
 * children (collapsed descendants are already removed). `detached` contains
 * floating topics; they are positioned separately around the root center.
 */
export interface MeasuredTopic {
  topic: Topic
  id: string
  parentId?: string
  depth: number
  width: number
  height: number
  isRoot: boolean
  isFloating: boolean
  collapsed: boolean
  hasChildren: boolean
  /** Resolved `line-class` value used for the branch leading to this topic. */
  lineClass?: string
  lineColor?: string
  lineWidth: number
  dashed: boolean
  children: MeasuredTopic[]
  detached: MeasuredTopic[]
  /** Vertical extent of this subtree when its children are stacked vertically. */
  stackHeight: number
  /** Horizontal extent of this subtree when its children are laid out in a row. */
  stackWidth: number
}
