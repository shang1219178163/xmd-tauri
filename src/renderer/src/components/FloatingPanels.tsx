import { X } from 'lucide-react'
import { useUiStore } from '../store/uiStore'
import MarkerPanel from './panels/MarkerPanel'
import NavigatorPanel from './panels/NavigatorPanel'
import NotesPanel from './panels/NotesPanel'
import OutlinePanel from './panels/OutlinePanel'
import SearchPanel from './panels/SearchPanel'

const TITLES: Record<string, string> = {
  markers: '标记与标签',
  notes: '备注',
  search: '搜索',
  outline: '大纲',
  navigator: '导航'
}

export default function FloatingPanels() {
  const popover = useUiStore((s) => s.popover)
  const setPopover = useUiStore((s) => s.setPopover)
  const outlineMode = useUiStore((s) => s.outlineMode)
  if (!popover) return null

  return (
    <div className={`floating-panel ${popover} ${outlineMode ? 'outline-mode' : ''}`}>
      <div className="floating-head">
        <span>{TITLES[popover]}</span>
        <button className="icon-btn" onClick={() => setPopover(null)} title="关闭">
          <X size={15} />
        </button>
      </div>
      <div className="floating-body">
        {popover === 'markers' ? <MarkerPanel /> : null}
        {popover === 'notes' ? <NotesPanel /> : null}
        {popover === 'search' ? <SearchPanel /> : null}
        {popover === 'outline' ? <OutlinePanel /> : null}
        {popover === 'navigator' ? <NavigatorPanel /> : null}
      </div>
    </div>
  )
}
