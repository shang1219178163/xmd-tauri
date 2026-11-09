export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface CollisionResult {
  x: number
  y: number
  shifted: boolean
}

/** Distance between two axis-aligned rectangles; 0 when they touch or overlap. */
export function rectDistance(a: Rect, b: Rect): number {
  const dx = Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width), 0)
  const dy = Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height), 0)
  return Math.hypot(dx, dy)
}

export function rectsOverlap(a: Rect, b: Rect, padding = 0): boolean {
  return (
    a.x - padding < b.x + b.width &&
    a.x + a.width + padding > b.x &&
    a.y - padding < b.y + b.height &&
    a.y + a.height + padding > b.y
  )
}

/** Smallest rectangle containing every input; undefined when the list is empty. */
export function unionRect(rects: Rect[]): Rect | undefined {
  if (!rects.length) return undefined
  const minX = Math.min(...rects.map((rect) => rect.x))
  const minY = Math.min(...rects.map((rect) => rect.y))
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.width))
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.height))
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function translateRect(rect: Rect, dx: number, dy: number): Rect {
  return { ...rect, x: rect.x + dx, y: rect.y + dy }
}

/**
 * Push `rect` out of every obstacle using the smallest translation axis.
 * Deterministic, bounded by `maxIterations`; returns the resolved top-left.
 */
export function resolveRectCollision(
  rect: Rect,
  obstacles: Rect[],
  padding = 12,
  maxIterations = 12
): CollisionResult {
  let x = rect.x
  let y = rect.y
  let shifted = false
  // Expand obstacles once; resolving against the expanded rectangles keeps the
  // requested gap without double-counting padding in the push distance.
  const expanded = obstacles.map((obstacle) => ({
    x: obstacle.x - padding,
    y: obstacle.y - padding,
    width: obstacle.width + padding * 2,
    height: obstacle.height + padding * 2
  }))

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let movedThisPass = false
    for (const obstacle of expanded) {
      const current: Rect = { x, y, width: rect.width, height: rect.height }
      if (!rectsOverlap(current, obstacle)) continue

      const left = Math.max(current.x, obstacle.x)
      const right = Math.min(current.x + current.width, obstacle.x + obstacle.width)
      const top = Math.max(current.y, obstacle.y)
      const bottom = Math.min(current.y + current.height, obstacle.y + obstacle.height)
      const overlapX = right - left
      const overlapY = bottom - top
      if (overlapX <= 0 || overlapY <= 0) continue

      const currentCenterX = current.x + current.width / 2
      const currentCenterY = current.y + current.height / 2
      const obstacleCenterX = obstacle.x + obstacle.width / 2
      const obstacleCenterY = obstacle.y + obstacle.height / 2
      const epsilon = 0.01

      if (overlapX < overlapY) {
        x += currentCenterX <= obstacleCenterX ? -(overlapX + epsilon) : overlapX + epsilon
      } else {
        y += currentCenterY <= obstacleCenterY ? -(overlapY + epsilon) : overlapY + epsilon
      }
      shifted = true
      movedThisPass = true
    }
    if (!movedThisPass) break
  }

  const overlaps = () =>
    expanded.some((obstacle) => rectsOverlap({ x, y, width: rect.width, height: rect.height }, obstacle))

  // Expanded obstacles can overlap each other when nodes sit closer than the
  // requested gap. In that case the smallest-axis pushes cannot settle; fall
  // back to a nearby side of the obstacle union.
  if (overlaps()) {
    const originalX = rect.x
    const originalY = rect.y
    const left = Math.min(...expanded.map((o) => o.x))
    const top = Math.min(...expanded.map((o) => o.y))
    const right = Math.max(...expanded.map((o) => o.x + o.width))
    const bottom = Math.max(...expanded.map((o) => o.y + o.height))
    const epsilon = 0.5
    const candidates = [
      { x: right + epsilon, y },
      { x: left - rect.width - epsilon, y },
      { x, y: bottom + epsilon },
      { x, y: top - rect.height - epsilon },
      { x: right + epsilon, y: top },
      { x: left - rect.width - epsilon, y: top }
    ].sort(
      (a, b) =>
        Math.hypot(a.x - originalX, a.y - originalY) - Math.hypot(b.x - originalX, b.y - originalY)
    )
    for (const candidate of candidates) {
      const clear = expanded.every(
        (obstacle) => !rectsOverlap({ x: candidate.x, y: candidate.y, width: rect.width, height: rect.height }, obstacle)
      )
      if (clear) {
        x = candidate.x
        y = candidate.y
        shifted = true
        break
      }
    }
  }

  return { x, y, shifted }
}

export interface SnapCandidate extends Rect {
  id: string
  /** Layout depth: 0 = root, 1 = first-level topic. */
  depth?: number
}

/** Nearest candidate within `maxDistance`, measured edge-to-edge. */
export function findSnapTarget(
  rect: Rect,
  candidates: SnapCandidate[],
  maxDistance: number
): { id: string; distance: number } | undefined {
  let best: { id: string; distance: number } | undefined
  for (const candidate of candidates) {
    const distance = rectDistance(rect, candidate)
    if (distance > maxDistance) continue
    if (!best || distance < best.distance) best = { id: candidate.id, distance }
  }
  return best
}
