import type { Sheet, Theme, ThemePart, Topic, Workbook } from './types'

let seed = 0
export function newId(prefix = 'id'): string {
  seed += 1
  return `${prefix}-${Date.now().toString(36)}-${seed.toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const FONT = 'Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
const HAND_FONT = 'Bradley Hand, "STHeiti", "Songti SC", "PingFang SC", "Microsoft YaHei", sans-serif'

export const RAINBOW_COLORS = ['#E85D4A', '#E8A23A', '#E8C93A', '#5BAE6E', '#4A90D9', '#8E6CC9', '#D96BA0', '#3FA8A0']
export const RAINBOW_PASTEL = ['#F28B82', '#F6BF6B', '#F2D96B', '#8FD19E', '#7FB3E6', '#B39DDB', '#E6A5C9', '#7FC8C2']
export const RAINBOW_WARM = ['#E85D4A', '#E8864A', '#E8A23A', '#E8C93A', '#D9A85A', '#C97B4A', '#B85D4A', '#E8B86A']
export const RAINBOW_COOL = ['#4A90D9', '#5BAE6E', '#3FA8A0', '#5B8FD9', '#6C7FD9', '#8E6CC9', '#4AA8C8', '#5BC8A8']

export function rainbowPalette(name: unknown): string[] {
  if (name === 'pastel') return RAINBOW_PASTEL
  if (name === 'warm') return RAINBOW_WARM
  if (name === 'cool') return RAINBOW_COOL
  return RAINBOW_COLORS
}

export function part(properties: Record<string, string | number | boolean>): ThemePart {
  return { id: newId('style'), properties }
}

export const DEFAULT_THEME: Theme = {
  id: 'theme-rainbow',
  centralTopic: part({
    'svg:fill': '#1B2647',
    'fo:color': '#FFFFFF',
    'fo:font-family': HAND_FONT,
    'fo:font-size': '26pt',
    'fo:font-weight': 700,
    'border-line-color': '#2F6FED',
    'border-line-width': '2pt',
    'shape-class': 'org.xmind.topicShape.roundedRect',
    'hand-drawn': true
  }),
  mainTopic: part({
    'svg:fill': '#E85D4A',
    'fo:color': '#FFFFFF',
    'fo:font-family': HAND_FONT,
    'fo:font-size': '18pt',
    'fo:font-weight': 700,
    'border-line-width': '0pt',
    'shape-class': 'org.xmind.topicShape.roundedRect',
    'line-color': '#E85D4A',
    'line-width': '2pt',
    'line-class': 'org.xmind.branchConnection.curve',
    'hand-drawn': true
  }),
  subTopic: part({
    'svg:fill': '#FFFFFF',
    'fo:color': '#4B5563',
    'fo:font-family': HAND_FONT,
    'fo:font-size': '13pt',
    'fo:font-weight': 600,
    'border-line-color': '#D8DEE9',
    'border-line-width': '1.5pt',
    'shape-class': 'org.xmind.topicShape.roundedRect',
    'line-color': '#93A4B8',
    'line-width': '2pt',
    'line-class': 'org.xmind.branchConnection.curve',
    'hand-drawn': true
  }),
  floatingTopic: part({
    'svg:fill': '#FFF3C4',
    'fo:color': '#7A5B00',
    'fo:font-family': HAND_FONT,
    'fo:font-size': '13pt',
    'border-line-color': '#E8C93A',
    'border-line-width': '1.5pt',
    'shape-class': 'org.xmind.topicShape.roundedRect',
    'hand-drawn': true
  }),
  summaryTopic: part({
    'svg:fill': '#F5F3FF',
    'fo:color': '#5B21B6',
    'fo:font-family': HAND_FONT,
    'fo:font-size': '11pt',
    'border-line-color': '#C4B5FD',
    'shape-class': 'org.xmind.topicShape.roundedRect'
  }),
  calloutTopic: part({
    'svg:fill': '#ECFEFF',
    'fo:color': '#155E75',
    'fo:font-family': HAND_FONT,
    'fo:font-size': '11pt',
    'shape-class': 'org.xmind.topicShape.roundedRect'
  }),
  importantTopic: part({ 'svg:fill': '#FEE2E2', 'fo:color': '#991B1B' }),
  minorTopic: part({ 'svg:fill': '#F1F5F9', 'fo:color': '#475569' }),
  boundary: part({ 'border-line-color': '#2F6FED66', 'border-line-width': '1pt', 'svg:fill': '#2F6FED14' }),
  summary: part({ 'border-line-color': '#8B5CF6', 'line-color': '#8B5CF6' }),
  relationship: part({ 'line-color': '#E8A23A', 'line-width': '2pt', 'line-class': 'org.xmind.relationship.curve' }),
  map: part({ 'svg:fill': '#FFFFFF' }),
  colorThemeId: 'rainbow',
  skeletonThemeId: 'rainbow',
  rainbow: true
}

export function createTopic(title: string, id?: string): Topic {
  return {
    id: id ?? newId('topic'),
    class: 'topic',
    title,
    titleUnedited: true,
    children: { attached: [], detached: [] }
  }
}

export function createSheet(title = 'Map 1', rootTitle = '中心主题', theme: Theme = DEFAULT_THEME): Sheet {
  return {
    id: newId('sheet'),
    class: 'sheet',
    title,
    rootTopic: {
      ...createTopic(rootTitle),
      structureClass: 'org.xmind.ui.logic.right',
      children: { attached: [], detached: [] }
    },
    theme: structuredClone(theme),
    topicPositioning: 'fixed',
    coreVersion: 'xmd-1.0',
    extensions: [],
    settings: {
      rainbow: (theme as { rainbow?: boolean }).rainbow ?? false,
      rainbowPalette: 'vivid',
      autoBalance: true,
      compactLayout: false,
      alignSiblings: true,
      freeBranch: false,
      flexibleFloating: true,
      topicOverlap: false,
      branchWidth: 'default',
      globalFont: 'default',
      cjkFont: 'default'
    }
  }
}

export function createEmptyWorkbook(): Workbook {
  const sheet = createSheet()
  return { sheets: [sheet], activeSheetId: sheet.id }
}

export function createStarterWorkbook(): Workbook {
  const root = createTopic('中心主题')
  root.structureClass = 'org.xmind.ui.logic.right'
  root.children = {
    attached: ['分支主题 1', '分支主题 2', '分支主题 3'].map((title) => createTopic(title)),
    detached: []
  }
  const sheet = createSheet('Map 1', '中心主题')
  sheet.rootTopic = root
  return { sheets: [sheet], activeSheetId: sheet.id }
}
