import { ChevronDown, ChevronUp } from 'lucide-react'
import { flattenTopics } from '../model/tree'
import { useMapStore } from '../store/mapStore'
import { useUiStore } from '../store/uiStore'

export default function OutlineStatusBar() {
  const sheet = useMapStore((s) => s.getActiveSheet())
  const dirty = useMapStore((s) => s.dirty)
  const setOutlineMode = useUiStore((s) => s.setOutlineMode)
  const words = flattenTopics(sheet.rootTopic)
    .map((topic) => (topic.title ?? '').trim())
    .join('')
    .replace(/\s+/g, '')

  return (
    <footer className="statusbar outline-statusbar">
      <span className="stat">{dirty ? '未保存' : '已保存'}</span>
      <span className="status-spacer" />
      <span className="stat">字数: {words.length}</span>
      <div className="zoom-control">
        <button title="放大" disabled>
          <ChevronUp size={12} />
        </button>
        <span className="zoom-value">100%</span>
        <button title="缩小" disabled>
          <ChevronDown size={12} />
        </button>
      </div>
      <button className="status-text-btn" onClick={() => setOutlineMode(false)}>
        思维导图
      </button>
    </footer>
  )
}
