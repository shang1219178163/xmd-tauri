import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { StructureKey } from '@shared/types'
import { STRUCTURE_LIST, STRUCTURES } from '@shared/structures'

const GROUPS: Array<{ label: string; keys: StructureKey[] }> = [
  { label: '思维导图', keys: ['map', 'mapUnbalanced'] },
  { label: '逻辑图', keys: ['logicRight', 'logicLeft'] },
  { label: '括号图', keys: ['braceRight'] },
  { label: '组织结构图', keys: ['orgDown', 'orgUp'] },
  { label: '树形图', keys: ['treeRight', 'treeLeft'] },
  { label: '时间轴', keys: ['timelineHorizontal', 'timelineVertical'] },
  { label: '鱼骨图', keys: ['fishboneLeft', 'fishboneRight'] },
  { label: '树形表格', keys: ['treetable'] },
  { label: '矩阵图', keys: ['matrix'] },
  { label: '电子表格', keys: ['spreadsheet'] }
]

const STROKE = '#aeb6c2'
const FILL = '#eef1f4'

function box(x: number, y: number, w = 22, h = 10, rx = 2) {
  return <rect key={`${x}-${y}-${w}-${h}`} x={x} y={y} width={w} height={h} rx={rx} fill={FILL} stroke={STROKE} strokeWidth="1.3" />
}

function StructureThumb({ structureKey }: { structureKey: StructureKey }) {
  const family = STRUCTURES[structureKey]?.family ?? 'map'
  const line = { stroke: STROKE, strokeWidth: 1.3, fill: 'none', strokeLinecap: 'round' as const }
  let drawing: React.ReactNode

  if (structureKey === 'map' || structureKey === 'mapUnbalanced') {
    const centerX = structureKey === 'map' ? 54 : 32
    drawing = (
      <>
        {box(centerX, 31, 34, 13, 6)}
        <path d={`M${centerX} 37H${centerX - 18}M${centerX + 34} 37h18`} {...line} />
        {[9, 25, 49, 65].map((y) => (
          <g key={y}>
            <path d={`M${centerX - 18} 37L${centerX - 27} ${y + 6}M${centerX + 52} 37L${centerX + 61} ${y + 6}`} {...line} />
            {box(centerX - 49, y - 5, 22, 10)}
            {box(centerX + 61, y - 5, 22, 10)}
          </g>
        ))}
      </>
    )
  } else if (structureKey === 'logicRight' || structureKey === 'logicLeft') {
    const right = structureKey === 'logicRight'
    const x0 = right ? 7 : 101
    const x1 = right ? 48 : 60
    const x2 = right ? 84 : 24
    drawing = (
      <>
        {box(right ? 7 : 101, 31, 22, 12, 5)}
        <path d={`M${x0 + (right ? 22 : 0)} 37H${x1}M${x1} 15v44M${x1} 15h${x2 - x1}M${x1} 37h${x2 - x1}M${x1} 59h${x2 - x1}`} {...line} />
        {[10, 32, 54].map((y) => box(x2, y, 22, 10))}
        <path d={`M${x2 + 22} 15h${right ? 9 : -9}M${x2 + 22} 37h${right ? 9 : -9}`} {...line} />
        {[10, 32].map((y) => box(right ? 115 : 3, y, 12, 10))}
      </>
    )
  } else if (structureKey === 'braceRight') {
    drawing = (
      <>
        {box(6, 31, 22, 12, 5)}
        <path d="M28 37h12c8 0 8-22 16-22h10M40 37h6c8 0 8-12 16-12h10M40 37h6c8 0 8 0 16 0h10M40 37h6c8 0 8 12 16 12h10M28 37h12c8 0 8 22 16 22h10" {...line} />
        {[4, 20, 32, 44, 60].map((y) => box(82, y, 24, 8))}
      </>
    )
  } else if (structureKey === 'orgDown' || structureKey === 'orgUp') {
    const down = structureKey === 'orgDown'
    const top = down ? 5 : 59
    const mid = down ? 27 : 37
    const low = down ? 50 : 14
    drawing = (
      <>
        {box(49, top, 32, 12, 5)}
        <path d={`M65 ${top + (down ? 12 : 0)}v${down ? 10 : -10}M30 ${mid}h70M30 ${mid}v${down ? 11 : -11}M65 ${mid}v${down ? 11 : -11}M100 ${mid}v${down ? 11 : -11}`} {...line} />
        {[18, 53, 88].map((x) => box(x, down ? mid + 11 : mid - 21, 26, 10))}
        {down ? (
          <path d="M31 38v8M65 23v23M99 38v8" {...line} />
        ) : null}
        {down ? box(24, low, 14, 8) : null}
        {down ? box(58, low, 14, 8) : null}
        {down ? box(92, low, 14, 8) : null}
      </>
    )
  } else if (structureKey === 'treeRight' || structureKey === 'treeLeft') {
    const right = structureKey === 'treeRight'
    const x0 = right ? 7 : 101
    const x1 = right ? 43 : 65
    const x2 = right ? 82 : 26
    drawing = (
      <>
        {box(x0, 5, 22, 11, 5)}
        <path d={`M${x0 + 22} 10.5H${x1}V66H${x2}M${x1} 23H${x2}M${x1} 42H${x2}M${x2} 66H${right ? 118 : 12}`} {...line} />
        {box(x2, 18, 28, 10)}
        {box(x2, 37, 22, 10)}
        {box(x2, 56, 18, 10)}
        <path d={`M${x2} 42H${right ? 73 : 57}V71H${right ? 118 : 12}`} {...line} />
        {box(right ? 100 : 8, 66, 22, 8)}
      </>
    )
  } else if (structureKey === 'timelineHorizontal' || structureKey === 'timelineVertical') {
    const horizontal = structureKey === 'timelineHorizontal'
    drawing = horizontal ? (
      <>
        <path d="M8 37h114" {...line} />
        {[18, 40, 62, 84, 106].map((x, index) => (
          <g key={x}>
            <circle cx={x} cy="37" r="3" fill={FILL} stroke={STROKE} strokeWidth="1.3" />
            <path d={`M${x} 37v${index % 2 ? 12 : -12}`} {...line} />
            {box(x - 9, index % 2 ? 49 : 15, 18, 9)}
          </g>
        ))}
      </>
    ) : (
      <>
        <path d="M65 6v62" {...line} />
        {[14, 28, 42, 56].map((y, index) => (
          <g key={y}>
            <circle cx="65" cy={y} r="3" fill={FILL} stroke={STROKE} strokeWidth="1.3" />
            <path d={`M65 ${y}h${index % 2 ? 14 : -14}`} {...line} />
            {box(index % 2 ? 79 : 26, y - 4, 24, 8)}
          </g>
        ))}
      </>
    )
  } else if (structureKey === 'fishboneLeft' || structureKey === 'fishboneRight') {
    const left = structureKey === 'fishboneLeft'
    const dir = left ? 1 : -1
    drawing = (
      <>
        <path d={left ? 'M112 37H10' : 'M18 37h104'} {...line} />
        {[22, 42, 62, 82].map((x, index) => (
          <g key={x}>
            <path d={`M${x} 37l${dir * 10} ${index % 2 ? 22 : -22}`} {...line} />
            {box(left ? x + dir * 10 - 16 : x + dir * 10 - 8, index % 2 ? 54 : 10, 24, 9)}
          </g>
        ))}
        {box(left ? 96 : 18, 31, 18, 12, 5)}
      </>
    )
  } else if (structureKey === 'treetable') {
    drawing = (
      <>
        <rect x="10" y="10" width="110" height="54" rx="2" fill="none" stroke={STROKE} strokeWidth="1.3" />
        <path d="M10 26h110M10 42h110M48 10v54M84 10v54" {...line} />
        <path d="M16 18h18M54 18h20M90 18h16M54 34h20M90 34h16M54 50h20M90 50h16" {...line} />
        <path d="M16 18v8h4M16 26v8h4M16 34v8h4M16 42v8h4" {...line} />
      </>
    )
  } else if (structureKey === 'matrix') {
    drawing = (
      <>
        <rect x="16" y="8" width="98" height="58" rx="3" fill="none" stroke={STROKE} strokeWidth="1.3" />
        <path d="M49 8v58M81 8v58M16 27h98M16 47h98" {...line} />
        {[22, 38, 55].map((y) => [24, 57, 89].map((x) => box(x, y, 18, 6))).flat()}
      </>
    )
  } else {
    drawing = (
      <>
        <rect x="10" y="9" width="110" height="56" rx="2" fill="none" stroke={STROKE} strokeWidth="1.3" />
        <path d="M10 24h110M10 40h110M10 56h110M40 9v56M72 9v56M100 9v56" {...line} />
        {[14, 30, 46, 62].map((y) => (
          <g key={y}>
            {box(15, y, 18, 6)}
            {box(44, y, 22, 6)}
            {box(76, y, 18, 6)}
            {box(104, y, 12, 6)}
          </g>
        ))}
      </>
    )
  }

  return (
    <span className="sp-thumb">
      <svg width="100%" height="100%" viewBox="0 0 130 74" preserveAspectRatio="xMidYMid meet">
        {drawing}
      </svg>
    </span>
  )
}

export default function StructurePicker({
  current,
  anchor,
  onSelect,
  onClose
}: {
  current: StructureKey
  anchor: HTMLElement | null
  onSelect: (key: StructureKey) => void
  onClose: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handle = (event: MouseEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target)) return
      if (anchor?.contains(target)) return
      onClose()
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', handle)
    window.addEventListener('keydown', escape)
    return () => {
      window.removeEventListener('mousedown', handle)
      window.removeEventListener('keydown', escape)
    }
  }, [anchor, onClose])

  const rect = anchor?.getBoundingClientRect()
  const width = 430
  const gap = 14
  const left = rect ? Math.max(16, rect.left - width - gap) : 200
  const top = rect ? Math.max(16, Math.min(rect.top, window.innerHeight - 140)) : 160
  const maxHeight = Math.max(240, Math.min(window.innerHeight - top - 20, window.innerHeight * 0.72))

  return createPortal(
    <div className="structure-picker" style={{ left, top, width, maxHeight }} ref={panelRef}>
      <div className="sp-scroll">
        {GROUPS.map((group) => {
          const items = group.keys.filter((key) => STRUCTURE_LIST.some((item) => item.key === key))
          if (!items.length) return null
          return (
            <section key={group.label} className="sp-group">
              <h4>{group.label}</h4>
              <div className="sp-grid">
                {items.map((key) => (
                  <button
                    key={key}
                    className={`sp-card ${key === current ? 'active' : ''}`}
                    title={STRUCTURES[key].label.zh}
                    onClick={() => onSelect(key)}
                  >
                    <StructureThumb structureKey={key} />
                  </button>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>,
    document.body
  )
}
