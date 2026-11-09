import { describe, expect, it } from 'vitest'
import type { LayoutNode } from '@shared/types'
import { buildEdges, edgeAnchors } from './edges'
import type { MeasuredTopic } from './model'

const node = (
  id: string,
  x: number,
  y: number,
  width = 100,
  height = 40
): LayoutNode => ({
  id,
  topic: { id, title: id },
  depth: 0,
  side: 'center',
  x,
  y,
  width,
  height,
  collapsed: false,
  hasChildren: false
})

describe('edgeAnchors', () => {
  it('uses parent right and child left for logicRight even when the child is above', () => {
    expect(edgeAnchors(node('p', 0, 0, 180, 60), node('c', 240, -70, 150, 40), 'logicRight')).toEqual({
      start: { x: 180, y: 30 },
      end: { x: 240, y: -50 },
      direction: 'right',
      orientation: 'horizontal'
    })
  })

  it('uses parent left and child right for logicLeft', () => {
    expect(edgeAnchors(node('p', 300, 0, 180, 60), node('c', 0, 20, 150, 40), 'logicLeft')).toEqual({
      start: { x: 300, y: 30 },
      end: { x: 150, y: 40 },
      direction: 'left',
      orientation: 'horizontal'
    })
  })

  it('follows the child side for a balanced map', () => {
    expect(edgeAnchors(node('p', 0, 0, 180, 60), node('r', 240, 0, 150, 40), 'map')).toEqual({
      start: { x: 180, y: 30 },
      end: { x: 240, y: 20 },
      direction: 'right',
      orientation: 'horizontal'
    })
    expect(edgeAnchors(node('p', 0, 0, 180, 60), node('l', -240, 0, 150, 40), 'map')).toEqual({
      start: { x: 0, y: 30 },
      end: { x: -90, y: 20 },
      direction: 'left',
      orientation: 'horizontal'
    })
  })

  it('uses parent bottom and child top for orgDown', () => {
    expect(edgeAnchors(node('p', 0, 0, 180, 60), node('c', 20, 160, 150, 40), 'orgDown')).toEqual({
      start: { x: 90, y: 60 },
      end: { x: 95, y: 160 },
      direction: 'down',
      orientation: 'vertical'
    })
  })

  it('uses parent top and child bottom for orgUp', () => {
    expect(edgeAnchors(node('p', 0, 200, 180, 60), node('c', 20, 0, 150, 40), 'orgUp')).toEqual({
      start: { x: 90, y: 200 },
      end: { x: 95, y: 40 },
      direction: 'up',
      orientation: 'vertical'
    })
  })

  it('keeps the nearest-side fallback for brace charts', () => {
    const anchors = edgeAnchors(node('p', 0, 0, 100, 40), node('c', 200, 0, 100, 40), 'braceRight')
    expect(anchors.start).toEqual({ x: 100, y: 20 })
    expect(anchors.end).toEqual({ x: 200, y: 20 })
    expect(anchors.direction).toBeUndefined()
    expect(anchors.orientation).toBe('horizontal')
  })

  it('keeps the fallback orientation when the nearest side is vertical', () => {
    const anchors = edgeAnchors(node('p', 0, 0, 100, 40), node('c', 0, 200, 100, 40), 'braceRight')
    expect(anchors.start).toEqual({ x: 50, y: 40 })
    expect(anchors.end).toEqual({ x: 50, y: 200 })
    expect(anchors.direction).toBeUndefined()
    expect(anchors.orientation).toBe('vertical')
  })

  it('uses the axis for timeline root children and the perpendicular for deeper nodes', () => {
    const rootToChild = edgeAnchors(
      node('p', 0, 0, 100, 40),
      node('c', 180, -80, 100, 40),
      'timelineHorizontal'
    )
    expect(rootToChild.direction).toBe('right')
    expect(rootToChild.orientation).toBe('horizontal')
    expect(rootToChild.start).toEqual({ x: 100, y: 20 })
    expect(rootToChild.end).toEqual({ x: 180, y: -60 })

    const deep = { ...node('p', 0, 0, 100, 40), depth: 1 }
    const deepChild = { ...node('c', 20, -120, 100, 40), depth: 2 }
    const deepAnchors = edgeAnchors(deep, deepChild, 'timelineHorizontal')
    expect(deepAnchors.direction).toBe('up')
    expect(deepAnchors.orientation).toBe('vertical')
    expect(deepAnchors.start).toEqual({ x: 50, y: 0 })
    expect(deepAnchors.end).toEqual({ x: 70, y: -80 })
  })

  it('reverses the axis rule for a vertical timeline', () => {
    const rootToChild = edgeAnchors(
      node('p', 0, 0, 100, 40),
      node('c', 180, 80, 100, 40),
      'timelineVertical'
    )
    expect(rootToChild.direction).toBe('down')
    expect(rootToChild.orientation).toBe('vertical')
    expect(rootToChild.start).toEqual({ x: 50, y: 40 })

    const deep = { ...node('p', 0, 0, 100, 40), depth: 1 }
    const deepChild = { ...node('c', 180, 20, 100, 40), depth: 2 }
    const deepAnchors = edgeAnchors(deep, deepChild, 'timelineVertical')
    expect(deepAnchors.direction).toBe('right')
    expect(deepAnchors.orientation).toBe('horizontal')
    expect(deepAnchors.start).toEqual({ x: 100, y: 20 })
  })

  it('uses horizontal anchors for floating subtrees regardless of family', () => {
    const anchors = edgeAnchors(
      node('p', 0, 0, 100, 40),
      node('c', 200, -60, 100, 40),
      'orgDown',
      { floating: true }
    )
    expect(anchors).toEqual({
      start: { x: 100, y: 20 },
      end: { x: 200, y: -40 },
      direction: 'right',
      orientation: 'horizontal'
    })
  })

  it('keeps floating fallback families directional-free', () => {
    const anchors = edgeAnchors(
      node('p', 0, 0, 100, 40),
      node('c', 200, 0, 100, 40),
      'braceRight',
      { floating: true }
    )
    expect(anchors.direction).toBeUndefined()
    expect(anchors.orientation).toBe('horizontal')
    expect(anchors.start).toEqual({ x: 100, y: 20 })
    expect(anchors.end).toEqual({ x: 200, y: 20 })
  })

  it('uses horizontal anchors for deep floating descendants', () => {
    const parent = { ...node('p', 0, 0, 100, 40), depth: 2 }
    const child = { ...node('c', -200, -60, 100, 40), depth: 3 }
    const anchors = edgeAnchors(parent, child, 'orgDown', { floating: true })
    expect(anchors).toEqual({
      start: { x: 0, y: 20 },
      end: { x: -100, y: -40 },
      direction: 'left',
      orientation: 'horizontal'
    })
  })

  it('uses right-to-left anchors for tree tables', () => {
    const anchors = edgeAnchors(node('p', 0, 0, 100, 40), node('c', 300, 100, 100, 40), 'treetable')
    expect(anchors.start).toEqual({ x: 100, y: 20 })
    expect(anchors.end).toEqual({ x: 300, y: 120 })
    expect(anchors.orientation).toBe('horizontal')
  })

  it('uses bottom-to-top anchors for deep spreadsheet rows', () => {
    const parent = { ...node('p', 100, 0, 100, 40), depth: 1 }
    const child = { ...node('c', 100, 200, 100, 40), depth: 2 }
    const anchors = edgeAnchors(parent, child, 'spreadsheet')
    expect(anchors.start).toEqual({ x: 150, y: 40 })
    expect(anchors.end).toEqual({ x: 150, y: 200 })
    expect(anchors.orientation).toBe('vertical')
  })

  it('starts fishbone root branches at a joint on the spine', () => {
    const root = node('p', 0, 0, 100, 40)
    const above = node('t', 200, -100, 80, 40)
    const anchors = edgeAnchors(root, above, 'fishboneLeft')
    expect(anchors.start).toEqual({ x: 188, y: 20 })
    expect(anchors.end).toEqual({ x: 240, y: -60 })
    expect(anchors.orientation).toBe('horizontal')

    const below = node('b', 200, 100, 80, 40)
    const belowAnchors = edgeAnchors(root, below, 'fishboneRight')
    expect(belowAnchors.start).toEqual({ x: 292, y: 20 })
    expect(belowAnchors.end).toEqual({ x: 240, y: 100 })
  })

  it('uses horizontal anchors for fishbone sub-branches', () => {
    const parent = { ...node('p', 300, 0, 100, 40), depth: 1 }
    const child = node('c', 100, 10, 80, 40)
    const anchors = edgeAnchors(parent, child, 'fishboneLeft')
    expect(anchors.start).toEqual({ x: 300, y: 20 })
    expect(anchors.end).toEqual({ x: 180, y: 30 })
    expect(anchors.orientation).toBe('horizontal')
  })

  it('prefers the smallest gap over center offset for diagonal fallback nodes', () => {
    const anchors = edgeAnchors(
      node('p', 0, 0, 100, 40),
      node('c', 300, 100, 100, 40),
      'braceRight'
    )
    expect(anchors.start).toEqual({ x: 50, y: 40 })
    expect(anchors.end).toEqual({ x: 350, y: 100 })
    expect(anchors.direction).toBeUndefined()
    expect(anchors.orientation).toBe('vertical')
  })
})

function measured(
  id: string,
  width: number,
  height: number,
  children: MeasuredTopic[] = []
): MeasuredTopic {
  return {
    topic: { id, title: id },
    id,
    depth: 0,
    width,
    height,
    isRoot: true,
    isFloating: false,
    collapsed: false,
    hasChildren: children.length > 0,
    lineWidth: 2,
    dashed: false,
    children,
    detached: [],
    stackHeight: height,
    stackWidth: width
  }
}

function nodeOf(id: string, x: number, y: number, width: number, height: number): LayoutNode {
  return node(id, x, y, width, height)
}

function oneChild(lineClass?: string, childY = -40): LayoutEdgeSet {
  const child = measured('c', 100, 40)
  if (lineClass) child.lineClass = lineClass
  const root = measured('root', 100, 40, [child])
  const nodes = new Map<string, LayoutNode>([
    ['root', nodeOf('root', 0, 0, 100, 40)],
    ['c', nodeOf('c', 200, childY, 100, 40)]
  ])
  return { root, nodes }
}

interface LayoutEdgeSet {
  root: MeasuredTopic
  nodes: Map<string, LayoutNode>
}

describe('buildEdges geometry', () => {
  it('builds the Xmind quadratic control point for horizontal curves', () => {
    const { root, nodes } = oneChild()
    const [edge] = buildEdges(root, [], nodes, 'logicRight')
    expect(edge.kind).toBe('curve')
    expect(edge.orientation).toBe('horizontal')
    expect(edge.points).toEqual([
      { x: 100, y: 20 },
      { x: 113, y: 20 },
      { x: 113 + 87 / 5, y: -20 },
      { x: 200, y: -20 }
    ])
  })

  it('builds vertical curve control points for org charts', () => {
    const child = measured('c', 100, 40)
    const root = measured('root', 100, 40, [child])
    const nodes = new Map<string, LayoutNode>([
      ['root', nodeOf('root', 0, 0, 100, 40)],
      ['c', nodeOf('c', 20, 160, 100, 40)]
    ])
    const [edge] = buildEdges(root, [], nodes, 'orgDown')
    expect(edge.kind).toBe('curve')
    expect(edge.orientation).toBe('vertical')
    expect(edge.points).toEqual([
      { x: 50, y: 40 },
      { x: 50, y: 53 },
      { x: 70, y: 53 },
      { x: 70, y: 160 }
    ])
  })

  it('honors a bight line class on a first-level branch', () => {
    const { root, nodes } = oneChild('org.xmind.branchConnection.bight')
    const [edge] = buildEdges(root, [], nodes, 'logicRight')
    expect(edge.kind).toBe('bight')
    expect(edge.points).toEqual([
      { x: 100, y: 20 },
      { x: 113, y: 20 },
      { x: 200 - 87 / 4, y: 20 },
      { x: (113 + 200) / 2, y: -20 },
      { x: 200, y: -20 }
    ])
  })

  it('builds fold and roundedFold bends', () => {
    const fold = oneChild('org.xmind.branchConnection.fold')
    const [foldEdge] = buildEdges(fold.root, [], fold.nodes, 'logicRight')
    expect(foldEdge.kind).toBe('fold')
    expect(foldEdge.points).toEqual([
      { x: 100, y: 20 },
      { x: 113, y: 20 },
      { x: 113 + 87 * (2 / 3), y: -20 },
      { x: 200, y: -20 }
    ])

    const rounded = oneChild('org.xmind.branchConnection.roundedfold')
    const [roundedEdge] = buildEdges(rounded.root, [], rounded.nodes, 'logicRight')
    expect(roundedEdge.kind).toBe('roundedFold')
    expect(roundedEdge.points).toEqual([
      { x: 100, y: 20 },
      { x: 113, y: 20 },
      { x: 113 + 87 / 2, y: -20 },
      { x: 200, y: -20 }
    ])
  })

  it('builds elbow and roundedElbow corners at the split point', () => {
    const elbow = oneChild(undefined, -60)
    const [elbowEdge] = buildEdges(elbow.root, [], elbow.nodes, 'treeRight')
    expect(elbowEdge.kind).toBe('elbow')
    expect(elbowEdge.points).toEqual([
      { x: 100, y: 20 },
      { x: 113, y: 20 },
      { x: 113, y: -40 },
      { x: 200, y: -40 }
    ])

    const rounded = oneChild('org.xmind.branchConnection.roundedElbow', -60)
    const [roundedEdge] = buildEdges(rounded.root, [], rounded.nodes, 'logicRight')
    expect(roundedEdge.kind).toBe('roundedElbow')
    expect(roundedEdge.points).toEqual([
      { x: 100, y: 20 },
      { x: 113, y: 20 },
      { x: 113, y: -40 },
      { x: 200, y: -40 }
    ])
  })

  it('builds brace and tapered endpoints without a split stem', () => {
    const brace = oneChild('org.xmind.branchConnection.brace')
    const [braceEdge] = buildEdges(brace.root, [], brace.nodes, 'logicRight')
    expect(braceEdge.kind).toBe('brace')
    expect(braceEdge.points).toEqual([
      { x: 100, y: 20 },
      { x: 200, y: -20 }
    ])

    const tapered = oneChild('org.xmind.branchConnection.tapered')
    const [taperedEdge] = buildEdges(tapered.root, [], tapered.nodes, 'logicRight')
    expect(taperedEdge.kind).toBe('tapered')
    expect(taperedEdge.points).toEqual([
      { x: 100, y: 20 },
      { x: 200, y: -20 }
    ])
  })
})

describe('buildEdges edge paint', () => {
  it('uses parent explicit line colour and width for outgoing branches', () => {
    const { root, nodes } = oneChild()
    root.topic.style = { properties: { 'line-color': '#123456', 'line-width': '3pt' } }
    const [edge] = buildEdges(root, [], nodes, 'logicRight')
    expect(edge.color).toBe('#123456')
    expect(edge.width).toBeCloseTo(4)
  })

  it('lets child explicit line style override the parent', () => {
    const { root, nodes } = oneChild()
    const childId = 'c'
    const child = findMeasured(root, childId)!
    child.topic.style = { properties: { 'line-color': '#00ff00', 'line-width': '1pt' } }
    child.lineWidth = 4 / 3
    root.topic.style = { properties: { 'line-color': '#123456', 'line-width': '3pt' } }
    const [edge] = buildEdges(root, [], nodes, 'logicRight')
    expect(edge.color).toBe('#00ff00')
    expect(edge.width).toBeCloseTo(4 / 3)
  })

  it('uses rainbow palette colours for top-level branches', () => {
    const c1 = measured('c1', 100, 40)
    const c2 = measured('c2', 100, 40)
    const c3 = measured('c3', 100, 40)
    const root = measured('root', 100, 40, [c1, c2, c3])
    const nodes = new Map<string, LayoutNode>([
      ['root', nodeOf('root', 0, 0, 100, 40)],
      ['c1', nodeOf('c1', 200, -60, 100, 40)],
      ['c2', nodeOf('c2', 200, 0, 100, 40)],
      ['c3', nodeOf('c3', 200, 60, 100, 40)]
    ])
    const edges = buildEdges(root, [], nodes, 'logicRight', {
      rainbow: true,
      palette: ['#aa0000', '#00bb00']
    })
    expect(edges.map((edge) => edge.color)).toEqual(['#aa0000', '#00bb00', '#aa0000'])
  })
})

function findMeasured(topic: MeasuredTopic, id: string): MeasuredTopic | undefined {
  if (topic.id === id) return topic
  for (const child of topic.children) {
    const found = findMeasured(child, id)
    if (found) return found
  }
  return undefined
}

describe('buildEdges split stems', () => {
  it('gives the split point to every child and the stem only to the last one', () => {
    const c1 = measured('c1', 100, 40)
    const c2 = measured('c2', 100, 40)
    const c3 = measured('c3', 100, 40)
    const root = measured('root', 100, 40, [c1, c2, c3])
    const nodes = new Map<string, LayoutNode>([
      ['root', nodeOf('root', 0, 0, 100, 40)],
      ['c1', nodeOf('c1', 200, -60, 100, 40)],
      ['c2', nodeOf('c2', 200, 0, 100, 40)],
      ['c3', nodeOf('c3', 200, 60, 100, 40)]
    ])

    const edges = buildEdges(root, [], nodes, 'logicRight')
    expect(edges).toHaveLength(3)
    expect(edges[0].points[0]).toEqual({ x: 113, y: 20 })
    expect(edges[1].points[0]).toEqual({ x: 113, y: 20 })
    expect(edges[2].points[0]).toEqual({ x: 100, y: 20 })
    expect(edges[2].points[1]).toEqual({ x: 113, y: 20 })
    expect(edges.every((edge) => edge.orientation === 'horizontal')).toBe(true)
  })

  it('draws a stem for a single child', () => {
    const child = measured('c', 100, 40)
    const root = measured('root', 100, 40, [child])
    const nodes = new Map<string, LayoutNode>([
      ['root', nodeOf('root', 0, 0, 100, 40)],
      ['c', nodeOf('c', 200, 20, 100, 40)]
    ])
    const edges = buildEdges(root, [], nodes, 'logicRight')
    expect(edges[0].points[0]).toEqual({ x: 100, y: 20 })
    expect(edges[0].points[1]).toEqual({ x: 113, y: 20 })
  })

  it('uses horizontal anchors and split stems for deep floating descendants', () => {
    const f2 = measured('f2', 100, 40)
    const f1 = measured('f1', 100, 40, [f2])
    const float = measured('float', 100, 40, [f1])
    const root = measured('root', 100, 40)
    const nodes = new Map<string, LayoutNode>([
      ['root', nodeOf('root', 0, 0, 100, 40)],
      ['float', nodeOf('float', 200, 100, 100, 40)],
      ['f1', nodeOf('f1', 400, 100, 100, 40)],
      ['f2', nodeOf('f2', 600, 100, 100, 40)]
    ])

    const edges = buildEdges(root, [float], nodes, 'orgDown')
    expect(edges).toHaveLength(2)
    expect(edges[0].orientation).toBe('horizontal')
    expect(edges[0].points[0]).toEqual({ x: 300, y: 120 })
    expect(edges[0].points[1]).toEqual({ x: 313, y: 120 })
    expect(edges[0].points[3]).toEqual({ x: 400, y: 120 })
    expect(edges[1].points[0]).toEqual({ x: 500, y: 120 })
    expect(edges[1].points[1]).toEqual({ x: 513, y: 120 })
    expect(edges[1].points[3]).toEqual({ x: 600, y: 120 })
  })

  it('lets brace edges start at the parent anchor without sharing a stem', () => {
    const c1 = measured('c1', 100, 40)
    c1.lineClass = 'org.xmind.branchConnection.brace'
    const c2 = measured('c2', 100, 40)
    c2.lineClass = 'org.xmind.branchConnection.brace'
    const root = measured('root', 100, 40, [c1, c2])
    const nodes = new Map<string, LayoutNode>([
      ['root', nodeOf('root', 0, 0, 100, 40)],
      ['c1', nodeOf('c1', 200, -60, 100, 40)],
      ['c2', nodeOf('c2', 200, 60, 100, 40)]
    ])
    const edges = buildEdges(root, [], nodes, 'logicRight')
    for (const edge of edges) {
      expect(edge.kind).toBe('brace')
      expect(edge.points).toHaveLength(2)
      expect(edge.points[0]).toEqual({ x: 100, y: 20 })
    }
  })
})

describe('buildEdges resolved kinds', () => {
  it('uses the parent explicit line style as the final kind', () => {
    const child = measured('c', 100, 40)
    const root = measured('root', 100, 40, [child])
    root.topic.style = {
      properties: { 'line-class': 'org.xmind.branchConnection.straight' }
    }
    root.lineClass = 'org.xmind.branchConnection.straight'
    const nodes = new Map<string, LayoutNode>([
      ['root', nodeOf('root', 0, 0, 100, 40)],
      ['c', nodeOf('c', 200, -60, 100, 40)]
    ])
    const edges = buildEdges(root, [], nodes, 'logicRight')
    expect(edges[0].kind).toBe('straight')
    expect(edges[0].orientation).toBe('horizontal')
    expect(edges[0].points).toEqual([
      { x: 100, y: 20 },
      { x: 113, y: 20 },
      { x: 200, y: -40 }
    ])
  })

  it('builds directional elbow points for tree charts', () => {
    const child = measured('c', 100, 40)
    const root = measured('root', 100, 40, [child])
    const nodes = new Map<string, LayoutNode>([
      ['root', nodeOf('root', 0, 0, 100, 40)],
      ['c', nodeOf('c', 200, -60, 100, 40)]
    ])
    const edges = buildEdges(root, [], nodes, 'treeRight')
    expect(edges[0].kind).toBe('elbow')
    expect(edges[0].points).toEqual([
      { x: 100, y: 20 },
      { x: 113, y: 20 },
      { x: 113, y: -40 },
      { x: 200, y: -40 }
    ])
  })

  it('gives each map side its own split point', () => {
    const right = measured('right', 100, 40)
    const left = measured('left', 100, 40)
    const root = measured('root', 100, 40, [right, left])
    const nodes = new Map<string, LayoutNode>([
      ['root', nodeOf('root', 0, 0, 100, 40)],
      ['right', nodeOf('right', 200, 0, 100, 40)],
      ['left', nodeOf('left', -200, 0, 100, 40)]
    ])
    const edges = buildEdges(root, [], nodes, 'map')
    expect(edges[0].points[0]).toEqual({ x: 100, y: 20 })
    expect(edges[0].points[1]).toEqual({ x: 113, y: 20 })
    expect(edges[1].points[0]).toEqual({ x: 0, y: 20 })
    expect(edges[1].points[1]).toEqual({ x: -13, y: 20 })
    expect(edges.every((edge) => edge.orientation === 'horizontal')).toBe(true)
  })

  it('keeps fallback structures at split = start', () => {
    const child = measured('c', 100, 40)
    const root = measured('root', 100, 40, [child])
    const nodes = new Map<string, LayoutNode>([
      ['root', nodeOf('root', 0, 0, 100, 40)],
      ['c', nodeOf('c', 300, 100, 100, 40)]
    ])
    const [edge] = buildEdges(root, [], nodes, 'braceRight')
    expect(edge.kind).toBe('elbow')
    expect(edge.orientation).toBe('vertical')
    expect(edge.points[0]).toEqual({ x: 50, y: 40 })
    expect(edge.points[1]).toEqual({ x: 50, y: 40 })
    expect(edge.points[2]).toEqual({ x: 350, y: 40 })
    expect(edge.points[3]).toEqual({ x: 350, y: 100 })
  })
})
