import { describe, expect, it } from 'vitest'
import type { LayoutEdge, Point } from '@shared/types'
import { braceVerticalPath, edgeToPath } from './edge-path'

const edge = (
  kind: LayoutEdge['kind'],
  points: Point[],
  orientation: LayoutEdge['orientation'] = 'horizontal'
): LayoutEdge => ({
  id: 'e',
  fromId: 'a',
  toId: 'b',
  points,
  orientation,
  kind,
  width: 2
})

describe('edgeToPath', () => {
  it('builds an Xmind quadratic curve', () => {
    expect(
      edgeToPath(
        edge('curve', [
          { x: 0, y: 20 },
          { x: 13, y: 20 },
          { x: 50.4, y: -20 },
          { x: 200, y: -20 }
        ])
      )
    ).toBe('M 0 20 L 13 20 Q 50.4 -20 200 -20')
  })

  it('builds straight, elbow and rounded elbow paths', () => {
    const points = [
      { x: 0, y: 20 },
      { x: 13, y: 20 },
      { x: 13, y: -20 },
      { x: 200, y: -20 }
    ]
    expect(edgeToPath(edge('straight', [points[0], points[1], points[3]]))).toBe(
      'M 0 20 L 13 20 L 200 -20'
    )
    expect(edgeToPath(edge('elbow', points))).toBe('M 0 20 L 13 20 L 13 -20 L 200 -20')
    expect(edgeToPath(edge('roundedElbow', points))).toBe(
      'M 0 20 L 13 12 Q 13 -20 21 -20 L 200 -20'
    )
  })

  it('builds bight and fold paths', () => {
    expect(
      edgeToPath(
        edge('bight', [
          { x: 0, y: 20 },
          { x: 13, y: 20 },
          { x: 153.25, y: 20 },
          { x: 106.5, y: -20 },
          { x: 200, y: -20 }
        ])
      )
    ).toBe('M 0 20 L 13 20 C 153.25 20 106.5 -20 200 -20')

    expect(
      edgeToPath(
        edge('fold', [
          { x: 0, y: 20 },
          { x: 13, y: 20 },
          { x: 137.67, y: -20 },
          { x: 200, y: -20 }
        ])
      )
    ).toBe('M 0 20 L 13 20 L 137.67 -20 L 200 -20')
  })

  it('rounds the fold bend', () => {
    const path = edgeToPath(
      edge('roundedFold', [
        { x: 0, y: 20 },
        { x: 13, y: 20 },
        { x: 106.5, y: -20 },
        { x: 200, y: -20 }
      ])
    )
    expect(path.startsWith('M 0 20 L ')).toBe(true)
    expect(path).toContain(' Q 106.5 -20 ')
    expect(path.endsWith(' 200 -20')).toBe(true)
  })

  it('builds a brace path', () => {
    expect(
      edgeToPath(edge('brace', [{ x: 13, y: 20 }, { x: 200, y: -20 }]))
    ).toBe('M 13 20 Q 106.5 20 106.5 10 L 106.5 -10 Q 106.5 -20 200 -20')
  })

  it('builds a tapered polygon', () => {
    const path = edgeToPath(edge('tapered', [{ x: 0, y: 0 }, { x: 100, y: 40 }]))
    expect(path.startsWith('M ')).toBe(true)
    expect(path.endsWith(' Z')).toBe(true)
  })

  it('builds a vertical grouped brace', () => {
    expect(braceVerticalPath({ x: 100, y: 0 }, { x: 100, y: 100 })).toBe(
      'M 100 0 Q 110 0 110 10 L 110 40 Q 110 50 100 50 Q 110 50 110 60 L 110 90 Q 110 100 100 100'
    )
  })

  it('rounds values to two decimals', () => {
    expect(
      edgeToPath(
        edge('straight', [
          { x: 0.1234, y: 0 },
          { x: 1.9876, y: 0 },
          { x: 2.5555, y: 0 }
        ])
      )
    ).toBe('M 0.12 0 L 1.99 0 L 2.56 0')
  })
})
