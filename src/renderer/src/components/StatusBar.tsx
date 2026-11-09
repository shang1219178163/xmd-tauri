import { ChevronDown, ChevronUp, Waypoints } from 'lucide-react'
import { activeSheet, countTopics, flattenTopics } from '../model/tree'
import { useMapStore } from '../store/mapStore'
import { useUiStore } from '../store/uiStore'

export default function StatusBar() {
  const workbook = useMapStore((s) => s.workbook)
  const dirty = useMapStore((s) => s.dirty)
  const viewport = useMapStore((s) => s.viewport)
  const selection = useMapStore((s) => s.selection)
  const activeTopicId = useMapStore((s) => s.activeTopicId)
  const zoomBy = useMapStore((s) => s.zoomBy)
  const setOutlineMode = useUiStore((s) => s.setOutlineMode)
  const sheet = activeSheet(workbook)
  const topics = countTopics(sheet.rootTopic)
  const words = flattenTopics(sheet.rootTopic)
    .map((t) => (t.title ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
  const selected = selection.length || (activeTopicId ? 1 : 0)

  return (
    <footer className="statusbar">
      <span className="stat">{dirty ? '未保存' : '已保存'}</span>
      <span className="stat">{words.length} 字</span>
      <span className="status-spacer" />
      <span className="stat">
        <Waypoints size={13} />
        主题: {selected}/{topics}
      </span>
      <div className="zoom-control">
        <button title="放大" onClick={() => zoomBy(1.2)}>
          <ChevronUp size={12} />
        </button>
        <span className="zoom-value" title="适应画布" onClick={() => window.dispatchEvent(new CustomEvent('xmind:fit'))}>
          {Math.round(viewport.zoom * 100)}%
        </span>
        <button title="缩小" onClick={() => zoomBy(1 / 1.2)}>
          <ChevronDown size={12} />
        </button>
      </div>
      <button className="status-text-btn" onClick={() => setOutlineMode(true)}>
        大纲
      </button>
    </footer>
  )
}
