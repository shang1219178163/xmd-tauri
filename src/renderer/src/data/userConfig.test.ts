import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_THEME, createEmptyWorkbook } from '@shared/defaults'
import type { DesktopApi, UserConfig } from '@shared/types'
import { useMapStore } from '../store/mapStore'
import {
  DEFAULT_CANVAS_SETTINGS,
  DEFAULT_PITCH,
  DEFAULT_STYLE_PROPERTIES,
  STYLE_PROPERTIES,
  USER_CONFIG_VERSION,
  exportUserConfig,
  getUserConfig,
  getUserConfigPath,
  importUserConfigFromText,
  loadUserConfig,
  normalizeUserConfig,
  recordCanvasBackground,
  recordCanvasSettings,
  recordCanvasTheme,
  recordPitch,
  recordStructure,
  recordStyleChange,
  recordTopicWidth,
  resetUserConfig,
  resetUserConfigState
} from './userConfig'

const getUserConfigMock = vi.fn(async (): Promise<UserConfig | null> => null)
const saveUserConfigMock = vi.fn(async (_config: UserConfig) => '/tmp/user-config.json')
const exportTextMock = vi.fn(
  async (_text: string, _name: string, _filters: { name: string; extensions: string[] }[]) => ({
    canceled: false,
    filePath: '/tmp/export.json'
  })
)

describe('user config', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetUserConfigState()
    getUserConfigMock.mockClear()
    saveUserConfigMock.mockClear()
    exportTextMock.mockClear()
    Object.defineProperty(window, 'desktop', {
      configurable: true,
      writable: true,
      value: {
        getUserConfig: getUserConfigMock,
        saveUserConfig: saveUserConfigMock,
        exportText: exportTextMock
      } as unknown as DesktopApi
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    Reflect.deleteProperty(window, 'desktop')
    useMapStore.getState().reset(createEmptyWorkbook())
  })

  it('normalizes stored config to the complete schema', () => {
    const config = normalizeUserConfig({
      version: 99,
      updatedAt: 123,
      style: { properties: { 'fo:color': '#fff', bad: {} }, customWidth: 200 },
      pitch: {
        aspect: '16:9',
        themeSlide: 'bad',
        listSlide: 'hide',
        mode: 'none',
        layout: 'top',
        style: 'light'
      },
      canvas: {
        theme: { id: 'theme-x' },
        settings: { rainbow: false },
        background: '#000',
        structureClass: 'org.xmind.ui.tree.right'
      }
    })

    expect(config.version).toBe(USER_CONFIG_VERSION)
    expect(config.updatedAt).toBe(new Date(123).toISOString())
    expect(Object.keys(config.style.properties).sort()).toEqual([...STYLE_PROPERTIES].sort())
    expect(config.style.properties['fo:color']).toBe('#fff')
    expect(config.style.properties['shape-class']).toBe(DEFAULT_STYLE_PROPERTIES['shape-class'])
    expect(config.style.properties['fill-pattern']).toBe('none')
    expect(config.style.customWidth).toBe(200)
    expect(config.pitch.aspect).toBe('16:9')
    expect(config.pitch.themeSlide).toBe('auto')
    expect(config.pitch.listSlide).toBe('hide')
    expect(config.canvas.theme?.id).toBe('theme-x')
    expect(config.canvas.themeId).toBe('theme-x')
    expect(config.canvas.settings.rainbow).toBe(false)
    expect(config.canvas.settings.globalFont).toBe('default')
    expect(config.canvas.settings.autoBalance).toBe(true)
    expect(config.canvas.background).toBe('#000')
    expect(config.canvas.structureClass).toBe('org.xmind.ui.tree.right')
  })

  it('records style, width, canvas and pitch changes', async () => {
    recordStyleChange({ 'fo:color': '#fff' })
    recordStyleChange({ 'fo:font-weight': 700 })
    recordTopicWidth(200)
    recordStructure('org.xmind.ui.logic.left')
    recordCanvasTheme({ id: 'theme-x', centralTopic: { properties: { 'svg:fill': '#000' } } })
    recordCanvasSettings({ rainbow: false, globalFont: 'hand' })
    recordCanvasBackground('#123456')
    recordPitch({ ...DEFAULT_PITCH, aspect: '16:9' })

    const config = getUserConfig()
    expect(config.style.properties).toMatchObject({ 'fo:color': '#fff', 'fo:font-weight': 700 })
    expect(Object.keys(config.style.properties).sort()).toEqual([...STYLE_PROPERTIES].sort())
    expect(config.style.customWidth).toBe(200)
    expect(config.canvas.structureClass).toBe('org.xmind.ui.logic.left')
    expect(config.canvas.theme?.id).toBe('theme-x')
    expect(config.canvas.themeId).toBe('theme-x')
    expect(config.canvas.settings).toMatchObject({ rainbow: false, globalFont: 'hand' })
    expect(config.canvas.settings.autoBalance).toBe(true)
    expect(config.canvas.background).toBe('#123456')
    expect(config.pitch.aspect).toBe('16:9')

    await vi.runAllTimersAsync()
    expect(saveUserConfigMock).toHaveBeenCalledTimes(1)
    expect(getUserConfigPath()).toBe('/tmp/user-config.json')
  })

  it('creates the complete default config on first launch', async () => {
    getUserConfigMock.mockResolvedValueOnce(null)
    const config = await loadUserConfig()
    expect(config.version).toBe(USER_CONFIG_VERSION)
    expect(config.style.properties['fill-pattern']).toBe('none')
    expect(config.style.properties['line-class']).toBe('org.xmind.branchConnection.curve')
    expect(config.style.customWidth).toBeNull()
    expect(config.canvas.structureClass).toBe('org.xmind.ui.logic.right')
    expect(config.canvas.themeId).toBe(DEFAULT_THEME.id)
    expect(config.canvas.background).toBeNull()
    expect(config.canvas.settings).toEqual(DEFAULT_CANVAS_SETTINGS)
    expect(saveUserConfigMock).toHaveBeenCalledTimes(1)

    const saved = saveUserConfigMock.mock.calls[0][0]
    expect(Object.keys(saved.style.properties).sort()).toEqual([...STYLE_PROPERTIES].sort())
    expect(saved.style.properties['fill-pattern']).toBe('none')
    expect(saved.canvas.settings).toEqual(DEFAULT_CANVAS_SETTINGS)
    expect(saved.canvas.structureClass).toBe('org.xmind.ui.logic.right')
  })

  it('loads a stored config and rewrites it in the complete schema', async () => {
    getUserConfigMock.mockResolvedValueOnce(normalizeUserConfig({ canvas: { background: '#000' } }))
    const config = await loadUserConfig()
    expect(config.canvas.background).toBe('#000')
    expect(config.style.customWidth).toBeNull()
    expect(Object.keys(config.style.properties).sort()).toEqual([...STYLE_PROPERTIES].sort())
    expect(saveUserConfigMock).toHaveBeenCalledTimes(1)
  })

  it('imports a valid config and overwrites the file', async () => {
    const exported = {
      version: 1,
      updatedAt: 1,
      style: {
        properties: {
          'fill-pattern': 'diagonal',
          'line-class': 'org.xmind.branchConnection.straight'
        }
      },
      pitch: { ...DEFAULT_PITCH, aspect: '4:3' },
      canvas: { background: '#123456', structureClass: 'org.xmind.ui.timeline.vertical' }
    }
    const config = await importUserConfigFromText(JSON.stringify(exported))

    expect(config.version).toBe(USER_CONFIG_VERSION)
    expect(config.style.properties['fill-pattern']).toBe('diagonal')
    expect(config.style.properties['line-class']).toBe('org.xmind.branchConnection.straight')
    expect(config.style.properties['shape-class']).toBe(DEFAULT_STYLE_PROPERTIES['shape-class'])
    expect(config.pitch.aspect).toBe('4:3')
    expect(config.canvas.background).toBe('#123456')
    expect(config.canvas.structureClass).toBe('org.xmind.ui.timeline.vertical')
    expect(config.canvas.settings).toEqual(DEFAULT_CANVAS_SETTINGS)
    expect(saveUserConfigMock).toHaveBeenCalledTimes(1)
    const saved = saveUserConfigMock.mock.calls[0][0]
    expect(saved.canvas.structureClass).toBe('org.xmind.ui.timeline.vertical')
    expect(Object.keys(saved.style.properties).sort()).toEqual([...STYLE_PROPERTIES].sort())
  })

  it('rejects invalid JSON without overwriting the config', async () => {
    recordStyleChange({ 'fo:color': '#fff' })
    saveUserConfigMock.mockClear()
    const before = getUserConfig()

    await expect(importUserConfigFromText('{not json')).rejects.toThrow('解析失败')
    expect(getUserConfig()).toEqual(before)
    expect(saveUserConfigMock).not.toHaveBeenCalled()
  })

  it('rejects unrelated JSON', async () => {
    await expect(importUserConfigFromText(JSON.stringify({ foo: 1 }))).rejects.toThrow('解析失败')
  })

  it('resets to the complete default config', async () => {
    recordStyleChange({ 'fo:color': '#fff' })
    recordCanvasBackground('#000')
    saveUserConfigMock.mockClear()

    const config = await resetUserConfig()
    expect(config.style.properties['fill-pattern']).toBe('none')
    expect(config.style.properties['line-class']).toBe('org.xmind.branchConnection.curve')
    expect(config.style.properties['svg:fill']).toBeNull()
    expect(config.style.customWidth).toBeNull()
    expect(config.canvas.structureClass).toBe('org.xmind.ui.logic.right')
    expect(config.canvas.background).toBeNull()
    expect(config.canvas.themeId).toBe(DEFAULT_THEME.id)
    expect(config.canvas.settings).toEqual(DEFAULT_CANVAS_SETTINGS)
    expect(saveUserConfigMock).toHaveBeenCalledTimes(1)
    const saved = saveUserConfigMock.mock.calls[0][0]
    expect(saved.style.properties['fill-pattern']).toBe('none')
    expect(saved.canvas.structureClass).toBe('org.xmind.ui.logic.right')
    expect(saved.canvas.settings).toEqual(DEFAULT_CANVAS_SETTINGS)
  })

  it('applies every concrete config value to a fresh default map', () => {
    const config = normalizeUserConfig({
      style: {
        properties: {
          'fo:font-family': '"Songti SC"',
          'svg:fill': '#ff0000',
          'shape-class': 'org.xmind.topicShape.ellipse'
        },
        customWidth: 220
      },
      canvas: {
        theme: { id: 'theme-test' },
        settings: { rainbow: false, handDrawn: true },
        background: '#101010',
        structureClass: 'org.xmind.ui.timeline.horizontal'
      }
    })
    useMapStore.getState().reset(createEmptyWorkbook())
    useMapStore.getState().applyUserDefaults(config)
    const sheet = useMapStore.getState().getActiveSheet()

    expect(sheet.background).toBe('#101010')
    expect(sheet.rootTopic.structureClass).toBe('org.xmind.ui.timeline.horizontal')
    expect(sheet.rootTopic.style?.properties['fo:font-family']).toBe('"Songti SC"')
    expect(sheet.rootTopic.style?.properties['svg:fill']).toBe('#ff0000')
    expect(sheet.rootTopic.style?.properties['shape-class']).toBe('org.xmind.topicShape.ellipse')
    expect(sheet.rootTopic.style?.properties['fill-pattern']).toBe('none')
    expect(sheet.rootTopic.style?.properties['line-class']).toBe('org.xmind.branchConnection.curve')
    expect(sheet.rootTopic.style?.properties['fo:font-weight']).toBeUndefined()
    expect(sheet.rootTopic.customWidth).toBe(220)
    expect(sheet.settings?.rainbow).toBe(false)
    expect(sheet.settings?.handDrawn).toBe(true)
    expect(sheet.settings?.globalFont).toBe('default')
    expect(sheet.settings?.autoBalance).toBe(true)
    expect(sheet.settings?.topicOverlap).toBe(false)
    expect(sheet.theme.id).toBe('theme-test')
    expect(useMapStore.getState().dirty).toBe(false)
  })

  it('exports the complete current config as JSON', async () => {
    recordStyleChange({ 'fo:color': '#fff' })
    const result = await exportUserConfig()
    expect(result?.canceled).toBe(false)
    expect(exportTextMock).toHaveBeenCalledTimes(1)
    const call = exportTextMock.mock.calls[0] as unknown as [
      string,
      string,
      { name: string; extensions: string[] }[]
    ]
    expect(call[1]).toBe('xmd-config.json')
    expect(call[2]).toEqual([{ name: 'JSON', extensions: ['json'] }])
    const parsed = JSON.parse(call[0]) as UserConfig
    expect(parsed.version).toBe(USER_CONFIG_VERSION)
    expect(parsed.style.properties['fo:color']).toBe('#fff')
    expect(Object.keys(parsed.style.properties).sort()).toEqual([...STYLE_PROPERTIES].sort())
    expect(parsed.canvas.settings).toEqual(DEFAULT_CANVAS_SETTINGS)
  })
})
