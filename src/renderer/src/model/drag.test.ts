import { describe, expect, it } from 'vitest'
import { computeDragState, planDragDrop, type DragMemberSource } from './drag'
import type { Rect } from './geometry'

const rect = (x: number, y: number, width = 100, height = 40): Rect => ({ x, y, width, height })
const options = { snapDistance: 72, detachDistance: 112, collisionPadding: 12 }

function source(
  id: string,
  box: Rect,
  parentRect?: Rect,
  floating = false
): DragMemberSource {
  return { id, rect: box, parentId: parentRect ? 'parent' : undefined, parentRect, floating }
}

describe('computeDragState', () => {
  it('moves every member by the same delta', () => {
    const result = computeDragState(
      [source('a', rect(100, 100)), source('b', rect(300, 160))],
      { x: 20, y: 30 },
      [],
      [],
      options
    )!
    expect(result.members.map((member) => ({ id: member.id, x: member.x, y: member.y }))).toEqual([
      { id: 'a', x: 120, y: 130 },
      { id: 'b', x: 320, y: 190 }
    ])
    expect(result.delta).toEqual({ x: 20, y: 30 })
    expect(result.bbox).toEqual({ x: 120, y: 130, width: 300, height: 100 })
  })

  it('shifts the whole group when the bounding box collides', () => {
    const result = computeDragState(
      [source('a', rect(0, 0)), source('b', rect(40, 0))],
      { x: 0, y: 0 },
      [rect(0, 0)],
      [],
      options
    )!
    expect(Math.abs(result.delta.y)).toBeGreaterThan(0)
    expect(result.members[1].x - result.members[0].x).toBe(40)
    expect(result.members[1].y - result.members[0].y).toBe(0)
  })

  it('marks members that moved away from their parent', () => {
    const parent = rect(0, 0)
    const result = computeDragState(
      [source('a', rect(120, 0), parent)],
      { x: 0, y: 200 },
      [],
      [],
      options
    )!
    expect(result.members[0].willDetach).toBe(true)
    expect(result.willDetachIds.has('a')).toBe(true)
  })

  it('does not detach a member that is still close to its parent', () => {
    const parent = rect(0, 0)
    const result = computeDragState(
      [source('a', rect(120, 0), parent)],
      { x: 0, y: 20 },
      [],
      [],
      options
    )!
    expect(result.members[0].willDetach).toBe(false)
  })

  it('never detaches floating members', () => {
    const result = computeDragState(
      [source('a', rect(120, 0), rect(0, 0), true)],
      { x: 0, y: 200 },
      [],
      [],
      options
    )!
    expect(result.members[0].willDetach).toBe(false)
  })

  it('finds a snap target near a member outside the bounding box', () => {
    const result = computeDragState(
      [source('a', rect(0, 0)), source('b', rect(400, 200))],
      { x: 0, y: 0 },
      [],
      [{ id: 'target', ...rect(400, 260) }],
      options
    )!
    expect(result.targetId).toBe('target')
  })

  it('does not snap to a topic enclosed by the bounding box', () => {
    const result = computeDragState(
      [source('a', rect(0, 0)), source('b', rect(0, 200))],
      { x: 0, y: 0 },
      [],
      [{ id: 'middle', ...rect(0, 100) }],
      options
    )!
    expect(result.targetId).toBeUndefined()
  })

  it('does not snap to a distant topic enclosed by the bounding box', () => {
    const result = computeDragState(
      [source('left', rect(-300, 0)), source('right', rect(300, 0))],
      { x: 0, y: 0 },
      [],
      [{ id: 'middle', ...rect(0, 0) }],
      options
    )!
    expect(result.targetId).toBeUndefined()
  })

  it('returns undefined when the group is empty', () => {
    expect(computeDragState([], { x: 0, y: 0 }, [], [], options)).toBeUndefined()
  })

  it('does not push the group when the bounding box merely encloses a non-member topic', () => {
    const result = computeDragState(
      [source('left', rect(-300, 0)), source('right', rect(200, 0))],
      { x: 0, y: 0 },
      [rect(0, 0, 160, 40)],
      [],
      options
    )!
    expect(result.delta).toEqual({ x: 0, y: 0 })
    expect(result.bbox).toEqual({ x: -300, y: 0, width: 600, height: 40 })
    expect(result.willDetachIds.size).toBe(0)

    const nudged = computeDragState(
      [source('left', rect(-300, 0)), source('right', rect(200, 0))],
      { x: 0, y: 1 },
      [rect(0, 0, 160, 40)],
      [],
      options
    )!
    expect(nudged.delta).toEqual({ x: 0, y: 1 })
  })

  it('still avoids an obstacle that a member actually touches', () => {
    const result = computeDragState(
      [source('a', rect(0, 0))],
      { x: 0, y: 0 },
      [rect(80, 0)],
      [],
      options
    )!
    expect(result.delta.x).toBeLessThan(0)
  })

  it('marks only attached members for detaching in a mixed group', () => {
    const parent = rect(0, 0)
    const result = computeDragState(
      [source('attached', rect(120, 0), parent), source('floating', rect(120, 200), parent, true)],
      { x: 0, y: 200 },
      [],
      [],
      options
    )!
    expect(Array.from(result.willDetachIds)).toEqual(['attached'])
  })

  it('can snap and detach in the same frame', () => {
    const parent = rect(0, 0)
    const result = computeDragState(
      [source('a', rect(120, 0), parent)],
      { x: 0, y: 200 },
      [],
      [{ id: 'target', ...rect(120, 260) }],
      options
    )!
    expect(result.targetId).toBe('target')
    expect(result.willDetachIds.has('a')).toBe(true)
  })

  it('ignores an enclosed obstacle that only touches a member through padding', () => {
    const result = computeDragState(
      [source('a', rect(0, 0)), source('b', rect(300, 0))],
      { x: 0, y: 0 },
      [rect(100, 0)],
      [],
      options
    )!
    expect(result.delta).toEqual({ x: 0, y: 0 })
    expect(result.bbox).toEqual({ x: 0, y: 0, width: 400, height: 40 })
  })

  it('allows overlaps when avoidCollisions is false', () => {
    const result = computeDragState(
      [source('a', rect(0, 0))],
      { x: 0, y: 0 },
      [rect(0, 0)],
      [],
      { ...options, avoidCollisions: false }
    )!
    expect(result.delta).toEqual({ x: 0, y: 0 })
    expect(result.bbox).toEqual({ x: 0, y: 0, width: 100, height: 40 })
  })

  it('detaches immediately with free-branch options', () => {
    const parent = rect(0, 0)
    const result = computeDragState(
      [source('a', rect(120, 0), parent)],
      { x: 0, y: 1 },
      [],
      [],
      { snapDistance: 0, detachDistance: 1, collisionPadding: 12 }
    )!
    expect(result.targetId).toBeUndefined()
    expect(result.willDetachIds.has('a')).toBe(true)
  })
})

describe('planDragDrop', () => {
  const member = (
    id: string,
    x: number,
    y: number,
    floating = false,
    willDetach = false
  ) => ({ id, x, y, width: 100, height: 40, floating, willDetach })

  it('orders target drops by y then x', () => {
    const plan = planDragDrop(
      [member('b', 0, 200), member('a', 200, 100), member('c', 0, 100)],
      'target',
      { x: 10, y: 20 }
    )
    expect(plan.targetIds).toEqual(['c', 'a', 'b'])
    expect(plan.detachEntries).toEqual([])
    expect(plan.positionEntries).toEqual([])
  })

  it('splits floating and detaching members on empty drops', () => {
    const plan = planDragDrop(
      [member('float', 100, 200, true), member('detach', 300, 400, false, true), member('stay', 500, 600)],
      undefined,
      { x: 50, y: 50 }
    )
    expect(plan.targetIds).toBeUndefined()
    expect(plan.detachEntries).toEqual([{ id: 'detach', position: { x: 250, y: 350 } }])
    expect(plan.positionEntries).toEqual([{ id: 'float', position: { x: 50, y: 150 } }])
  })
})

describe('first-level parallel snapping', () => {
  const root = { id: 'root', ...rect(0, 0, 160, 100), depth: 0 }
  const first = { id: 'first', ...rect(216, -220, 140, 40), depth: 1 }
  const second = { id: 'second', ...rect(216, -30, 140, 40), depth: 1 }

  it('prefers the root when a topic is parallel above a first-level topic', () => {
    const result = computeDragState(
      [source('drag', rect(240, -140, 120, 40))],
      { x: 0, y: 0 },
      [],
      [root, first, second],
      options
    )!
    expect(result.targetId).toBe('root')
  })

  it('still targets the first-level topic when dragged beside it', () => {
    const result = computeDragState(
      [source('drag', rect(370, -220, 120, 40))],
      { x: 0, y: 0 },
      [],
      [root, first, second],
      options
    )!
    expect(result.targetId).toBe('first')
  })

  it('does not jump to the root when no first-level topic is within snap distance', () => {
    const result = computeDragState(
      [source('drag', rect(240, -500, 120, 40))],
      { x: 0, y: 0 },
      [],
      [root, first, second],
      options
    )!
    expect(result.targetId).toBeUndefined()
  })

  it('keeps the nearest topic when candidates carry no depth', () => {
    const result = computeDragState(
      [source('drag', rect(240, -140, 120, 40))],
      { x: 0, y: 0 },
      [],
      [
        { id: 'root', ...rect(0, 0, 160, 100) },
        { id: 'first', ...rect(216, -220, 140, 40) }
      ],
      options
    )!
    expect(result.targetId).toBe('first')
  })
})
