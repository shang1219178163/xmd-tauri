import {
  rectDistance,
  rectsOverlap,
  resolveRectCollision,
  translateRect,
  unionRect,
  type Rect,
  type SnapCandidate
} from './geometry'

export interface DragMemberSource {
  id: string
  rect: Rect
  parentId?: string
  parentRect?: Rect
  floating: boolean
}

export interface DragMember extends Rect {
  id: string
  parentId?: string
  floating: boolean
  willDetach: boolean
}

export interface DragOptions {
  snapDistance: number
  detachDistance: number
  collisionPadding: number
  /** When false, the group keeps the raw pointer translation and may overlap. */
  avoidCollisions?: boolean
}

export interface DragResult {
  members: DragMember[]
  bbox: Rect
  delta: { x: number; y: number }
  targetId?: string
  willDetachIds: Set<string>
}

/**
 * Compute one frame of a group drag.
 *
 * `delta` is the total pointer displacement since drag start, not a per-frame
 * increment. `obstacles` and `candidates` must already exclude the group
 * members and their descendants, since a group cannot avoid itself.
 *
 * Only obstacles touching at least one member within `collisionPadding` are
 * considered. An obstacle fully enclosed by the group bounding box is kept
 * only when a member truly overlaps it (without padding); rigid translation
 * cannot clear it, so resolving it would teleport the group. A snap target
 * must not be fully enclosed by the group bounding box and must be within
 * `snapDistance` edge-to-edge of at least one member; the nearest member
 * distance wins. Returns undefined for an empty group.
 */
export function computeDragState(
  sources: DragMemberSource[],
  delta: { x: number; y: number },
  obstacles: Rect[],
  candidates: SnapCandidate[],
  options: DragOptions
): DragResult | undefined {
  if (!sources.length) return undefined

  const translated = sources.map((source) => ({
    source,
    rect: translateRect(source.rect, delta.x, delta.y)
  }))
  const rawBbox = unionRect(translated.map((item) => item.rect))
  if (!rawBbox) return undefined

  // Obstacles enclosed by the bounding box cannot be cleared by rigid
  // translation, so resolving them would trigger the collision fallback and
  // teleport the group. Keep such an obstacle only when a member already
  // overlaps it, which must still be resolved.
  const relevantObstacles =
    options.avoidCollisions === false
      ? []
      : obstacles.filter((obstacle) => {
          const touchesMember = translated.some(({ rect }) =>
            rectsOverlap(rect, obstacle, options.collisionPadding)
          )
          if (!touchesMember) return false
          if (!containsRect(rawBbox, obstacle)) return true
          return translated.some(({ rect }) => rectsOverlap(rect, obstacle))
        })
  const resolved = resolveRectCollision(rawBbox, relevantObstacles, options.collisionPadding)
  const bbox: Rect = { ...rawBbox, x: resolved.x, y: resolved.y }
  const correction = { x: resolved.x - rawBbox.x, y: resolved.y - rawBbox.y }

  const members = translated.map(({ source, rect }) => {
    const moved = translateRect(rect, correction.x, correction.y)
    const willDetach = Boolean(
      !source.floating &&
        source.parentRect &&
        rectDistance(moved, source.parentRect) > options.detachDistance
    )
    return {
      ...moved,
      id: source.id,
      parentId: source.parentId,
      floating: source.floating,
      willDetach
    }
  })

  const snapCandidates = candidates.filter((candidate) => !containsRect(bbox, candidate))
  let snap: { id: string; distance: number } | undefined
  for (const candidate of snapCandidates) {
    let distance = Infinity
    for (const member of members) {
      distance = Math.min(distance, rectDistance(member, candidate))
    }
    if (distance > options.snapDistance) continue
    if (!snap || distance < snap.distance) snap = { id: candidate.id, distance }
  }

  // A topic dragged above/below a first-level topic in the same column is meant
  // to become another first-level topic: preview (and drop) against the root
  // instead of the neighbouring branch.
  const nearestSnap = snap
  const nearest = nearestSnap
    ? snapCandidates.find((candidate) => candidate.id === nearestSnap.id)
    : undefined
  if (nearestSnap && nearest && (nearest.depth === 0 || nearest.depth === 1)) {
    const rootCandidate = snapCandidates.find((candidate) => candidate.depth === 0)
    const parallelToFirstLevel = snapCandidates.some(
      (candidate) =>
        candidate.depth === 1 &&
        members.some(
          (member) =>
            rectDistance(member, candidate) <= options.snapDistance && stackedParallel(member, candidate)
        )
    )
    if (rootCandidate && parallelToFirstLevel) {
      snap = { id: rootCandidate.id, distance: nearestSnap.distance }
    }
  }

  return {
    members,
    bbox,
    delta: { x: delta.x + correction.x, y: delta.y + correction.y },
    targetId: snap?.id,
    willDetachIds: new Set(members.filter((member) => member.willDetach).map((member) => member.id))
  }
}

/** True when `a` sits above/below `b` in the same column (not beside it). */
function stackedParallel(a: Rect, b: Rect): boolean {
  const horizontal =
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  const horizontalAligned = horizontal >= Math.min(a.width, b.width) * 0.5
  const vertical = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  const verticallySeparated = vertical <= Math.min(a.height, b.height) * 0.35
  return horizontalAligned && verticallySeparated
}

function containsRect(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  )
}

export interface DragDropPlan {
  targetIds?: string[]
  detachEntries: { id: string; position: { x: number; y: number } }[]
  positionEntries: { id: string; position: { x: number; y: number } }[]
}

/** Decide the store actions for a released drag. */
export function planDragDrop(
  members: DragMember[],
  targetId: string | undefined,
  rootCenter: { x: number; y: number }
): DragDropPlan {
  if (targetId) {
    return {
      targetIds: [...members].sort((a, b) => a.y - b.y || a.x - b.x).map((member) => member.id),
      detachEntries: [],
      positionEntries: []
    }
  }
  const detachEntries: DragDropPlan['detachEntries'] = []
  const positionEntries: DragDropPlan['positionEntries'] = []
  for (const member of members) {
    const position = { x: member.x - rootCenter.x, y: member.y - rootCenter.y }
    if (member.floating) positionEntries.push({ id: member.id, position })
    else if (member.willDetach) detachEntries.push({ id: member.id, position })
  }
  return { detachEntries, positionEntries }
}
