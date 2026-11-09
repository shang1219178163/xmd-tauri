import type { StructureKey } from './types'

export type StructureDirection = 'balanced' | 'right' | 'left' | 'down' | 'up' | 'horizontal' | 'vertical' | 'free'

export interface StructureDef {
  key: StructureKey
  classId: string
  label: { zh: string; en: string }
  direction: StructureDirection
  /** Layout family the renderer dispatches to. */
  family: 'map' | 'logic' | 'org' | 'tree' | 'timeline' | 'fishbone' | 'matrix' | 'treetable' | 'brace' | 'spreadsheet'
}

export const STRUCTURES: Record<StructureKey, StructureDef> = {
  map: {
    key: 'map',
    classId: 'org.xmind.ui.map.clockwise',
    label: { zh: '思维导图', en: 'Mind Map' },
    direction: 'balanced',
    family: 'map'
  },
  mapUnbalanced: {
    key: 'mapUnbalanced',
    classId: 'org.xmind.ui.map.unbalanced',
    label: { zh: '不平衡思维导图', en: 'Unbalanced Map' },
    direction: 'balanced',
    family: 'map'
  },
  logicRight: {
    key: 'logicRight',
    classId: 'org.xmind.ui.logic.right',
    label: { zh: '逻辑图（右）', en: 'Logic Chart (Right)' },
    direction: 'right',
    family: 'logic'
  },
  logicLeft: {
    key: 'logicLeft',
    classId: 'org.xmind.ui.logic.left',
    label: { zh: '逻辑图（左）', en: 'Logic Chart (Left)' },
    direction: 'left',
    family: 'logic'
  },
  orgDown: {
    key: 'orgDown',
    classId: 'org.xmind.ui.org-chart.down',
    label: { zh: '组织架构图（下）', en: 'Org Chart (Down)' },
    direction: 'down',
    family: 'org'
  },
  orgUp: {
    key: 'orgUp',
    classId: 'org.xmind.ui.org-chart.up',
    label: { zh: '组织架构图（上）', en: 'Org Chart (Up)' },
    direction: 'up',
    family: 'org'
  },
  treeRight: {
    key: 'treeRight',
    classId: 'org.xmind.ui.tree.right',
    label: { zh: '树形图（右）', en: 'Tree Chart (Right)' },
    direction: 'right',
    family: 'tree'
  },
  treeLeft: {
    key: 'treeLeft',
    classId: 'org.xmind.ui.tree.left',
    label: { zh: '树形图（左）', en: 'Tree Chart (Left)' },
    direction: 'left',
    family: 'tree'
  },
  timelineHorizontal: {
    key: 'timelineHorizontal',
    classId: 'org.xmind.ui.timeline.horizontal',
    label: { zh: '时间轴（水平）', en: 'Timeline (Horizontal)' },
    direction: 'horizontal',
    family: 'timeline'
  },
  timelineVertical: {
    key: 'timelineVertical',
    classId: 'org.xmind.ui.timeline.vertical',
    label: { zh: '时间轴（垂直）', en: 'Timeline (Vertical)' },
    direction: 'vertical',
    family: 'timeline'
  },
  fishboneLeft: {
    key: 'fishboneLeft',
    classId: 'org.xmind.ui.fishbone.leftHeaded',
    label: { zh: '鱼骨图（左）', en: 'Fishbone (Left)' },
    direction: 'horizontal',
    family: 'fishbone'
  },
  fishboneRight: {
    key: 'fishboneRight',
    classId: 'org.xmind.ui.fishbone.rightHeaded',
    label: { zh: '鱼骨图（右）', en: 'Fishbone (Right)' },
    direction: 'horizontal',
    family: 'fishbone'
  },
  matrix: {
    key: 'matrix',
    classId: 'org.xmind.ui.matrix',
    label: { zh: '矩阵图', en: 'Matrix' },
    direction: 'free',
    family: 'matrix'
  },
  treetable: {
    key: 'treetable',
    classId: 'org.xmind.ui.treetable',
    label: { zh: '树形表格', en: 'Tree Table' },
    direction: 'free',
    family: 'treetable'
  },
  braceRight: {
    key: 'braceRight',
    classId: 'org.xmind.ui.brace.right',
    label: { zh: '括号图（右）', en: 'Brace Map (Right)' },
    direction: 'right',
    family: 'brace'
  },
  spreadsheet: {
    key: 'spreadsheet',
    classId: 'org.xmind.ui.spreadsheet',
    label: { zh: '电子表格', en: 'Spreadsheet' },
    direction: 'free',
    family: 'spreadsheet'
  }
}

const BY_CLASS = new Map<string, StructureKey>(
  Object.values(STRUCTURES).map((s) => [s.classId, s.key])
)

export function structureKeyOf(topicStructureClass: string | undefined): StructureKey {
  if (!topicStructureClass) return 'map'
  return BY_CLASS.get(topicStructureClass) ?? 'map'
}

export function structureClassOf(key: StructureKey): string {
  return STRUCTURES[key]?.classId ?? STRUCTURES.map.classId
}

export const STRUCTURE_LIST: StructureDef[] = Object.values(STRUCTURES)
