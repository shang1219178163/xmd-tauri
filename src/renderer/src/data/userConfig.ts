/**
 * User configuration: every value-bearing control in the Style, Pitch and
 * Canvas tabs. The file always contains a complete set of fields; null means
 * "follow the theme / automatic".
 */
import { DEFAULT_THEME } from '@shared/defaults'
import type {
  SaveFileResult,
  StyleValue,
  Theme,
  UserCanvasConfig,
  UserCanvasSettings,
  UserConfig,
  UserPitchConfig,
  UserStyleConfig
} from '@shared/types'

export const USER_CONFIG_VERSION = 2
export const USER_CONFIG_FILE = 'user-config.json'

export const DEFAULT_STRUCTURE_CLASS = 'org.xmind.ui.logic.right'

/** Style-panel properties, in the same order as the Style tab sections. */
export const STYLE_PROPERTIES = [
  'shape-class',
  'fill-pattern',
  'pattern-color',
  'svg:fill',
  'border-line-width',
  'border-line-color',
  'line-class',
  'line-color',
  'line-width',
  'fo:font-family',
  'fo:font-size',
  'fo:font-weight',
  'fo:font-style',
  'fo:text-decoration',
  'fo:text-align',
  'fo:color'
] as const

/**
 * Default values written by reset. Colors, font family/size/weight and
 * widths are null so they follow the theme; shape/fill/line are concrete to
 * satisfy the reset defaults (solid fill, curved branches).
 */
export const DEFAULT_STYLE_PROPERTIES: Record<string, StyleValue | null> = {
  'shape-class': 'org.xmind.topicShape.roundedRect',
  'fill-pattern': 'none',
  'pattern-color': 'transparent',
  'svg:fill': null,
  'border-line-width': null,
  'border-line-color': null,
  'line-class': 'org.xmind.branchConnection.curve',
  'line-color': null,
  'line-width': null,
  'fo:font-family': null,
  'fo:font-size': null,
  'fo:font-weight': null,
  'fo:font-style': 'normal',
  'fo:text-decoration': 'none',
  'fo:text-align': 'center',
  'fo:color': null
}

export const DEFAULT_CANVAS_SETTINGS: UserCanvasSettings = {
  handDrawn: false,
  globalFont: 'default',
  branchWidth: 'default',
  rainbow: true,
  rainbowPalette: 'vivid',
  cjkFont: 'default',
  autoBalance: true,
  compactLayout: false,
  alignSiblings: true,
  freeBranch: false,
  flexibleFloating: true,
  topicOverlap: false
}

export const DEFAULT_PITCH: UserPitchConfig = {
  aspect: 'auto',
  themeSlide: 'auto',
  listSlide: 'auto',
  mode: 'fade',
  layout: 'left',
  style: 'dark'
}

export function createDefaultUserConfig(): UserConfig {
  return {
    version: USER_CONFIG_VERSION,
    updatedAt: '',
    style: { properties: { ...DEFAULT_STYLE_PROPERTIES }, customWidth: null },
    pitch: { ...DEFAULT_PITCH },
    canvas: {
      structureClass: DEFAULT_STRUCTURE_CLASS,
      themeId: DEFAULT_THEME.id,
      background: null,
      settings: { ...DEFAULT_CANVAS_SETTINGS }
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

function normalizeStyle(value: unknown): UserStyleConfig {
  const record = isRecord(value) ? value : {}
  const source = isRecord(record.properties) ? record.properties : {}
  const properties: Record<string, StyleValue | null> = {}
  for (const key of STYLE_PROPERTIES) {
    const raw = source[key]
    properties[key] =
      raw === null || typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean'
        ? raw
        : DEFAULT_STYLE_PROPERTIES[key]
  }
  const customWidth =
    typeof record.customWidth === 'number' && Number.isFinite(record.customWidth) && record.customWidth > 0
      ? Math.round(record.customWidth)
      : null
  return { properties, customWidth }
}

function normalizePitch(value: unknown): UserPitchConfig {
  const record = isRecord(value) ? value : {}
  return {
    aspect: pickEnum(record.aspect, ['auto', '16:9', '4:3'] as const, DEFAULT_PITCH.aspect),
    themeSlide: pickEnum(record.themeSlide, ['auto', 'show', 'hide'] as const, DEFAULT_PITCH.themeSlide),
    listSlide: pickEnum(record.listSlide, ['auto', 'show', 'hide'] as const, DEFAULT_PITCH.listSlide),
    mode: pickEnum(record.mode, ['fade', 'push', 'none'] as const, DEFAULT_PITCH.mode),
    layout: pickEnum(record.layout, ['left', 'center', 'right', 'top', 'bottom'] as const, DEFAULT_PITCH.layout),
    style: pickEnum(record.style, ['dark', 'light', 'color'] as const, DEFAULT_PITCH.style)
  }
}

function normalizeCanvasSettings(value: unknown): UserCanvasSettings {
  const record = isRecord(value) ? value : {}
  return {
    handDrawn: typeof record.handDrawn === 'boolean' ? record.handDrawn : DEFAULT_CANVAS_SETTINGS.handDrawn,
    globalFont: pickEnum(
      record.globalFont,
      ['default', 'hand', 'sans', 'serif'] as const,
      DEFAULT_CANVAS_SETTINGS.globalFont
    ),
    branchWidth: pickEnum(
      record.branchWidth,
      ['thin', 'default', 'medium', 'thick'] as const,
      DEFAULT_CANVAS_SETTINGS.branchWidth
    ),
    rainbow: typeof record.rainbow === 'boolean' ? record.rainbow : DEFAULT_CANVAS_SETTINGS.rainbow,
    rainbowPalette: pickEnum(
      record.rainbowPalette,
      ['vivid', 'pastel', 'warm', 'cool'] as const,
      DEFAULT_CANVAS_SETTINGS.rainbowPalette
    ),
    cjkFont: pickEnum(
      record.cjkFont,
      ['default', 'heiti', 'songti', 'kaiti'] as const,
      DEFAULT_CANVAS_SETTINGS.cjkFont
    ),
    autoBalance:
      typeof record.autoBalance === 'boolean' ? record.autoBalance : DEFAULT_CANVAS_SETTINGS.autoBalance,
    compactLayout:
      typeof record.compactLayout === 'boolean' ? record.compactLayout : DEFAULT_CANVAS_SETTINGS.compactLayout,
    alignSiblings:
      typeof record.alignSiblings === 'boolean' ? record.alignSiblings : DEFAULT_CANVAS_SETTINGS.alignSiblings,
    freeBranch: typeof record.freeBranch === 'boolean' ? record.freeBranch : DEFAULT_CANVAS_SETTINGS.freeBranch,
    flexibleFloating:
      typeof record.flexibleFloating === 'boolean'
        ? record.flexibleFloating
        : DEFAULT_CANVAS_SETTINGS.flexibleFloating,
    topicOverlap:
      typeof record.topicOverlap === 'boolean' ? record.topicOverlap : DEFAULT_CANVAS_SETTINGS.topicOverlap
  }
}

function normalizeCanvas(value: unknown): UserCanvasConfig {
  const record = isRecord(value) ? value : {}
  const theme =
    isRecord(record.theme) && typeof record.theme.id === 'string'
      ? (structuredClone(record.theme) as Theme)
      : undefined
  const settings = normalizeCanvasSettings(record.settings)
  const storedRainbow = isRecord(record.settings) ? record.settings.rainbow : undefined
  if (theme && typeof storedRainbow !== 'boolean' && typeof theme.rainbow === 'boolean') {
    settings.rainbow = theme.rainbow
  }
  const themeId =
    typeof theme?.id === 'string'
      ? theme.id
      : typeof record.themeId === 'string' && record.themeId
        ? record.themeId
        : DEFAULT_THEME.id
  return {
    structureClass:
      typeof record.structureClass === 'string' && record.structureClass
        ? record.structureClass
        : DEFAULT_STRUCTURE_CLASS,
    themeId,
    ...(theme ? { theme } : {}),
    background: typeof record.background === 'string' && record.background ? record.background : null,
    settings
  }
}

/** 兼容旧版本的数字时间戳，统一转为 ISO 字符串。 */
function normalizeUpdatedAt(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString()
  return ''
}

/** Merges stored data with the complete default schema. */
export function normalizeUserConfig(value: unknown): UserConfig {
  if (!isRecord(value)) return createDefaultUserConfig()
  return {
    version: USER_CONFIG_VERSION,
    updatedAt: normalizeUpdatedAt(value.updatedAt),
    style: normalizeStyle(value.style),
    pitch: normalizePitch(value.pitch),
    canvas: normalizeCanvas(value.canvas)
  }
}

let current: UserConfig = createDefaultUserConfig()
let configPath = ''
let saveTimer: number | undefined

export function getUserConfig(): UserConfig {
  return structuredClone(current)
}

export function getUserConfigPath(): string {
  return configPath
}

/** Test/bootstrap helper: replaces the in-memory configuration. */
export function resetUserConfigState(config?: UserConfig): void {
  if (saveTimer !== undefined) {
    window.clearTimeout(saveTimer)
    saveTimer = undefined
  }
  current = config ? normalizeUserConfig(config) : createDefaultUserConfig()
  configPath = ''
}

async function persistNow(): Promise<void> {
  const save = window.desktop?.saveUserConfig
  if (!save) return
  try {
    configPath = await save(structuredClone(current))
  } catch {
    /* configuration persistence is best-effort */
  }
}

async function persistOrThrow(): Promise<void> {
  const save = window.desktop?.saveUserConfig
  if (!save) throw new Error('无法写入配置')
  try {
    configPath = await save(structuredClone(current))
  } catch (error) {
    throw new Error(`写入配置失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

function schedulePersist(): void {
  current.updatedAt = new Date().toISOString()
  if (saveTimer !== undefined) window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    saveTimer = undefined
    void persistNow()
  }, 200)
}

/**
 * Loads the config and rewrites the file in the complete schema, so old or
 * partial files gain every field without user action.
 */
export async function loadUserConfig(): Promise<UserConfig> {
  try {
    const stored = await window.desktop?.getUserConfig?.()
    current = stored ? normalizeUserConfig(stored) : createDefaultUserConfig()
    await persistNow()
  } catch {
    current = createDefaultUserConfig()
  }
  return getUserConfig()
}

export function flushUserConfigSave(): void {
  if (saveTimer !== undefined) {
    window.clearTimeout(saveTimer)
    saveTimer = undefined
  }
  void persistNow()
}

/* ------------------------------------------------------------------ */
/* Recording                                                           */
/* ------------------------------------------------------------------ */

export function recordStyleChange(properties: Record<string, StyleValue>): void {
  const cleaned: Record<string, StyleValue> = {}
  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      cleaned[key] = value
    }
  }
  current.style.properties = { ...current.style.properties, ...cleaned }
  schedulePersist()
}

export function recordTopicWidth(width?: number): void {
  current.style.customWidth =
    typeof width === 'number' && Number.isFinite(width) && width > 0 ? Math.round(width) : null
  schedulePersist()
}

export function recordStructure(structureClass: string): void {
  current.canvas.structureClass = structureClass
  schedulePersist()
}

export function recordCanvasTheme(theme: Theme): void {
  current.canvas.theme = structuredClone(theme)
  current.canvas.themeId = theme.id
  schedulePersist()
}

export function recordCanvasSettings(settings: Record<string, unknown> | undefined): void {
  current.canvas.settings = normalizeCanvasSettings(settings)
  schedulePersist()
}

export function recordCanvasBackground(color: string | undefined): void {
  current.canvas.background = typeof color === 'string' && color ? color : null
  schedulePersist()
}

export function recordPitch(pitch: UserPitchConfig): void {
  current.pitch = { ...current.pitch, ...pitch }
  schedulePersist()
}

/* ------------------------------------------------------------------ */
/* Import / reset                                                      */
/* ------------------------------------------------------------------ */

/** Parses an exported config and overwrites the local config file. */
export async function importUserConfigFromText(text: string): Promise<UserConfig> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('解析失败')
  }
  if (!isRecord(parsed)) throw new Error('解析失败')
  const hasSection = ['style', 'pitch', 'canvas'].some((key) => isRecord(parsed[key]))
  if (!hasSection) throw new Error('解析失败')

  current = normalizeUserConfig(parsed)
  current.updatedAt = new Date().toISOString()
  await persistOrThrow()
  return getUserConfig()
}

/** Overwrites the local config file with the built-in defaults. */
export async function resetUserConfig(): Promise<UserConfig> {
  current = createDefaultUserConfig()
  current.updatedAt = new Date().toISOString()
  await persistOrThrow()
  return getUserConfig()
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

export async function exportUserConfig(): Promise<SaveFileResult | undefined> {
  const exportText = window.desktop?.exportText
  if (!exportText) return undefined
  current.updatedAt = new Date().toISOString()
  const json = `${JSON.stringify(current, null, 2)}\n`
  try {
    const result = await exportText(json, 'xmd-config.json', [
      { name: 'JSON', extensions: ['json'] }
    ])
    if (!result.canceled) void persistNow()
    return result
  } catch {
    return undefined
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushUserConfigSave)
}
