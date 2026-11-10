/** Shared document model used by the main process, preload bridge and renderer. */

export type StyleValue = string | number | boolean

export interface StyleProperties {
  [key: string]: StyleValue
}

export interface Style {
  id?: string
  properties: StyleProperties
}

export interface Marker {
  markerId: string
}

export interface Note {
  plain?: { content: string }
  html?: { content: string }
  realHTML?: { content: string }
}

export interface ImageRef {
  src: string
  width?: number
  height?: number
  alt?: string
}

export interface AttachmentRef {
  name: string
  path?: string
  data?: string
  mime?: string
}

export interface Extension {
  provider?: string
  content?: unknown
  [key: string]: unknown
}

export interface Boundary {
  id: string
  range?: string
  title?: string
  style?: Style
}

export interface Summary {
  id: string
  range?: string
  topicId?: string
  title?: string
  style?: Style
  children?: TopicChildren
}

export interface Relationship {
  id: string
  end1Id: string
  end2Id: string
  title?: string
  style?: Style
  /** 曲线两个控制点：沿弦比例 t 与法线偏移 o，可拖动调整。 */
  curve?: { t1: number; o1: number; t2: number; o2: number }
}

export interface TopicChildren {
  attached?: Topic[]
  detached?: Topic[]
}

export interface Topic {
  id: string
  class?: string
  title: string
  titleUnedited?: boolean
  structureClass?: string
  children?: TopicChildren
  style?: Style
  markers?: Marker[]
  labels?: string[]
  notes?: Note
  image?: ImageRef
  hyperlink?: string
  href?: string
  attachments?: AttachmentRef[]
  boundaries?: Boundary[]
  summaries?: Summary[]
  customWidth?: number
  customHeight?: number
  position?: { x: number; y: number }
  extensions?: Extension[]
  collapsed?: boolean
}

export interface ThemePart {
  id?: string
  properties: StyleProperties
}

export interface Theme {
  id: string
  centralTopic?: ThemePart
  mainTopic?: ThemePart
  subTopic?: ThemePart
  floatingTopic?: ThemePart
  summaryTopic?: ThemePart
  calloutTopic?: ThemePart
  importantTopic?: ThemePart
  minorTopic?: ThemePart
  expiredTopic?: ThemePart
  boundary?: ThemePart
  summary?: ThemePart
  relationship?: ThemePart
  map?: ThemePart
  colorThemeId?: string
  skeletonThemeId?: string
  global?: ThemePart
  level3?: ThemePart
  [key: string]: unknown
}

export interface Sheet {
  id: string
  class?: 'sheet'
  title: string
  rootTopic: Topic
  theme: Theme
  relationships?: Relationship[]
  extensions?: Extension[]
  topicPositioning?: 'fixed' | 'free'
  coreVersion?: string
  topicOverlapping?: 'overlap' | 'none'
  compactLayoutModeLevel?: number
  settings?: Record<string, unknown>
  legend?: unknown
  style?: Style
  background?: string
}

export interface Workbook {
  sheets: Sheet[]
  activeSheetId: string
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  language: 'zh-CN' | 'en-US'
  autoSave: boolean
  autoSaveIntervalMs: number
  handDrawnMode: boolean
  showGrid: boolean
  recentFiles: string[]
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export type StructureKey =
  | 'map'
  | 'mapUnbalanced'
  | 'logicRight'
  | 'logicLeft'
  | 'orgDown'
  | 'orgUp'
  | 'treeRight'
  | 'treeLeft'
  | 'timelineHorizontal'
  | 'timelineVertical'
  | 'fishboneLeft'
  | 'fishboneRight'
  | 'matrix'
  | 'treetable'
  | 'braceRight'
  | 'spreadsheet'

export interface Point {
  x: number
  y: number
}

export interface LayoutNode {
  id: string
  topic: Topic
  parentId?: string
  depth: number
  side: 'left' | 'right' | 'center'
  x: number
  y: number
  width: number
  height: number
  collapsed: boolean
  hasChildren: boolean
}

export type EdgeOrientation = 'horizontal' | 'vertical'

export type EdgeKind =
  | 'curve'
  | 'straight'
  | 'elbow'
  | 'roundedElbow'
  | 'bight'
  | 'fold'
  | 'roundedFold'
  | 'brace'
  | 'tapered'

export interface LayoutEdge {
  id: string
  fromId: string
  toId: string
  points: Point[]
  orientation: EdgeOrientation
  kind: EdgeKind
  color?: string
  width?: number
  dashed?: boolean
}

export interface LayoutBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface LayoutDecoration {
  id: string
  kind: 'line' | 'brace'
  points: Point[]
  color?: string
  width?: number
}

export interface LayoutResult {
  nodes: Map<string, LayoutNode>
  edges: LayoutEdge[]
  decorations: LayoutDecoration[]
  bounds: LayoutBounds
  structure: StructureKey
}

/* ------------------------------------------------------------------ */
/* File bridge                                                         */
/* ------------------------------------------------------------------ */

export interface OpenFileResult {
  canceled: boolean
  filePath?: string
  data?: Uint8Array
}

export interface SaveFileResult {
  canceled: boolean
  filePath?: string
}

export interface ExportImageOptions {
  format: 'png' | 'svg'
  data: string
  defaultName: string
}

export interface ExportPdfOptions {
  html: string
  defaultName: string
  landscape?: boolean
}

export interface RecentFile {
  path: string
  name: string
  openedAt: number
}

/* ------------------------------------------------------------------ */
/* User configuration                                                  */
/* ------------------------------------------------------------------ */

export interface UserStyleConfig {
  /** Every Style-panel property; null means "follow the theme/default". */
  properties: Record<string, StyleValue | null>
  /** null means the automatic width ("适合"). */
  customWidth: number | null
}

export interface UserPitchConfig {
  aspect: 'auto' | '16:9' | '4:3'
  themeSlide: 'auto' | 'show' | 'hide'
  listSlide: 'auto' | 'show' | 'hide'
  mode: 'fade' | 'push' | 'none'
  layout: 'left' | 'center' | 'right' | 'top' | 'bottom'
  style: 'dark' | 'light' | 'color'
}

/** Every value-bearing control in the Canvas tab. */
export interface UserCanvasSettings {
  handDrawn: boolean
  globalFont: 'default' | 'hand' | 'sans' | 'serif'
  branchWidth: 'thin' | 'default' | 'medium' | 'thick'
  rainbow: boolean
  rainbowPalette: 'vivid' | 'pastel' | 'warm' | 'cool'
  cjkFont: 'default' | 'heiti' | 'songti' | 'kaiti'
  autoBalance: boolean
  compactLayout: boolean
  alignSiblings: boolean
  freeBranch: boolean
  flexibleFloating: boolean
  topicOverlap: boolean
}

export interface UserCanvasConfig {
  structureClass: string
  /** The theme id shown by the theme selector. */
  themeId: string
  /** Full theme snapshot backing the theme selector (fonts/line widths). */
  theme?: Theme
  /** null means "follow the theme background". */
  background: string | null
  settings: UserCanvasSettings
}

export interface UserConfig {
  version: number
  /** ISO 8601 时间字符串，例如 2026-11-10T06:30:00.000Z */
  updatedAt: string
  style: UserStyleConfig
  pitch: UserPitchConfig
  canvas: UserCanvasConfig
}

export interface DesktopApi {
  openWorkbook(): Promise<OpenFileResult>
  pickFile(filters: { name: string; extensions: string[] }[]): Promise<OpenFileResult>
  readFile(path: string): Promise<OpenFileResult>
  onOpenPath(callback: (path: string) => void): () => void
  saveWorkbook(data: Uint8Array, currentPath?: string): Promise<SaveFileResult>
  saveWorkbookAs(data: Uint8Array, defaultName: string): Promise<SaveFileResult>
  exportBinary(data: Uint8Array, defaultName: string, filters: { name: string; extensions: string[] }[]): Promise<SaveFileResult>
  exportText(text: string, defaultName: string, filters: { name: string; extensions: string[] }[]): Promise<SaveFileResult>
  exportImage(opts: ExportImageOptions): Promise<SaveFileResult>
  exportPdf(opts: ExportPdfOptions): Promise<SaveFileResult>
  print(html: string): Promise<boolean>
  onMenuAction(callback: (action: string) => void): () => void
  getRecentFiles(): Promise<RecentFile[]>
  addRecentFile(path: string): Promise<void>
  getSettings(): Promise<AppSettings>
  saveSettings(settings: Partial<AppSettings>): Promise<AppSettings>
  getUserConfig(): Promise<UserConfig | null>
  saveUserConfig(config: UserConfig): Promise<string>
  setLanguage(language: string): Promise<void>
  newWindow(): Promise<void>
  showItemInFolder(path: string): Promise<void>
  readClipboardImage(): Promise<string | undefined>
  getAppInfo(): Promise<{ platform: string; version: string }>
  listFonts(): Promise<string[]>
  setDirty(dirty: boolean): void
  confirmClose(): void
  onRequestClose(callback: () => void): () => void
}
