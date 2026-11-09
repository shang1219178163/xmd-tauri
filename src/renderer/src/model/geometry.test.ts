import { describe, expect, it } from 'vitest'
import {
  findSnapTarget,
  rectDistance,
  rectsOverlap,
  resolveRectCollision,
  translateRect,
  unionRect,
  type Rect
} from './geometry'

const rect = (x: number, y: number, width = 100, height = 40): Rect => ({ x, y, width, height })

describe('rectDistance', () => {
  it('measures the horizontal gap between two rectangles', () => {
    expect(rectDistance(rect(0, 0), rect(110, 0))).toBeCloseTo(10)
  })

  it('measures the diagonal gap', () => {
    expect(rectDistance(rect(0, 0), rect(103, 44))).toBeCloseTo(5)
  })

  it('is zero for touching or overlapping rectangles', () => {
    expect(rectDistance(rect(0, 0), rect(100, 0))).toBe(0)
    expect(rectDistance(rect(0, 0), rect(50, 10))).toBe(0)
  })
})

describe('rectsOverlap', () => {
  it('treats padding as part of the first rectangle', () => {
    const a = rect(0, 0)
    const b = rect(110, 0)
    expect(rectsOverlap(a, b, 0)).toBe(false)
    expect(rectsOverlap(a, b, 12)).toBe(true)
  })
})

describe('resolveRectCollision', () => {
  it('leaves a free rectangle untouched', () => {
    const result = resolveRectCollision(rect(0, 0), [rect(300, 0)])
    expect(result).toEqual({ x: 0, y: 0, shifted: false })
  })

  it('pushes a rectangle out along the smallest overlap axis', () => {
    const result = resolveRectCollision(rect(90, 0), [rect(0, 0)], 12)
    expect(result.shifted).toBe(true)
    expect(result.x).toBeGreaterThanOrEqual(112)
    expect(result.y).toBe(0)
  })

  it('resolves vertical overlap when it is smaller', () => {
    const result = resolveRectCollision(rect(20, 30), [rect(0, 0)], 12)
    expect(result.shifted).toBe(true)
    expect(result.y).toBeGreaterThanOrEqual(52)
  })

  it('settles with multiple obstacles', () => {
    const obstacles = [rect(0, 0), rect(0, 60), rect(0, 120)]
    const result = resolveRectCollision(rect(20, 20), obstacles, 12)
    expect(result.shifted).toBe(true)
    const resolved = rect(result.x, result.y)
    for (const obstacle of obstacles) {
      expect(rectsOverlap(resolved, obstacle, 12)).toBe(false)
    }
  })

  it('is stable when run again on the resolved rectangle', () => {
    const obstacles = [rect(0, 0), rect(0, 60)]
    const first = resolveRectCollision(rect(20, 20), obstacles, 12)
    const second = resolveRectCollision(rect(first.x, first.y), obstacles, 12)
    expect(second).toEqual({ x: first.x, y: first.y, shifted: false })
  })
})

describe('findSnapTarget', () => {
  it('returns the nearest candidate inside the threshold', () => {
    const result = findSnapTarget(rect(0, 0), [
      { ...rect(200, 0), id: 'far' },
      { ...rect(80, 0), id: 'near' },
      { ...rect(120, 0), id: 'middle' }
    ], 72)
    expect(result?.id).toBe('near')
    expect(result?.distance).toBeCloseTo(0)
  })

  it('ignores candidates beyond the threshold', () => {
    expect(findSnapTarget(rect(0, 0), [{ ...rect(200, 0), id: 'far' }], 72)).toBeUndefined()
  })
})

describe('unionRect', () => {
  it('returns the smallest rectangle containing every input', () => {
    expect(unionRect([rect(10, 20, 100, 40), rect(150, 60, 50, 30)])).toEqual({
      x: 10,
      y: 20,
      width: 190,
      height: 70
    })
  })

  it('returns undefined for an empty list', () => {
    expect(unionRect([])).toBeUndefined()
  })
})

describe('translateRect', () => {
  it('moves a rectangle without changing its size', () => {
    expect(translateRect(rect(10, 20), -5, 8)).toEqual({ x: 5, y: 28, width: 100, height: 40 })
  })
})
