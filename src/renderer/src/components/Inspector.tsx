import { useMapStore, type PanelKey } from '../store/mapStore'
import CanvasPanel from './panels/ThemePanel'
import PitchPanel from './panels/PitchPanel'
import StylePanel from './panels/FormatPanel'

const TABS: Array<{ key: PanelKey; label: string }> = [
  { key: 'style', label: '样式' },
  { key: 'present', label: '演播' },
  { key: 'canvas', label: '画布' }
]

export default function Inspector() {
  const active = useMapStore((s) => s.activePanel)
  const setActivePanel = useMapStore((s) => s.setActivePanel)
  const current = TABS.some((tab) => tab.key === active) ? active : 'canvas'

  return (
    <aside className="inspector">
      <div className="inspector-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`inspector-tab ${current === tab.key ? 'active' : ''}`}
            onClick={() => setActivePanel(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="inspector-body">
        {current === 'style' ? <StylePanel /> : null}
        {current === 'present' ? <PitchPanel /> : null}
        {current === 'canvas' ? <CanvasPanel /> : null}
      </div>
    </aside>
  )
}
