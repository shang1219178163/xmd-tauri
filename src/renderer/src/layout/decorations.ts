import type { LayoutDecoration, LayoutNode, StructureKey } from '@shared/types'
import { STRUCTURES } from '@shared/structures'
import type { MeasuredTopic } from './model'

const BRACE_GAP = 18
const FISHBONE_BONE_OFFSET = 12
const FISHBONE_SPINE_PAD = 24

/** Structure-level graphics that are not regular parent -> child edges. */
export function buildDecorations(
  root: MeasuredTopic,
  nodes: Map<string, LayoutNode>,
  structure: StructureKey
): LayoutDecoration[] {
  const definition = STRUCTURES[structure]
  if (!definition) return []
  if (definition.family === 'fishbone') return fishboneDecorations(root, nodes, structure)
  if (definition.family === 'brace') return braceDecorations(root, nodes)
  return []
}

function fishboneDecorations(
  root: MeasuredTopic,
  nodes: Map<string, LayoutNode>,
  structure: StructureKey
): LayoutDecoration[] {
  const rootNode = nodes.get(root.id)
  if (!rootNode || root.children.length === 0) return []

  const headRight = structure === 'fishboneRight'
  const spineY = rootNode.y + rootNode.height / 2
  const joints: number[] = []
  for (const child of root.children) {
    const node = nodes.get(child.id)
    if (!node) continue
    joints.push(
      headRight
        ? node.x + node.width + FISHBONE_BONE_OFFSET
        : node.x - FISHBONE_BONE_OFFSET
    )
  }
  if (!joints.length) return []

  const headX = headRight ? rootNode.x + rootNode.width : rootNode.x
  const farJoint = headRight ? Math.min(...joints) : Math.max(...joints)
  const farX = farJoint + (headRight ? -FISHBONE_SPINE_PAD : FISHBONE_SPINE_PAD)

  return [
    {
      id: `decoration:spine:${root.id}`,
      kind: 'line',
      points: [
        { x: headX, y: spineY },
        { x: farX, y: spineY }
      ],
      ...(root.lineColor ? { color: root.lineColor } : {}),
      width: Math.max(root.lineWidth, 2)
    }
  ]
}

function braceDecorations(
  root: MeasuredTopic,
  nodes: Map<string, LayoutNode>
): LayoutDecoration[] {
  const decorations: LayoutDecoration[] = []

  const visit = (topic: MeasuredTopic): void => {
    const parentNode = nodes.get(topic.id)
    const childNodes = topic.children
      .map((child) => nodes.get(child.id))
      .filter((node): node is LayoutNode => Boolean(node))

    if (parentNode && childNodes.length) {
      const sorted = [...childNodes].sort((a, b) => a.y - b.y)
      const first = sorted[0]
      const last = sorted[sorted.length - 1]
      let top = first.y + first.height / 2
      let bottom = last.y + last.height / 2
      if (bottom - top < 20) {
        const middle = (top + bottom) / 2
        top = middle - 10
        bottom = middle + 10
      }
      const braceX = Math.min(...sorted.map((node) => node.x)) - BRACE_GAP
      const cuspY = (top + bottom) / 2
      const color = topic.lineColor
      const width = Math.max(topic.lineWidth, 1.5)

      decorations.push({
        id: `decoration:lead:${topic.id}`,
        kind: 'line',
        points: [
          { x: parentNode.x + parentNode.width, y: parentNode.y + parentNode.height / 2 },
          { x: braceX, y: cuspY }
        ],
        ...(color ? { color } : {}),
        width
      })
      decorations.push({
        id: `decoration:brace:${topic.id}`,
        kind: 'brace',
        points: [
          { x: braceX, y: top },
          { x: braceX, y: bottom }
        ],
        ...(color ? { color } : {}),
        width
      })
    }

    for (const child of topic.children) visit(child)
    for (const child of topic.detached) visit(child)
  }

  visit(root)
  return decorations
}
