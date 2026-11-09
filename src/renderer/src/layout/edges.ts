import type {
  EdgeKind,
  EdgeOrientation,
  LayoutEdge,
  LayoutNode,
  Point,
  StructureKey
} from '@shared/types'
import { STRUCTURES } from '@shared/structures'
import { resolveBranchKind } from '../model/style'
import type {
  HorizontalDirection,
  MeasuredTopic,
  VerticalDirection
} from './model'
import { asString, edgeKindFromLineClass, parseLineWidth } from './style'

interface EdgeEntry {
  from: LayoutNode
  to: LayoutNode
  parent: MeasuredTopic
  child: MeasuredTopic
  kind: EdgeKind
  start: Point
  end: Point
  orientation: EdgeOrientation
  direction?: BranchDirection
  split: Point
  stem: boolean
  /** Index of the depth-1 ancestor, used for rainbow branch colours. */
  branchIndex?: number
}

export interface BuildEdgeOptions {
  rainbow?: boolean
  palette?: string[]
}

const SPLIT_DISTANCE = 13

/** Connection kinds that share a 13px split stem per parent direction. */
const STEM_KINDS = new Set<EdgeKind>([
  'curve',
  'straight',
  'elbow',
  'roundedElbow',
  'bight',
  'fold',
  'roundedFold'
])

/** Create one edge for every visible attached parent -> child pair. */
export function buildEdges(
  root: MeasuredTopic,
  floating: MeasuredTopic[],
  nodes: Map<string, LayoutNode>,
  structure: StructureKey,
  options: BuildEdgeOptions = {}
): LayoutEdge[] {
  const edges: LayoutEdge[] = []

  const visit = (topic: MeasuredTopic, inFloating: boolean, branchIndex?: number): void => {
    const from = nodes.get(topic.id)
    if (from) {
      const entries: EdgeEntry[] = topic.children.flatMap((child, index) => {
        const to = nodes.get(child.id)
        if (!to) return []
        const layoutKind = edgeKindForStructure(
          structure,
          edgeKindFromLineClass(child.lineClass)
        )
        const kind = resolveBranchKind(
          layoutKind,
          child.depth,
          STRUCTURES[structure].family,
          topic.lineClass ?? '',
          Boolean(topic.topic.style?.properties?.['line-class'])
        )
        const anchors = edgeAnchors(from, to, structure, { floating: inFloating })
        const childBranchIndex = inFloating ? undefined : topic.isRoot ? index : branchIndex
        return [
          {
            from,
            to,
            parent: topic,
            child,
            kind,
            ...anchors,
            split: { ...anchors.start },
            stem: false,
            branchIndex: childBranchIndex
          }
        ]
      })
      applySplitStems(entries)
      for (const entry of entries) edges.push(createEdge(entry, options))
    }
    topic.children.forEach((child, index) => {
      const childBranchIndex = inFloating ? undefined : topic.isRoot ? index : branchIndex
      visit(child, inFloating, childBranchIndex)
    })
  }

  visit(root, false)
  for (const topic of floating) visit(topic, true)
  return edges
}

function applySplitStems(entries: EdgeEntry[]): void {
  const groups = new Map<BranchDirection, EdgeEntry[]>()
  for (const entry of entries) {
    if (!STEM_KINDS.has(entry.kind) || !entry.direction) continue
    const group = groups.get(entry.direction) ?? []
    group.push(entry)
    groups.set(entry.direction, group)
  }
  for (const [direction, group] of groups) {
    const split = offsetPoint(group[0].start, direction, SPLIT_DISTANCE)
    group.forEach((entry, index) => {
      entry.split = split
      entry.stem = index === group.length - 1
    })
  }
}

function offsetPoint(point: Point, direction: BranchDirection, distance: number): Point {
  if (direction === 'right') return { x: point.x + distance, y: point.y }
  if (direction === 'left') return { x: point.x - distance, y: point.y }
  if (direction === 'down') return { x: point.x, y: point.y + distance }
  return { x: point.x, y: point.y - distance }
}

/** Points encode every connection kind; edge-path.ts turns them into a path. */
function edgePointsFor(entry: EdgeEntry): Point[] {
  const { kind, start, split, end, orientation, stem } = entry
  const begin = stem ? start : split
  if (kind === 'tapered') return [start, end]
  if (kind === 'brace') return [split, end]
  if (kind === 'straight') return [begin, split, end]
  if (kind === 'curve') {
    const control =
      orientation === 'horizontal'
        ? { x: split.x + (end.x - split.x) / 5, y: end.y }
        : { x: end.x, y: split.y }
    return [begin, split, control, end]
  }
  if (kind === 'elbow' || kind === 'roundedElbow') {
    const corner =
      orientation === 'horizontal'
        ? { x: split.x, y: end.y }
        : { x: end.x, y: split.y }
    return [begin, split, corner, end]
  }
  if (kind === 'bight') {
    const c1 =
      orientation === 'horizontal'
        ? { x: end.x - (end.x - split.x) / 4, y: split.y }
        : { x: split.x, y: end.y - (end.y - split.y) / 4 }
    const c2 =
      orientation === 'horizontal'
        ? { x: (split.x + end.x) / 2, y: end.y }
        : { x: end.x, y: (split.y + end.y) / 2 }
    return [begin, split, c1, c2, end]
  }
  // fold / roundedFold
  const bend =
    orientation === 'horizontal'
      ? {
          x: split.x + (end.x - split.x) * (kind === 'fold' ? 2 / 3 : 1 / 2),
          y: end.y
        }
      : {
          x: end.x,
          y: split.y + (end.y - split.y) * (kind === 'fold' ? 2 / 3 : 1 / 2)
        }
  return [begin, split, bend, end]
}

function createEdge(entry: EdgeEntry, options: BuildEdgeOptions): LayoutEdge {
  const { from, to, parent, child, kind, orientation } = entry
  const parentProps = parent.topic.style?.properties ?? {}
  const childProps = child.topic.style?.properties ?? {}
  const rainbowColor =
    options.rainbow && entry.branchIndex !== undefined && options.palette?.length
      ? options.palette[entry.branchIndex % options.palette.length]
      : undefined
  const color =
    asString(childProps['line-color']) ??
    asString(parentProps['line-color']) ??
    rainbowColor ??
    child.lineColor
  const width =
    childProps['line-width'] != null
      ? child.lineWidth
      : parentProps['line-width'] != null
        ? parseLineWidth(parentProps['line-width'], child.lineWidth)
        : child.lineWidth
  return {
    id: `edge:${from.id}->${to.id}`,
    fromId: from.id,
    toId: to.id,
    points: edgePointsFor(entry),
    orientation,
    kind,
    ...(color ? { color } : {}),
    width,
    ...(child.dashed ? { dashed: true } : {})
  }
}

/**
 * Tree and brace structures use elbow connections for their default branch
 * style. Explicit straight/tapered styles are still honored.
 */
function edgeKindForStructure(
  structure: StructureKey,
  kind: EdgeKind
): EdgeKind {
  if (kind !== 'curve') return kind
  if (
    structure === 'treeRight' ||
    structure === 'treeLeft' ||
    structure === 'braceRight' ||
    structure === 'matrix' ||
    structure === 'treetable' ||
    structure === 'spreadsheet'
  ) {
    return 'elbow'
  }
  if (structure === 'fishboneLeft' || structure === 'fishboneRight') return 'straight'
  return kind
}

export type BranchDirection = HorizontalDirection | VerticalDirection

export interface EdgeAnchors {
  start: Point
  end: Point
  /** Present only for families that support directional anchors and split stems. */
  direction?: BranchDirection
  orientation: EdgeOrientation
}

export interface AnchorOptions {
  floating?: boolean
}

export function edgeAnchors(
  from: LayoutNode,
  to: LayoutNode,
  structure: StructureKey,
  options: AnchorOptions = {}
): EdgeAnchors {
  const fromCenterX = from.x + from.width / 2
  const fromCenterY = from.y + from.height / 2
  const toCenterX = to.x + to.width / 2
  const toCenterY = to.y + to.height / 2
  const horizontal = toCenterX >= fromCenterX ? 'right' : 'left'
  const vertical = toCenterY >= fromCenterY ? 'down' : 'up'

  const def = STRUCTURES[structure]

  // Floating subtrees are laid out horizontally by placeHorizontalAtTop.
  if (options.floating) {
    const supported =
      def.family === 'logic' ||
      def.family === 'tree' ||
      def.family === 'map' ||
      def.family === 'org' ||
      def.family === 'timeline'
    if (supported) return horizontalAnchors(from, to, horizontal)
    const anchors = geometricAnchors(from, to)
    return { start: anchors.start, end: anchors.end, orientation: anchors.orientation }
  }

  switch (def.family) {
    case 'logic':
    case 'tree':
      return horizontalAnchors(from, to, def.direction === 'left' ? 'left' : 'right')
    case 'map':
      return horizontalAnchors(from, to, horizontal)
    case 'org':
      return verticalAnchors(from, to, def.direction === 'up' ? 'up' : 'down')
    case 'timeline':
      if (def.direction === 'vertical') {
        // Root children stack down the axis; deeper descendants flow sideways.
        return from.depth === 0
          ? verticalAnchors(from, to, 'down')
          : horizontalAnchors(from, to, horizontal)
      }
      // Horizontal timeline: root children sit along the axis; deeper
      // descendants grow above/below it.
      return from.depth === 0
        ? horizontalAnchors(from, to, 'right')
        : verticalAnchors(from, to, vertical)
    case 'fishbone':
      return fishboneAnchors(from, to, def.key === 'fishboneRight')
    case 'treetable':
      return treetableAnchors(from, to)
    case 'spreadsheet':
      return spreadsheetAnchors(from, to)
    default: {
      const anchors = geometricAnchors(from, to)
      return { start: anchors.start, end: anchors.end, orientation: anchors.orientation }
    }
  }
}

function fishboneAnchors(from: LayoutNode, to: LayoutNode, headRight: boolean): EdgeAnchors {
  const fromCenterY = from.y + from.height / 2
  const fromCenterX = from.x + from.width / 2
  const toCenterX = to.x + to.width / 2
  const toCenterY = to.y + to.height / 2
  if (from.depth === 0) {
    const jointX = headRight ? to.x + to.width + 12 : to.x - 12
    return {
      start: { x: jointX, y: fromCenterY },
      end: {
        x: to.x + to.width / 2,
        y: toCenterY < fromCenterY ? to.y + to.height : to.y
      },
      orientation: 'horizontal'
    }
  }
  const horizontal = toCenterX >= fromCenterX ? 'right' : 'left'
  const anchors = horizontalAnchors(from, to, horizontal)
  return { start: anchors.start, end: anchors.end, orientation: anchors.orientation }
}

function treetableAnchors(from: LayoutNode, to: LayoutNode): EdgeAnchors {
  const fromCenterY = from.y + from.height / 2
  const toCenterY = to.y + to.height / 2
  return to.x >= from.x
    ? {
        start: { x: from.x + from.width, y: fromCenterY },
        end: { x: to.x, y: toCenterY },
        orientation: 'horizontal'
      }
    : {
        start: { x: from.x, y: fromCenterY },
        end: { x: to.x + to.width, y: toCenterY },
        orientation: 'horizontal'
      }
}

function spreadsheetAnchors(from: LayoutNode, to: LayoutNode): EdgeAnchors {
  const fromCenterX = from.x + from.width / 2
  const fromCenterY = from.y + from.height / 2
  const toCenterX = to.x + to.width / 2
  const toCenterY = to.y + to.height / 2
  if (from.depth === 0) {
    return {
      start: { x: from.x + from.width, y: fromCenterY },
      end: { x: to.x, y: toCenterY },
      orientation: 'horizontal'
    }
  }
  return toCenterY >= fromCenterY
    ? {
        start: { x: fromCenterX, y: from.y + from.height },
        end: { x: toCenterX, y: to.y },
        orientation: 'vertical'
      }
    : {
        start: { x: fromCenterX, y: from.y },
        end: { x: toCenterX, y: to.y + to.height },
        orientation: 'vertical'
      }
}

function geometricAnchors(from: LayoutNode, to: LayoutNode): EdgeAnchors {
  const fromCenterX = from.x + from.width / 2
  const fromCenterY = from.y + from.height / 2
  const toCenterX = to.x + to.width / 2
  const toCenterY = to.y + to.height / 2
  const horizontal = toCenterX >= fromCenterX ? 'right' : 'left'
  const vertical = toCenterY >= fromCenterY ? 'down' : 'up'
  const overlapX =
    Math.min(from.x + from.width, to.x + to.width) > Math.max(from.x, to.x)
  const overlapY =
    Math.min(from.y + from.height, to.y + to.height) > Math.max(from.y, to.y)

  if (overlapY && !overlapX) return horizontalAnchors(from, to, horizontal)
  if (overlapX && !overlapY) return verticalAnchors(from, to, vertical)

  const horizontalGap = Math.max(
    0,
    Math.max(from.x, to.x) - Math.min(from.x + from.width, to.x + to.width)
  )
  const verticalGap = Math.max(
    0,
    Math.max(from.y, to.y) - Math.min(from.y + from.height, to.y + to.height)
  )
  if (horizontalGap !== verticalGap) {
    return horizontalGap < verticalGap
      ? horizontalAnchors(from, to, horizontal)
      : verticalAnchors(from, to, vertical)
  }
  return Math.abs(toCenterX - fromCenterX) >= Math.abs(toCenterY - fromCenterY)
    ? horizontalAnchors(from, to, horizontal)
    : verticalAnchors(from, to, vertical)
}

function horizontalAnchors(
  from: LayoutNode,
  to: LayoutNode,
  direction: 'left' | 'right'
): EdgeAnchors {
  const fromCenterY = from.y + from.height / 2
  const toCenterY = to.y + to.height / 2
  return direction === 'right'
    ? {
        start: { x: from.x + from.width, y: fromCenterY },
        end: { x: to.x, y: toCenterY },
        direction,
        orientation: 'horizontal' as const
      }
    : {
        start: { x: from.x, y: fromCenterY },
        end: { x: to.x + to.width, y: toCenterY },
        direction,
        orientation: 'horizontal' as const
      }
}

function verticalAnchors(
  from: LayoutNode,
  to: LayoutNode,
  direction: 'down' | 'up'
): EdgeAnchors {
  const fromCenterX = from.x + from.width / 2
  const toCenterX = to.x + to.width / 2
  return direction === 'down'
    ? {
        start: { x: fromCenterX, y: from.y + from.height },
        end: { x: toCenterX, y: to.y },
        direction,
        orientation: 'vertical' as const
      }
    : {
        start: { x: fromCenterX, y: from.y },
        end: { x: toCenterX, y: to.y + to.height },
        direction,
        orientation: 'vertical' as const
      }
}
