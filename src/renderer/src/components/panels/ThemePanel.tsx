import { useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Plus } from 'lucide-react'
import type { StructureKey, Theme, ThemePart } from '@shared/types'
import { DEFAULT_THEME, RAINBOW_COLORS, rainbowPalette } from '@shared/defaults'
import { STRUCTURES, STRUCTURE_LIST, structureKeyOf } from '@shared/structures'
import StructurePicker from '../StructurePicker'
import { THEME_PRESETS, type ThemePreset } from '../../data/themes'
import { exportUserConfig, importUserConfigFromText, resetUserConfig } from '../../data/userConfig'
import { HAND_FONT_STACK, FONT_STACK } from '../../model/style'
import { useMapStore } from '../../store/mapStore'
import { useUiStore } from '../../store/uiStore'

const RAINBOW_PRESET: ThemePreset = {
  id: 'rainbow',
  name: { zh: '彩虹', en: 'Rainbow' },
  group: 'colorful',
  accent: RAINBOW_COLORS,
  theme: DEFAULT_THEME
}

const ALL_PRESETS: ThemePreset[] = [RAINBOW_PRESET, ...THEME_PRESETS]

function normalizeHex(value: string | undefined, fallback: string): string {
  if (!value) return fallback
  const match = value.match(/^#([0-9a-fA-F]{6})/)
  return match ? `#${match[1]}` : fallback
}

function themeColor(theme: Theme, part: keyof Theme, key: string, fallback: string): string {
  const value = (theme[part] as ThemePart | undefined)?.properties?.[key]
  return typeof value === 'string' ? value : fallback
}

function withFont(theme: Theme, font: string): Theme {
  const clone = structuredClone(theme)
  for (const key of ['centralTopic', 'mainTopic', 'subTopic', 'floatingTopic'] as const) {
    const part = clone[key] as ThemePart | undefined
    if (part) clone[key] = { ...part, properties: { ...part.properties, 'fo:font-family': font } }
  }
  return clone
}

function withBranchWidth(theme: Theme, width: string): Theme {
  const clone = structuredClone(theme)
  for (const key of ['mainTopic', 'subTopic'] as const) {
    const part = clone[key] as ThemePart | undefined
    if (part) clone[key] = { ...part, properties: { ...part.properties, 'line-width': width } }
  }
  return clone
}

const CJK_FONT_STACKS: Record<string, string> = {
  heiti: '"PingFang SC", "Heiti SC", "Microsoft YaHei", sans-serif',
  songti: '"Songti SC", "SimSun", Georgia, serif',
  kaiti: '"Kaiti SC", "KaiTi", "STKaiti", serif'
}

function Section({
  title,
  children,
  defaultOpen = true,
  extra
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  extra?: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className={`insp-section ${open ? 'open' : ''}`}>
      <div className="insp-section-head" role="button" tabIndex={0} onClick={() => setOpen((value) => !value)}>
        <span>{title}</span>
        <span className="insp-section-extra">{extra}</span>
        <ChevronDown size={14} className="insp-chevron" />
      </div>
      {open ? <div className="insp-section-body">{children}</div> : null}
    </section>
  )
}

function StructureGlyph({ structureKey }: { structureKey: StructureKey }) {
  const family = STRUCTURES[structureKey]?.family ?? 'map'
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' as const }
  let drawing: React.ReactNode
  if (family === 'logic' || family === 'tree' || family === 'brace') {
    drawing = (
      <>
        <rect x="2" y="7" width="7" height="6" rx="1.5" {...common} />
        <path d="M9 10h4M13 4v12M13 4h3M13 10h3M13 16h3" {...common} />
        {[1, 7, 13].map((y) => (
          <rect key={y} x="16" y={y} width="7" height="4.5" rx="1.2" {...common} />
        ))}
      </>
    )
  } else if (family === 'org') {
    drawing = (
      <>
        <rect x="9" y="2" width="8" height="5" rx="1.5" {...common} />
        <path d="M13 7v4M5 11h16M5 11v4M13 11v4M21 11v4" {...common} />
        {[5, 13, 21].map((x) => (
          <rect key={x} x={x - 3.5} y="15" width="7" height="4.5" rx="1.2" {...common} />
        ))}
      </>
    )
  } else if (family === 'timeline') {
    drawing = (
      <>
        <path d="M3 11h20" {...common} />
        {[5, 10, 15, 20].map((x, index) => (
          <g key={x}>
            <circle cx={x} cy="11" r="1.4" {...common} />
            <rect x={x - 2.5} y={index % 2 ? 15 : 3} width="5" height="4" rx="1" {...common} />
          </g>
        ))}
      </>
    )
  } else if (family === 'fishbone') {
    drawing = (
      <>
        <path d="M2 11h21" {...common} />
        <path d="M6 11L10 5M10 11L14 5M14 11L18 5M8 11L12 17M12 11L16 17" {...common} />
      </>
    )
  } else if (family === 'matrix' || family === 'treetable' || family === 'spreadsheet') {
    drawing = (
      <>
        {[2, 10, 18].map((x) =>
          [3, 9, 15].map((y) => <rect key={`${x}-${y}`} x={x} y={y} width="6" height="4.5" rx="1" {...common} />)
        )}
        <path d="M10 5h8M10 11h8M10 17h8" {...common} opacity="0.5" />
      </>
    )
  } else {
    drawing = (
      <>
        <rect x="8" y="8" width="8" height="5" rx="1.5" {...common} />
        <path d="M8 10.5H4M16 10.5h4M6 10.5V5h3M18 10.5V5h-3M6 10.5v5h3M18 10.5v5h-3" {...common} />
        <rect x="12" y="1" width="4" height="3" rx="1" {...common} />
        <rect x="12" y="17" width="4" height="3" rx="1" {...common} />
      </>
    )
  }
  return (
    <span className="structure-glyph">
      <svg width="26" height="22" viewBox="0 0 26 22" aria-hidden>
        {drawing}
      </svg>
    </span>
  )
}

function ThemePreview({ preset }: { preset: ThemePreset }) {
  const theme = preset.theme
  const background = themeColor(theme, 'map', 'svg:fill', '#ffffff')
  const root = themeColor(theme, 'centralTopic', 'svg:fill', '#1b2647')
  const main = preset.accent?.[0] ?? themeColor(theme, 'mainTopic', 'svg:fill', '#e85d4a')
  const sub = preset.accent?.[1] ?? themeColor(theme, 'subTopic', 'svg:fill', '#e8a23a')
  const isRainbow = preset.id === 'rainbow' || theme.rainbow === true
  const chips = isRainbow ? RAINBOW_COLORS.slice(0, 6) : [main, sub, preset.accent?.[2] ?? '#5bae6e', main, sub, preset.accent?.[3] ?? '#4a90d9']
  return (
    <div className="scheme-preview" style={{ background }}>
      <div className="scheme-root" style={{ background: root }}>
        <span style={{ background: '#ffffff55' }} />
        <span style={{ background: '#ffffff55' }} />
      </div>
      <div className="scheme-rows">
        {[0, 1].map((row) => (
          <div key={row} className="scheme-row">
            {[0, 1, 2].map((column) => (
              <span
                key={column}
                className="scheme-chip"
                style={{ background: chips[(row * 3 + column) % chips.length] }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CanvasPanel() {
  const sheet = useMapStore((s) => s.getActiveSheet())
  const setTheme = useMapStore((s) => s.setTheme)
  const setStructure = useMapStore((s) => s.setStructure)
  const setSheetBackground = useMapStore((s) => s.setSheetBackground)
  const setSheetSetting = useMapStore((s) => s.setSheetSetting)
  const toast = useUiStore((s) => s.toast)
  const [showAllThemes, setShowAllThemes] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [showCjk, setShowCjk] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const skeletonRef = useRef<HTMLButtonElement>(null)

  const structureKey = structureKeyOf(sheet.rootTopic.structureClass)
  const structure = STRUCTURE_LIST.find((item) => item.key === structureKey) ?? STRUCTURE_LIST[0]
  const currentPreset = ALL_PRESETS.find((preset) => preset.theme.id === sheet.theme.id)
  const background = normalizeHex(
    sheet.background ?? (sheet.theme.map?.properties?.['svg:fill'] as string | undefined),
    '#ffffff'
  )
  const settings = sheet.settings ?? {}
  const rainbow = settings.rainbow !== false
  const paletteName = typeof settings.rainbowPalette === 'string' ? settings.rainbowPalette : 'vivid'
  const palette = rainbowPalette(paletteName)
  const branchWidth = typeof settings.branchWidth === 'string' ? settings.branchWidth : 'default'
  const globalFont = typeof settings.globalFont === 'string' ? settings.globalFont : 'default'
  const cjkFont = typeof settings.cjkFont === 'string' ? settings.cjkFont : 'default'

  const visiblePresets = useMemo(() => {
    if (showAllThemes) return ALL_PRESETS
    const base = ALL_PRESETS.slice(0, 6)
    if (currentPreset && !base.some((preset) => preset.id === currentPreset.id)) base[5] = currentPreset
    return base
  }, [showAllThemes, currentPreset])

  const applyPreset = (preset: ThemePreset) => {
    setTheme(preset.theme)
    toast(`已应用配色：${preset.name.zh}`, 'success')
  }

  const presetFont = () => {
    const font = currentPreset?.theme.centralTopic?.properties?.['fo:font-family']
    return typeof font === 'string' && font ? font : HAND_FONT_STACK
  }

  const applyFont = (value: string) => {
    setSheetSetting('globalFont', value)
    if (value === 'hand') setTheme(withFont(sheet.theme, HAND_FONT_STACK))
    else if (value === 'sans') setTheme(withFont(sheet.theme, FONT_STACK))
    else if (value === 'serif') setTheme(withFont(sheet.theme, '"Songti SC", "SimSun", Georgia, serif'))
    else setTheme(withFont(sheet.theme, presetFont()))
  }

  const applyCjkFont = (value: string) => {
    setSheetSetting('cjkFont', value)
    const stack = CJK_FONT_STACKS[value]
    setTheme(withFont(sheet.theme, stack ? `${stack}, ${FONT_STACK}` : presetFont()))
  }

  const applyWidth = (value: string) => {
    setSheetSetting('branchWidth', value)
    const widths: Record<string, string> = { thin: '1.5pt', default: '2pt', medium: '3pt', thick: '4pt' }
    setTheme(withBranchWidth(sheet.theme, widths[value] ?? '2pt'))
  }

  const exportConfig = async () => {
    const result = await exportUserConfig()
    if (!result) {
      toast('无法导出配置', 'error')
      return
    }
    if (!result.canceled) toast('配置 JSON 已导出', 'success')
  }

  const importConfig = async () => {
    const result = await window.desktop?.pickFile([{ name: 'JSON', extensions: ['json'] }])
    if (!result || result.canceled || !result.data) return
    try {
      const text = new TextDecoder().decode(result.data)
      await importUserConfigFromText(text)
      toast('配置已导入，下次启动生效', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      toast(message === '解析失败' ? '解析失败' : '导入配置失败', 'error')
    }
  }

  const resetConfig = async () => {
    try {
      await resetUserConfig()
      toast('已重置为默认配置，下次启动生效', 'success')
    } catch {
      toast('重置配置失败', 'error')
    }
  }

  return (
    <div>
      <Section title="骨架">
        <button
          ref={skeletonRef}
          className={`card-select ${pickerOpen ? 'open' : ''}`}
          onClick={() => setPickerOpen((open) => !open)}
        >
          <StructureGlyph structureKey={structureKey} />
          <span className="card-select-label">{structure.label.zh}</span>
          <ChevronDown size={15} className="card-select-chevron" />
        </button>
        {pickerOpen ? (
          <StructurePicker
            current={structureKey}
            anchor={skeletonRef.current}
            onSelect={(key) => {
              if (key !== structureKey) {
                setStructure(key)
                toast(`已切换结构：${STRUCTURES[key]?.label.zh ?? key}`, 'success')
              }
              setPickerOpen(false)
            }}
            onClose={() => setPickerOpen(false)}
          />
        ) : null}
      </Section>

      <Section title="配色方案" extra={
        <button className="mini-plus" title="显示全部主题" onClick={(event) => {
          event.stopPropagation()
          setShowAllThemes((value) => !value)
        }}>
          <Plus size={14} />
        </button>
      }>
        <div className="scheme-select-row">
          <span className="scheme-swatch">
            {palette.slice(0, 5).map((color) => (
              <span key={color} style={{ background: color }} />
            ))}
          </span>
          <select
            className="field-select scheme-select"
            value={currentPreset?.theme.id ?? '__current'}
            onChange={(event) => {
              const preset = ALL_PRESETS.find((item) => item.theme.id === event.target.value)
              if (preset) applyPreset(preset)
            }}
          >
            {!currentPreset ? <option value="__current">当前主题</option> : null}
            {ALL_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.theme.id}>
                {preset.name.zh}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="field-chevron" />
        </div>

        <div className="scheme-grid">
          {visiblePresets.map((preset) => (
            <button
              key={preset.id}
              className={`scheme-card ${currentPreset?.id === preset.id ? 'active' : ''}`}
              onClick={() => applyPreset(preset)}
              title={`${preset.name.zh} / ${preset.name.en}`}
            >
              <ThemePreview preset={preset} />
              {currentPreset?.id === preset.id ? (
                <span className="scheme-check">
                  <Check size={10} />
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </Section>

      <div className="insp-plain-group">
        <div className="insp-row">
          <span>背景颜色</span>
          <input
            type="color"
            className="color-dot"
            value={background}
            onChange={(event) => setSheetBackground(event.target.value)}
          />
        </div>

        <label className="check-row">
          <input
            type="checkbox"
            checked={settings.handDrawn === true}
            onChange={(event) => setSheetSetting('handDrawn', event.target.checked)}
          />
          <span>手绘模式</span>
        </label>

        <div className="insp-row">
          <span>全局字体</span>
          <label className="field-select-wrap">
            <select className="field-select" value={globalFont} onChange={(event) => applyFont(event.target.value)}>
              <option value="default">默认</option>
              <option value="hand">手写</option>
              <option value="sans">无衬线</option>
              <option value="serif">衬线</option>
            </select>
            <ChevronDown size={14} className="field-chevron" />
          </label>
        </div>

        <div className="insp-row">
          <span>分支线粗细</span>
          <label className="field-select-wrap">
            <select className="field-select" value={branchWidth} onChange={(event) => applyWidth(event.target.value)}>
              <option value="thin">细</option>
              <option value="default">默认</option>
              <option value="medium">中</option>
              <option value="thick">粗</option>
            </select>
            <ChevronDown size={14} className="field-chevron" />
          </label>
        </div>

        <div className="insp-row">
          <label className="check-row">
            <input
              type="checkbox"
              checked={rainbow}
              onChange={(event) => setSheetSetting('rainbow', event.target.checked)}
            />
            <span>彩虹分支</span>
          </label>
          <div className="rainbow-palette">
            <button
              className="rainbow-dot"
              title="彩虹配色"
              onClick={() => setPaletteOpen((open) => !open)}
            >
              {palette.slice(0, 4).map((color) => (
                <span key={color} style={{ background: color }} />
              ))}
            </button>
            {paletteOpen ? (
              <div className="rainbow-menu">
                {[
                  { id: 'vivid', label: '彩虹' },
                  { id: 'pastel', label: '柔和' },
                  { id: 'warm', label: '暖色' },
                  { id: 'cool', label: '冷色' }
                ].map((option) => (
                  <button
                    key={option.id}
                    className={paletteName === option.id ? 'active' : ''}
                    onClick={() => {
                      setSheetSetting('rainbowPalette', option.id)
                      setPaletteOpen(false)
                    }}
                  >
                    <span className="rainbow-mini">
                      {rainbowPalette(option.id).slice(0, 4).map((color) => (
                        <i key={color} style={{ background: color }} />
                      ))}
                    </span>
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Section title="导图样式">
        <label className="check-row">
          <input
            type="checkbox"
            checked={settings.autoBalance !== false}
            onChange={(event) => setSheetSetting('autoBalance', event.target.checked)}
          />
          <span>自动平衡布局</span>
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={settings.compactLayout === true}
            onChange={(event) => setSheetSetting('compactLayout', event.target.checked)}
          />
          <span>紧凑型布局</span>
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={settings.alignSiblings !== false}
            onChange={(event) => setSheetSetting('alignSiblings', event.target.checked)}
          />
          <span>同级主题对齐</span>
        </label>
      </Section>

      <Section title="高级布局">
        <label className="check-row">
          <input
            type="checkbox"
            checked={settings.freeBranch === true}
            onChange={(event) => setSheetSetting('freeBranch', event.target.checked)}
          />
          <span>分支自由布局</span>
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={settings.flexibleFloating !== false}
            onChange={(event) => setSheetSetting('flexibleFloating', event.target.checked)}
          />
          <span>灵活自由主题</span>
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={settings.topicOverlap === true}
            onChange={(event) => setSheetSetting('topicOverlap', event.target.checked)}
          />
          <span>主题层叠</span>
        </label>
      </Section>

      <Section title="中日韩字体" defaultOpen={false}>
        <div className="insp-row">
          <span>字体</span>
          <label className="field-select-wrap">
            <select className="field-select" value={cjkFont} onChange={(event) => applyCjkFont(event.target.value)}>
              <option value="default">默认</option>
              <option value="heiti">黑体</option>
              <option value="songti">宋体</option>
              <option value="kaiti">楷体</option>
            </select>
            <ChevronDown size={14} className="field-chevron" />
          </label>
        </div>
        <button className="link-btn" onClick={() => setShowCjk((value) => !value)}>
          {showCjk ? '收起高级字体设置' : '高级字体设置'}
        </button>
        {showCjk ? (
          <div className="empty-state" style={{ padding: '6px 0 0', textAlign: 'left', fontSize: 11 }}>
            当前使用系统字体回退；安装自定义字体后可在此处扩展。
          </div>
        ) : null}
      </Section>

      <Section title="用户配置" defaultOpen={false}>
        <div
          className="empty-state"
          style={{ padding: '4px 0 8px', textAlign: 'left', fontSize: 11, lineHeight: 1.7 }}
        >
          样式、演播、画布的选项会自动保存到应用数据目录的 user-config.json；导入/重置会覆盖该文件，下次启动生效。打开已有文件时以文件内容为准。
        </div>
        <div className="config-actions">
          <button className="mini-btn" onClick={() => void exportConfig()}>
            导出配置
          </button>
          <button className="mini-btn" onClick={() => void importConfig()}>
            导入配置
          </button>
          <button className="mini-btn" onClick={() => void resetConfig()}>
            重置
          </button>
        </div>
      </Section>
    </div>
  )
}
