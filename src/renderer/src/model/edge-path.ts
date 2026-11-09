import type { LayoutEdge, Point } from '@shared/types'

const round = (value: number): string => String(Math.round(value * 100) / 100)

const format = (point: Point): string => `${round(point.x)} ${round(point.y)}`

function along(from: Point, to: Point, distance: number): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  if (!length) return { ...from }
  const scale = distance / length
  return { x: from.x + dx * scale, y: from.y + dy * scale }
}

function curvePath(points: Point[]): string {
  const [start, split, control, end] = points
  return `M ${format(start)} L ${format(split)} Q ${format(control)} ${format(end)}`
}

function straightPath(points: Point[]): string {
  return `M ${points.map(format).join(' L ')}`
}

function elbowPath(points: Point[]): string {
  return `M ${points.map(format).join(' L ')}`
}

function roundedElbowPath(points: Point[], _orientation: LayoutEdge['orientation']): string {
  const [start, split, corner, end] = points
  const radius = Math.min(
    8,
    Math.abs(corner.x - split.x) + Math.abs(corner.y - split.y),
    Math.abs(end.x - corner.x) + Math.abs(end.y - corner.y)
  )
  if (radius <= 0) return elbowPath(points)
  const enter = along(split, corner, radius)
  const leave = along(corner, end, radius)
  return `M ${format(start)} L ${format(enter)} Q ${format(corner)} ${format(leave)} L ${format(end)}`
}

function bightPath(points: Point[]): string {
  const [start, split, c1, c2, end] = points
  return `M ${format(start)} L ${format(split)} C ${format(c1)} ${format(c2)} ${format(end)}`
}

function roundedFoldPath(points: Point[]): string {
  const [start, split, bend, end] = points
  const radius =
    Math.min(Math.hypot(bend.x - split.x, bend.y - split.y), Math.hypot(end.x - bend.x, end.y - bend.y)) /
    4
  if (radius <= 0) return `M ${points.map(format).join(' L ')}`
  const enter = along(split, bend, radius)
  const leave = along(bend, end, radius)
  return `M ${format(start)} L ${format(enter)} Q ${format(bend)} ${format(leave)} L ${format(end)}`
}

function bracePath(points: Point[]): string {
  const [start, end] = points
  const centerX = (start.x + end.x) / 2
  const down = end.y > start.y ? 1 : -1
  const corner = Math.min(Math.abs(end.x - start.x) / 2, Math.abs(end.y - start.y) / 4)
  return `M ${format(start)} Q ${round(centerX)} ${round(start.y)} ${round(centerX)} ${round(
    start.y + down * corner
  )} L ${round(centerX)} ${round(end.y - down * corner)} Q ${round(centerX)} ${round(
    end.y
  )} ${format(end)}`
}

function taperedPath(start: Point, end: Point): string {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy) || 1
  const nx = (-dy / length) * 4
  const ny = (dx / length) * 4
  return `M ${round(start.x + nx)} ${round(start.y + ny)} L ${round(end.x)} ${round(
    end.y
  )} L ${round(start.x - nx)} ${round(start.y - ny)} Z`
}

/** Build the SVG path for a branch edge; canvas and exporters share it. */
/**
 * Vertical grouped brace at `start.x`, spanning `start.y..end.y`. The body
 * sits `depth` pixels to the right and the cusp points left toward the parent.
 */
export function braceVerticalPath(start: Point, end: Point, depth = 10): string {
  const x = start.x
  const top = Math.min(start.y, end.y)
  const bottom = Math.max(start.y, end.y)
  const middle = (top + bottom) / 2
  const corner = Math.min(depth, (bottom - top) / 4)
  const bodyX = x + depth
  return `M ${round(x)} ${round(top)} Q ${round(bodyX)} ${round(top)} ${round(bodyX)} ${round(
    top + corner
  )} L ${round(bodyX)} ${round(middle - corner)} Q ${round(bodyX)} ${round(middle)} ${round(
    x
  )} ${round(middle)} Q ${round(bodyX)} ${round(middle)} ${round(bodyX)} ${round(
    middle + corner
  )} L ${round(bodyX)} ${round(bottom - corner)} Q ${round(bodyX)} ${round(bottom)} ${round(
    x
  )} ${round(bottom)}`
}

export function edgeToPath(edge: LayoutEdge): string {
  const points = edge.points
  if (!points.length) return ''
  switch (edge.kind) {
    case 'curve':
      return curvePath(points)
    case 'straight':
      return straightPath(points)
    case 'elbow':
      return elbowPath(points)
    case 'roundedElbow':
      return roundedElbowPath(points, edge.orientation)
    case 'bight':
      return bightPath(points)
    case 'fold':
      return elbowPath(points)
    case 'roundedFold':
      return roundedFoldPath(points)
    case 'brace':
      return bracePath(points)
    case 'tapered':
      return taperedPath(points[0], points[points.length - 1])
  }
}
