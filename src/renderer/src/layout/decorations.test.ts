import { describe, expect, it } from 'vitest'
import type { Sheet, Topic } from '@shared/types'
import { createSheet } from '@shared/defaults'
import { STRUCTURES } from '@shared/structures'
import { layoutSheet } from './index'

function topic(id: string, title: string, children: Topic[] = []): Topic {
  return { id, class: 'topic', title, children: { attached: children, detached: [] } }
}

function sheetOf(key: keyof typeof STRUCTURES, root: Topic): Sheet {
  const sheet = createSheet('Test', 'Root')
  sheet.rootTopic = { ...root, structureClass: STRUCTURES[key].classId }
  return sheet
}

describe('structure decorations', () => {
  it('draws one fishbone spine along the root centre', () => {
    const root = topic('root', 'Root', [
      topic('a', 'A'),
      topic('b', 'B'),
      topic('c', 'C')
    ])
    const result = layoutSheet(sheetOf('fishboneLeft', root))
    const spine = result.decorations.find((item) => item.kind === 'line')
    const rootNode = result.nodes.get('root')!

    expect(spine).toBeDefined()
    expect(spine!.points).toHaveLength(2)
    expect(spine!.points[0].y).toBeCloseTo(rootNode.y + rootNode.height / 2)
    expect(spine!.points[1].x).toBeGreaterThan(spine!.points[0].x)
    expect(result.edges.filter((edge) => edge.fromId === 'root')).toHaveLength(3)
    for (const edge of result.edges.filter((item) => item.fromId === 'root')) {
      expect(edge.kind).toBe('straight')
      expect(edge.points[0].y).toBeCloseTo(rootNode.y + rootNode.height / 2)
    }
  })

  it('draws a shared brace and lead line for every parent', () => {
    const root = topic('root', 'Root', [
      topic('a', 'A', [topic('a1', 'A1'), topic('a2', 'A2')]),
      topic('b', 'B')
    ])
    const result = layoutSheet(sheetOf('braceRight', root))
    const braces = result.decorations.filter((item) => item.kind === 'brace')
    const leads = result.decorations.filter((item) => item.kind === 'line')

    expect(result.edges).toHaveLength(0)
    expect(braces).toHaveLength(2)
    expect(leads).toHaveLength(2)
    for (const brace of braces) {
      expect(brace.points[0].x).toBe(brace.points[1].x)
      expect(brace.points[0].y).not.toBe(brace.points[1].y)
    }
  })

  it('expands a single-child brace so it remains visible', () => {
    const root = topic('root', 'Root', [topic('a', 'A', [topic('a1', 'A1')])])
    const result = layoutSheet(sheetOf('braceRight', root))
    const braces = result.decorations.filter((item) => item.kind === 'brace')
    expect(braces.length).toBe(2)
    for (const brace of braces) {
      expect(Math.abs(brace.points[1].y - brace.points[0].y)).toBeGreaterThanOrEqual(20)
    }
  })
})
