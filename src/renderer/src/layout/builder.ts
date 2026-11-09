import type {
  LayoutBounds,
  LayoutNode,
  StructureKey
} from '@shared/types'
import { BOUNDS_PADDING } from './constants'
import type { MeasuredTopic, Side } from './model'
import type { LayoutSettings, LayoutSpacing } from './settings'

export interface LayoutContext {
  root: MeasuredTopic
  builder: LayoutBuilder
  structure: StructureKey
  settings: LayoutSettings
  spacing: LayoutSpacing
}

/** Accumulates placed nodes while keeping layout code free of bookkeeping. */
export class LayoutBuilder {
  readonly nodes = new Map<string, LayoutNode>()

  add(topic: MeasuredTopic, x: number, y: number, side: Side): void {
    this.nodes.set(topic.id, {
      id: topic.id,
      topic: topic.topic,
      parentId: topic.parentId,
      depth: topic.depth,
      side,
      x,
      y,
      width: topic.width,
      height: topic.height,
      collapsed: topic.collapsed,
      hasChildren: topic.hasChildren
    })
  }

  has(id: string): boolean {
    return this.nodes.has(id)
  }

  get(id: string): LayoutNode | undefined {
    return this.nodes.get(id)
  }

  /** Bounding box of every node plus the standard 60px padding. */
  bounds(): LayoutBounds {
    if (this.nodes.size === 0) {
      return { x: 0, y: 0, width: 0, height: 0 }
    }

    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY

    for (const node of this.nodes.values()) {
      minX = Math.min(minX, node.x)
      minY = Math.min(minY, node.y)
      maxX = Math.max(maxX, node.x + node.width)
      maxY = Math.max(maxY, node.y + node.height)
    }

    return {
      x: minX - BOUNDS_PADDING,
      y: minY - BOUNDS_PADDING,
      width: maxX - minX + BOUNDS_PADDING * 2,
      height: maxY - minY + BOUNDS_PADDING * 2
    }
  }
}
