import { describe, expect, it } from 'vitest'
import type { Sheet, Topic } from '@shared/types'
import { createSheet, DEFAULT_THEME } from '@shared/defaults'
import { STRUCTURE_LIST } from '@shared/structures'
import { layoutSheet, measureTopic } from './index'

function makeTopic(
  id: string,
  title: string,
  children: Topic[] = [],
  extra: Partial<Topic> = {}
): Topic {
  return {
    id,
    class: 'topic',
    title,
    children: { attached: children, detached: [] },
    ...extra
  }
}

/** 13 visible topics: root + 4 main topics + 2 children each. */
function baseRoot(): Topic {
  return makeTopic('root', 'Central Topic', [
    makeTopic('a', 'Alpha', [makeTopic('a1', 'A1'), makeTopic('a2', 'A2')]),
    makeTopic('b', 'Beta', [makeTopic('b1', 'B1'), makeTopic('b2', 'B2')]),
    makeTopic('c', 'Gamma', [makeTopic('c1', 'C1'), makeTopic('c2', 'C2')]),
    makeTopic('d', 'Delta', [makeTopic('d1', 'D1'), makeTopic('d2', 'D2')])
  ])
}

function makeSheet(classId: string | undefined, root: Topic): Sheet {
  const sheet = createSheet('Test sheet', 'Central Topic')
  sheet.rootTopic = classId ? { ...root, structureClass: classId } : root
  return sheet
}

function visibleIds(topic: Topic): string[] {
  const ids = [topic.id]
  if (topic.collapsed) return ids
  for (const child of topic.children?.attached ?? []) ids.push(...visibleIds(child))
  for (const child of topic.children?.detached ?? []) ids.push(...visibleIds(child))
  return ids
}

function visibleAttachedPairs(topic: Topic): number {
  if (topic.collapsed) return 0
  const attached = topic.children?.attached ?? []
  return (
    attached.length +
    attached.reduce((sum, child) => sum + visibleAttachedPairs(child), 0)
  )
}

describe('every structure produces a complete layout', () => {
  for (const definition of STRUCTURE_LIST) {
    it(`lays out all visible topics: ${definition.key}`, () => {
      const root = baseRoot()
      const sheet = makeSheet(definition.classId, root)
      const result = layoutSheet(sheet)

      expect(result.structure).toBe(definition.key)
      expect(result.nodes.size).toBe(13)

      for (const id of visibleIds(root)) {
        expect(result.nodes.has(id)).toBe(true)
      }

      for (const node of result.nodes.values()) {
        expect(Number.isFinite(node.x)).toBe(true)
        expect(Number.isFinite(node.y)).toBe(true)
        expect(node.width).toBeGreaterThan(0)
        expect(node.height).toBeGreaterThan(0)
        expect(node.topic.id).toBe(node.id)
      }
    })
  }
})

describe('collapsing', () => {
  it('omits every descendant of a collapsed topic', () => {
    const root = makeTopic('root', 'Root', [
      makeTopic('a', 'A', [makeTopic('a1', 'A1'), makeTopic('a2', 'A2')], {
        collapsed: true
      }),
      makeTopic('b', 'B')
    ])
    const result = layoutSheet(makeSheet(undefined, root))

    expect([...result.nodes.keys()].sort()).toEqual(['a', 'b', 'root'])
    expect(result.nodes.has('a1')).toBe(false)
    expect(result.nodes.has('a2')).toBe(false)
    expect(result.nodes.get('a')).toMatchObject({
      collapsed: true,
      hasChildren: true
    })
    expect(result.edges).toHaveLength(2)
  })
})

describe('measurement', () => {
  it('honors customWidth in measurement and layout', () => {
    const topic = makeTopic('a', 'Alpha', [], { customWidth: 250 })

    expect(measureTopic(topic, { theme: DEFAULT_THEME, depth: 1 }).width).toBe(250)

    const root = makeTopic('root', 'Root', [topic])
    const result = layoutSheet(makeSheet(undefined, root))
    expect(result.nodes.get('a')?.width).toBe(250)
  })

  it('uses theme font size, title estimate, markers, labels and image limits', () => {
    const short = makeTopic('t', 'A')
    const shortSize = measureTopic(short, { theme: DEFAULT_THEME, depth: 2 })
    expect(shortSize.width).toBe(72)
    // subTopic is 13pt -> 17.33px; one line is 17.33 * 1.35 + 14.
    expect(shortSize.height).toBeCloseTo((13 * 4 / 3) * 1.35 + 14, 4)

    const rootSize = measureTopic(makeTopic('r', 'Root'), {
      theme: DEFAULT_THEME,
      depth: 0,
      isRoot: true
    })
    // centralTopic is 26pt -> 34.67px; one line is 34.67 * 1.35 + 14.
    expect(rootSize.height).toBeCloseTo((26 * 4 / 3) * 1.35 + 14, 5)

    const long = makeTopic('l', 'x'.repeat(400))
    expect(measureTopic(long, { theme: DEFAULT_THEME, depth: 1 }).width).toBe(340)

    const marked = makeTopic('m', 'A', [], {
      markers: [{ markerId: 'star-red' }, { markerId: 'flag-blue' }]
    })
    expect(measureTopic(marked, { theme: DEFAULT_THEME, depth: 1 }).width).toBe(
      72 + 36
    )

    const labeled = makeTopic('lb', 'A', [], { labels: ['note'] })
    // mainTopic is 18pt -> 24px; one line is 24 * 1.35 + 14, plus the label row.
    expect(measureTopic(labeled, { theme: DEFAULT_THEME, depth: 1 }).height).toBe(
      24 * 1.35 + 14 + 18
    )

    const withImage = makeTopic('img', 'A', [], {
      image: { src: 'data:image/png;base64,AA==' }
    })
    const imageSize = measureTopic(withImage, { theme: DEFAULT_THEME, depth: 1 })
    expect(imageSize.width).toBeGreaterThanOrEqual(120)
    expect(imageSize.height).toBeGreaterThanOrEqual(90)
  })

  it('uses the provided measure callback dimensions', () => {
    const sheet = makeSheet(undefined, baseRoot())
    const result = layoutSheet(sheet, {
      measure: () => ({ width: 123, height: 45 })
    })

    for (const node of result.nodes.values()) {
      expect(node.width).toBe(123)
      expect(node.height).toBe(45)
    }
  })
})

describe('edges', () => {
  it('creates one edge per visible attached parent-child pair for every structure', () => {
    for (const definition of STRUCTURE_LIST) {
      const root = baseRoot()
      const result = layoutSheet(makeSheet(definition.classId, root))
      const expectedEdges =
        definition.family === 'brace' ? 0 : visibleAttachedPairs(root)

      expect(result.edges).toHaveLength(expectedEdges)
      expect(new Set(result.edges.map((edge) => edge.id)).size).toBe(
        result.edges.length
      )

      for (const edge of result.edges) {
        expect(result.nodes.has(edge.fromId)).toBe(true)
        expect(result.nodes.has(edge.toId)).toBe(true)
        expect(edge.points.length).toBeGreaterThanOrEqual(2)
        expect(edge.points.length).toBeLessThanOrEqual(4)
        for (const point of edge.points) {
          expect(Number.isFinite(point.x)).toBe(true)
          expect(Number.isFinite(point.y)).toBe(true)
        }
      }
    }
  })

  it('uses elbow connections for tree and table structures by default', () => {
    for (const key of ['treeRight', 'treeLeft', 'matrix', 'treetable', 'spreadsheet']) {
      const definition = STRUCTURE_LIST.find((item) => item.key === key)
      expect(definition).toBeDefined()
      const result = layoutSheet(makeSheet(definition?.classId, baseRoot()))
      expect(result.edges.length).toBeGreaterThan(0)
      for (const edge of result.edges) expect(edge.kind).toBe('elbow')
    }
  })

  it('replaces brace branch edges with grouped decorations', () => {
    const definition = STRUCTURE_LIST.find((item) => item.key === 'braceRight')
    expect(definition).toBeDefined()
    const result = layoutSheet(makeSheet(definition?.classId, baseRoot()))
    expect(result.edges).toHaveLength(0)
    expect(result.decorations.filter((item) => item.kind === 'brace').length).toBeGreaterThan(0)
    expect(result.decorations.filter((item) => item.kind === 'line').length).toBeGreaterThan(0)
  })
})

describe('bounds and ids', () => {
  it('bounds contain every node with at least 60px padding', () => {
    for (const definition of STRUCTURE_LIST) {
      const result = layoutSheet(makeSheet(definition.classId, baseRoot()))
      let minX = Number.POSITIVE_INFINITY
      let minY = Number.POSITIVE_INFINITY
      let maxX = Number.NEGATIVE_INFINITY
      let maxY = Number.NEGATIVE_INFINITY

      for (const node of result.nodes.values()) {
        minX = Math.min(minX, node.x)
        minY = Math.min(minY, node.y)
        maxX = Math.max(maxX, node.x + node.width)
        maxY = Math.max(maxY, node.y + node.height)

        expect(node.x).toBeGreaterThanOrEqual(result.bounds.x)
        expect(node.y).toBeGreaterThanOrEqual(result.bounds.y)
        expect(node.x + node.width).toBeLessThanOrEqual(
          result.bounds.x + result.bounds.width
        )
        expect(node.y + node.height).toBeLessThanOrEqual(
          result.bounds.y + result.bounds.height
        )
      }

      expect(minX - result.bounds.x).toBeGreaterThanOrEqual(60 - 1e-9)
      expect(minY - result.bounds.y).toBeGreaterThanOrEqual(60 - 1e-9)
      expect(result.bounds.x + result.bounds.width - maxX).toBeGreaterThanOrEqual(
        60 - 1e-9
      )
      expect(result.bounds.y + result.bounds.height - maxY).toBeGreaterThanOrEqual(
        60 - 1e-9
      )
    }
  })

  it('never emits duplicate node ids', () => {
    for (const definition of STRUCTURE_LIST) {
      const result = layoutSheet(makeSheet(definition.classId, baseRoot()))
      const ids = [...result.nodes.keys()]
      expect(new Set(ids).size).toBe(ids.length)
      for (const [key, node] of result.nodes) expect(node.id).toBe(key)
    }
  })
})

describe('structure semantics', () => {
  it('positions floating topics relative to the root center', () => {
    const root = makeTopic('root', 'Root', [makeTopic('a', 'A')])
    root.children!.detached = [
      makeTopic('float', 'Float', [makeTopic('f1', 'F1')], {
        position: { x: 240, y: 120 }
      })
    ]

    const result = layoutSheet(makeSheet(undefined, root))
    const rootNode = result.nodes.get('root')
    const floated = result.nodes.get('float')
    expect(rootNode).toBeDefined()
    expect(floated).toBeDefined()

    const centerX = (rootNode?.x ?? 0) + (rootNode?.width ?? 0) / 2
    const centerY = (rootNode?.y ?? 0) + (rootNode?.height ?? 0) / 2
    expect(floated?.x).toBeCloseTo(centerX + 240, 6)
    expect(floated?.y).toBeCloseTo(centerY + 120, 6)
    expect(result.nodes.get('f1')?.parentId).toBe('float')

    // Detached topics are not connected to their former parent, but their own
    // attached subtree still produces a branch.
    expect(result.edges).toHaveLength(2)
    expect(result.edges.map((edge) => edge.id)).toContain('edge:float->f1')
  })

  it('logicRight places each generation further to the right', () => {
    const root = makeTopic('root', 'Root', [
      makeTopic('a', 'A', [makeTopic('a1', 'A1', [makeTopic('a2', 'A2')])])
    ])
    const result = layoutSheet(makeSheet('org.xmind.ui.logic.right', root))

    for (const node of result.nodes.values()) {
      if (!node.parentId) continue
      const parent = result.nodes.get(node.parentId)
      expect(parent).toBeDefined()
      expect(node.x).toBeGreaterThan(parent?.x ?? 0)
      expect(node.x).toBeGreaterThanOrEqual(
        (parent?.x ?? 0) + (parent?.width ?? 0)
      )
      expect(node.side).toBe('right')
    }
  })

  it('orgDown places each generation further down and aligns siblings', () => {
    const root = makeTopic('root', 'Root', [
      makeTopic('a', 'A', [makeTopic('a1', 'A1'), makeTopic('a2', 'A2')]),
      makeTopic('b', 'B', [makeTopic('b1', 'B1')])
    ])
    const result = layoutSheet(makeSheet('org.xmind.ui.org-chart.down', root))

    for (const node of result.nodes.values()) {
      if (!node.parentId) continue
      const parent = result.nodes.get(node.parentId)
      expect(parent).toBeDefined()
      expect(node.y).toBeGreaterThan(parent?.y ?? 0)
      expect(node.y).toBeGreaterThanOrEqual(
        (parent?.y ?? 0) + (parent?.height ?? 0)
      )
    }

    expect(result.nodes.get('a')?.y).toBe(result.nodes.get('b')?.y)
    expect(result.nodes.get('a1')?.y).toBe(result.nodes.get('a2')?.y)
  })

  it('is deterministic across repeated runs', () => {
    const first = layoutSheet(makeSheet('org.xmind.ui.map.clockwise', baseRoot()))
    const second = layoutSheet(makeSheet('org.xmind.ui.map.clockwise', baseRoot()))

    expect([...first.nodes.entries()]).toEqual([...second.nodes.entries()])
    expect(first.edges).toEqual(second.edges)
    expect(first.bounds).toEqual(second.bounds)
  })
})

describe('fishbone child placement', () => {
  const fishboneBranch = () =>
    makeTopic('root', 'Root', [
      makeTopic('a', 'A', [makeTopic('a1', 'A1'), makeTopic('a2', 'A2')])
    ])

  it('places children beside a left-headed main branch with horizontal edges', () => {
    const definition = STRUCTURE_LIST.find((item) => item.key === 'fishboneLeft')!
    const result = layoutSheet(makeSheet(definition.classId, fishboneBranch()))
    const a = result.nodes.get('a')!
    const a1 = result.nodes.get('a1')!
    const a2 = result.nodes.get('a2')!

    expect(a1.x).toBeGreaterThan(a.x + a.width)
    expect(a2.x).toBeGreaterThan(a.x + a.width)
    const edge = result.edges.find((item) => item.fromId === 'a' && item.toId === 'a1')!
    expect(edge.kind).toBe('straight')
    expect(edge.points[0]).toEqual({ x: a.x + a.width, y: a.y + a.height / 2 })
    expect(edge.points[edge.points.length - 1]).toEqual({ x: a1.x, y: a1.y + a1.height / 2 })
  })

  it('mirrors the child side for a right-headed fishbone', () => {
    const definition = STRUCTURE_LIST.find((item) => item.key === 'fishboneRight')!
    const result = layoutSheet(makeSheet(definition.classId, fishboneBranch()))
    const a = result.nodes.get('a')!
    const a1 = result.nodes.get('a1')!
    const a2 = result.nodes.get('a2')!

    expect(a1.x + a1.width).toBeLessThan(a.x)
    expect(a2.x + a2.width).toBeLessThan(a.x)
    const edge = result.edges.find((item) => item.fromId === 'a' && item.toId === 'a1')!
    expect(edge.points[0]).toEqual({ x: a.x, y: a.y + a.height / 2 })
    expect(edge.points[edge.points.length - 1]).toEqual({ x: a1.x + a1.width, y: a1.y + a1.height / 2 })
  })
})

describe('layout switches', () => {
  const setSettings = (sheet: Sheet, patch: Record<string, unknown>) => {
    sheet.settings = { ...(sheet.settings ?? {}), ...patch }
  }

  it('autoBalance=false keeps every main topic on the right', () => {
    const root = makeTopic('root', 'Root', [
      makeTopic('a', 'A'),
      makeTopic('b', 'B'),
      makeTopic('c', 'C')
    ])
    const balanced = layoutSheet(makeSheet(undefined, root))
    expect(balanced.nodes.get('a')?.side).toBe('right')
    expect(balanced.nodes.get('b')?.side).toBe('left')

    const sheet = makeSheet(undefined, root)
    setSettings(sheet, { autoBalance: false })
    const result = layoutSheet(sheet)
    const rootNode = result.nodes.get('root')!
    for (const id of ['a', 'b', 'c']) {
      const node = result.nodes.get(id)!
      expect(node.side).toBe('right')
      expect(node.x).toBeGreaterThanOrEqual(rootNode.x + rootNode.width)
    }
  })

  it('compactLayout shrinks level and sibling gaps', () => {
    const root = makeTopic('root', 'Root', [
      makeTopic('a', 'A', [makeTopic('a1', 'A1')]),
      makeTopic('b', 'B'),
      makeTopic('c', 'C')
    ])
    const sheet = makeSheet('org.xmind.ui.logic.right', root)
    const normal = layoutSheet(sheet)
    const normalLevelGap =
      normal.nodes.get('a')!.x - (normal.nodes.get('root')!.x + normal.nodes.get('root')!.width)
    const normalSiblingGap =
      normal.nodes.get('c')!.y - (normal.nodes.get('b')!.y + normal.nodes.get('b')!.height)

    setSettings(sheet, { compactLayout: true })
    const compact = layoutSheet(sheet)
    const compactLevelGap =
      compact.nodes.get('a')!.x - (compact.nodes.get('root')!.x + compact.nodes.get('root')!.width)
    const compactSiblingGap =
      compact.nodes.get('c')!.y - (compact.nodes.get('b')!.y + compact.nodes.get('b')!.height)

    expect(compactLevelGap).toBeLessThan(normalLevelGap)
    expect(compactSiblingGap).toBeLessThan(normalSiblingGap)
  })

  it('alignSiblings=false indents each branch from its own parent', () => {
    const root = makeTopic('root', 'Root', [
      makeTopic('a', 'A', [makeTopic('a1', 'A1')]),
      makeTopic('b', 'B', [makeTopic('b1', 'B1')], { customWidth: 260 })
    ])
    const sheet = makeSheet('org.xmind.ui.logic.right', root)
    const aligned = layoutSheet(sheet)
    expect(aligned.nodes.get('a1')!.x).toBe(aligned.nodes.get('b1')!.x)

    setSettings(sheet, { alignSiblings: false })
    const ragged = layoutSheet(sheet)
    expect(ragged.nodes.get('a1')!.x).toBeLessThan(ragged.nodes.get('b1')!.x)
  })

  it('flexibleFloating=false auto-arranges floating topics', () => {
    const root = makeTopic('root', 'Root', [makeTopic('a', 'A')])
    root.children!.detached = [
      makeTopic('float', 'Float', [], { position: { x: 240, y: 120 } })
    ]
    const sheet = makeSheet(undefined, root)
    const flexible = layoutSheet(sheet)
    const rootNode = flexible.nodes.get('root')!
    const centerX = rootNode.x + rootNode.width / 2
    const centerY = rootNode.y + rootNode.height / 2
    expect(flexible.nodes.get('float')!.x).toBeCloseTo(centerX + 240, 6)
    expect(flexible.nodes.get('float')!.y).toBeCloseTo(centerY + 120, 6)

    setSettings(sheet, { flexibleFloating: false })
    const auto = layoutSheet(sheet)
    expect(auto.nodes.get('float')!.x).toBeCloseTo(centerX + 200, 6)
    expect(auto.nodes.get('float')!.y).toBeCloseTo(centerY + 200, 6)
  })
})
