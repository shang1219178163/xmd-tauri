import { useState } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  GitBranch,
  Italic,
  Strikethrough,
  Type,
  Underline
} from 'lucide-react'
import type { StructureKey } from '@shared/types'
import { STRUCTURE_LIST, STRUCTURES, structureKeyOf } from '@shared/structures'
import { findTopicPath } from '../../model/tree'
import { resolveTopicStyle } from '../../model/style'
import FontPicker from '../FontPicker'
import { useMapStore } from '../../store/mapStore'
import { useUiStore } from '../../store/uiStore'

function Section({ title, children, preview }: { title: string; children: React.ReactNode; preview?: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <section className={`insp-section ${open ? 'open' : ''}`}>
      <div className="insp-section-head" role="button" tabIndex={0} onClick={() => setOpen((value) => !value)}>
        <span>{title}</span>
        {preview ? <span className="insp-section-extra">{preview}</span> : null}
        <ChevronDown size={14} className="insp-chevron" />
      </div>
      {open ? <div className="insp-section-body">{children}</div> : null}
    </section>
  )
}

function normalizeHex(value: string | undefined, fallback: string): string {
  if (!value || value === 'transparent') return fallback
  const match = value.match(/^#([0-9a-fA-F]{6})/)
  return match ? `#${match[1]}` : fallback
}

function ColorDot({ value, fallback, onChange, title }: { value?: string; fallback: string; onChange: (value: string) => void; title: string }) {
  return (
    <input
      type="color"
      className="color-dot"
      title={title}
      value={normalizeHex(value, fallback)}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

const DIRECTION_OPTIONS: Partial<Record<string, Array<{ label: string; key: StructureKey }>>> = {
  logicRight: [
    { label: '向右', key: 'logicRight' },
    { label: '向左', key: 'logicLeft' }
  ],
  logicLeft: [
    { label: '向右', key: 'logicRight' },
    { label: '向左', key: 'logicLeft' }
  ],
  treeRight: [
    { label: '向右', key: 'treeRight' },
    { label: '向左', key: 'treeLeft' }
  ],
  treeLeft: [
    { label: '向右', key: 'treeRight' },
    { label: '向左', key: 'treeLeft' }
  ],
  orgDown: [
    { label: '向下', key: 'orgDown' },
    { label: '向上', key: 'orgUp' }
  ],
  orgUp: [
    { label: '向下', key: 'orgDown' },
    { label: '向上', key: 'orgUp' }
  ],
  timelineHorizontal: [
    { label: '水平', key: 'timelineHorizontal' },
    { label: '垂直', key: 'timelineVertical' }
  ],
  timelineVertical: [
    { label: '水平', key: 'timelineHorizontal' },
    { label: '垂直', key: 'timelineVertical' }
  ],
  fishboneLeft: [
    { label: '向右', key: 'fishboneRight' },
    { label: '向左', key: 'fishboneLeft' }
  ],
  fishboneRight: [
    { label: '向右', key: 'fishboneRight' },
    { label: '向左', key: 'fishboneLeft' }
  ],
  map: [
    { label: '平衡', key: 'map' },
    { label: '不平衡', key: 'mapUnbalanced' }
  ],
  mapUnbalanced: [
    { label: '平衡', key: 'map' },
    { label: '不平衡', key: 'mapUnbalanced' }
  ]
}

export default function StylePanel() {
  const sheet = useMapStore((s) => s.getActiveSheet())
  const selection = useMapStore((s) => s.selection)
  const activeTopicId = useMapStore((s) => s.activeTopicId)
  const updateTopicStyle = useMapStore((s) => s.updateTopicStyle)
  const setTopicStyleForSelection = useMapStore((s) => s.setTopicStyleForSelection)
  const updateTopic = useMapStore((s) => s.updateTopic)
  const setStructure = useMapStore((s) => s.setStructure)
  const setSheetSetting = useMapStore((s) => s.setSheetSetting)
  const toast = useUiStore((s) => s.toast)

  const targetId = activeTopicId ?? sheet.rootTopic.id
  const path = findTopicPath(sheet.rootTopic, targetId) ?? [sheet.rootTopic]
  const depth = path.length - 1
  const topic = path[path.length - 1] ?? sheet.rootTopic
  const style = resolveTopicStyle(topic, sheet, depth)
  const multi = selection.length > 1
  const props = topic.style?.properties ?? {}
  const structureKey = structureKeyOf(sheet.rootTopic.structureClass)
  const structure = STRUCTURE_LIST.find((item) => item.key === structureKey) ?? STRUCTURE_LIST[0]
  const directions = DIRECTION_OPTIONS[structureKey]

  const apply = (properties: Record<string, string | number>) => {
    if (multi) setTopicStyleForSelection(properties)
    else updateTopicStyle(targetId, properties)
  }

  const isBold = Number(style.fontWeight) >= 600
  const isItalic = style.fontStyle === 'italic'
  const isUnderline = style.textDecoration.includes('underline')
  const isStrike = style.textDecoration.includes('line-through')
  const fillPattern = style.fillPattern ?? 'none'
  const align = style.textAlign
  // Styles are resolved to CSS pixels; the panel edits points, as XMind does.
  const borderPt = Math.round(((style.borderWidth * 3) / 4) * 10) / 10
  const linePt = Math.round(((style.lineWidth * 3) / 4) * 10) / 10
  const borderValue = String(borderPt)
  const lineValue = String(linePt)

  const toggleDecoration = (kind: 'underline' | 'line-through') => {
    const current = style.textDecoration === 'none' ? [] : style.textDecoration.split(' ')
    const next = current.includes(kind) ? current.filter((item) => item !== kind) : [...current, kind]
    apply({ 'fo:text-decoration': next.length ? next.join(' ') : 'none' })
  }

  return (
    <div>
      <Section title="形状" preview={<span className="mini-preview rounded" />}>
        <div className="insp-row">
          <span>形状</span>
          <label className="field-select-wrap">
            <select
              className="field-select"
              value={style.shapeClass}
              onChange={(event) => apply({ 'shape-class': event.target.value })}
            >
              <option value="org.xmind.topicShape.roundedRect">圆角矩形</option>
              <option value="org.xmind.topicShape.rect">矩形</option>
              <option value="org.xmind.topicShape.ellipse">椭圆</option>
              <option value="org.xmind.topicShape.capsule">胶囊</option>
              <option value="org.xmind.topicShape.underline">下划线</option>
            </select>
            <ChevronDown size={14} className="field-chevron" />
          </label>
        </div>
        <div className="insp-row">
          <span>填充</span>
          <label className="field-select-wrap" style={{ width: 92 }}>
            <select
              className="field-select"
              value={fillPattern === 'diagonal' || fillPattern === 'cross' ? fillPattern : 'none'}
              onChange={(event) => {
                const value = event.target.value
                apply({
                  'fill-pattern': value,
                  'pattern-color': value === 'none' ? 'transparent' : 'rgba(255,255,255,0.24)'
                })
              }}
            >
              <option value="none">纯色</option>
              <option value="diagonal">斜线</option>
              <option value="cross">交叉</option>
            </select>
            <ChevronDown size={14} className="field-chevron" />
          </label>
          <ColorDot
            title="填充颜色"
            value={props['svg:fill'] as string | undefined}
            fallback={style.fill}
            onChange={(value) => apply({ 'svg:fill': value })}
          />
        </div>
        <div className="insp-row">
          <span>宽度</span>
          <div className="width-input">
            <input
              className="field-input"
              type="number"
              min={40}
              max={800}
              value={Math.round(topic.customWidth ?? 174)}
              onChange={(event) => {
                const value = Number(event.target.value)
                if (Number.isFinite(value) && value > 0) updateTopic(targetId, { customWidth: value })
              }}
            />
            <span>PX</span>
          </div>
          <button className="mini-btn" onClick={() => updateTopic(targetId, { customWidth: undefined })}>
            适合
          </button>
        </div>
      </Section>

      <Section title="边框" preview={<span className="mini-preview border" />}>
        <div className="insp-row">
          <span>边框</span>
          <label className="field-select-wrap">
            <select
              className="field-select"
              value={borderValue}
              onChange={(event) => apply({ 'border-line-width': `${event.target.value}pt` })}
            >
              {!['0', '1', '2', '4'].includes(borderValue) ? (
                <option value={borderValue}>{borderPt.toFixed(1)} pt</option>
              ) : null}
              <option value="0">无</option>
              <option value="1">细</option>
              <option value="2">中</option>
              <option value="4">粗</option>
            </select>
            <ChevronDown size={14} className="field-chevron" />
          </label>
          <ColorDot
            title="边框颜色"
            value={props['border-line-color'] as string | undefined}
            fallback={style.borderColor === 'transparent' ? '#d0d5dd' : style.borderColor}
            onChange={(value) => apply({ 'border-line-color': value })}
          />
        </div>
        <div className="insp-row">
          <span>线条</span>
          <label className="field-select-wrap">
            <select
              className="field-select"
              value={style.lineClass}
              onChange={(event) => apply({ 'line-class': event.target.value })}
            >
              <option value="org.xmind.branchConnection.curve">曲线</option>
              <option value="org.xmind.branchConnection.straight">直线</option>
              <option value="org.xmind.branchConnection.elbow">折线</option>
              <option value="org.xmind.branchConnection.roundedElbow">圆角折线</option>
              <option value="org.xmind.branchConnection.bight">弯曲</option>
              <option value="org.xmind.branchConnection.fold">折叠</option>
              <option value="org.xmind.branchConnection.roundedfold">圆角折叠</option>
              <option value="org.xmind.branchConnection.brace">大括号</option>
              <option value="org.xmind.branchConnection.tapered">锥形</option>
            </select>
            <ChevronDown size={14} className="field-chevron" />
          </label>
        </div>
      </Section>

      <Section title="文本" preview={<span className="mini-preview icon"><Type size={15} /></span>}>
        <div className="insp-row">
          <span>字体</span>
          <FontPicker value={style.fontFamily} onChange={(value) => apply({ 'fo:font-family': value })} />
          <input
            className="field-input"
            style={{ width: 54 }}
            type="number"
            min={8}
            max={96}
            value={Math.round((style.fontSize * 3) / 4)}
            onChange={(event) => {
              const value = Number(event.target.value)
              if (Number.isFinite(value) && value > 0) apply({ 'fo:font-size': `${value}pt` })
            }}
          />
        </div>
        <div className="insp-row">
          <span>字重</span>
          <label className="field-select-wrap" style={{ flex: 1 }}>
            <select
              className="field-select"
              value={String(style.fontWeight)}
              onChange={(event) => apply({ 'fo:font-weight': event.target.value })}
            >
              <option value="300">细体</option>
              <option value="400">常规</option>
              <option value="500">中等</option>
              <option value="600">半粗</option>
              <option value="700">粗体</option>
              <option value="800">特粗</option>
            </select>
            <ChevronDown size={14} className="field-chevron" />
          </label>
          <ColorDot
            title="文字颜色"
            value={props['fo:color'] as string | undefined}
            fallback={style.color}
            onChange={(value) => apply({ 'fo:color': value })}
          />
        </div>
        <div className="seg-row">
          <button className={`seg-btn ${isBold ? 'active' : ''}`} title="粗体" onClick={() => apply({ 'fo:font-weight': isBold ? '400' : '700' })}>
            <Bold size={14} />
          </button>
          <button className={`seg-btn ${isItalic ? 'active' : ''}`} title="斜体" onClick={() => apply({ 'fo:font-style': isItalic ? 'normal' : 'italic' })}>
            <Italic size={14} />
          </button>
          <button className={`seg-btn ${isUnderline ? 'active' : ''}`} title="下划线" onClick={() => toggleDecoration('underline')}>
            <Underline size={14} />
          </button>
          <button className={`seg-btn ${isStrike ? 'active' : ''}`} title="删除线" onClick={() => toggleDecoration('line-through')}>
            <Strikethrough size={14} />
          </button>
        </div>
        <div className="seg-row align-row">
          {[
            { key: 'left', icon: <AlignLeft size={14} /> },
            { key: 'center', icon: <AlignCenter size={14} /> },
            { key: 'right', icon: <AlignRight size={14} /> }
          ].map((item) => (
            <button
              key={item.key}
              className={`seg-btn ${align === item.key ? 'active' : ''}`}
              title={`对齐：${item.key}`}
              onClick={() => apply({ 'fo:text-align': item.key })}
            >
              {item.icon}
            </button>
          ))}
        </div>
      </Section>

      <Section title="结构" preview={<span className="mini-preview icon"><GitBranch size={15} /></span>}>
        <div className="insp-row">
          <span>结构</span>
          <label className="field-select-wrap" style={{ flex: 1 }}>
            <select
              className="field-select"
              value={structureKey}
              onChange={(event) => setStructure(event.target.value as StructureKey)}
            >
              {STRUCTURE_LIST.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label.zh}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="field-chevron" />
          </label>
        </div>
        {directions ? (
          <div className="insp-row">
            <span>方向</span>
            <label className="field-select-wrap" style={{ flex: 1 }}>
              <select
                className="field-select"
                value={structureKey}
                onChange={(event) => {
                  setStructure(event.target.value as StructureKey)
                  toast(`方向：${STRUCTURES[event.target.value as StructureKey]?.label.zh ?? ''}`, 'success')
                }}
              >
                {directions.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="field-chevron" />
            </label>
          </div>
        ) : null}
      </Section>

      <Section title="分支" preview={<span className="mini-preview line" />}>
        <div className="insp-row">
          <span>线条</span>
          <label className="field-select-wrap" style={{ flex: 1 }}>
            <select
              className="field-select"
              value={style.lineClass}
              onChange={(event) => apply({ 'line-class': event.target.value })}
            >
              <option value="org.xmind.branchConnection.curve">曲线</option>
              <option value="org.xmind.branchConnection.straight">直线</option>
              <option value="org.xmind.branchConnection.elbow">折线</option>
              <option value="org.xmind.branchConnection.roundedElbow">圆角折线</option>
              <option value="org.xmind.branchConnection.bight">弯曲</option>
              <option value="org.xmind.branchConnection.fold">折叠</option>
              <option value="org.xmind.branchConnection.roundedfold">圆角折叠</option>
              <option value="org.xmind.branchConnection.brace">大括号</option>
              <option value="org.xmind.branchConnection.tapered">锥形</option>
            </select>
            <ChevronDown size={14} className="field-chevron" />
          </label>
          <ColorDot
            title="分支线颜色"
            value={props['line-color'] as string | undefined}
            fallback={style.lineColor}
            onChange={(value) => apply({ 'line-color': value })}
          />
        </div>
        <div className="insp-row">
          <span>粗细</span>
          <label className="field-select-wrap" style={{ flex: 1 }}>
            <select
              className="field-select"
              value={lineValue}
              onChange={(event) => apply({ 'line-width': `${event.target.value}pt` })}
            >
              {!['1', '2', '3', '4'].includes(lineValue) ? (
                <option value={lineValue}>{linePt.toFixed(1)} pt</option>
              ) : null}
              <option value="1">细</option>
              <option value="2">默认</option>
              <option value="3">中</option>
              <option value="4">粗</option>
            </select>
            <ChevronDown size={14} className="field-chevron" />
          </label>
        </div>
        <div className="insp-row">
          <label className="check-row">
            <input
              type="checkbox"
              checked={sheet.settings?.rainbow !== false}
              onChange={(event) => setSheetSetting('rainbow', event.target.checked)}
            />
            <span>彩虹分支</span>
          </label>
          <span className="rainbow-static">
            {['#E85D4A', '#E8A23A', '#E8C93A', '#5BAE6E', '#4A90D9'].map((color) => (
              <span key={color} style={{ background: color }} />
            ))}
          </span>
        </div>
      </Section>
    </div>
  )
}
