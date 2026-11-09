import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { MARKER_GROUPS } from '../../data/markers'
import { useMapStore } from '../../store/mapStore'

export default function MarkerPanel() {
  const sheet = useMapStore((s) => s.getActiveSheet())
  const activeTopicId = useMapStore((s) => s.activeTopicId)
  const selection = useMapStore((s) => s.selection)
  const toggleMarker = useMapStore((s) => s.toggleMarker)
  const setLabels = useMapStore((s) => s.setLabels)
  const targetId = activeTopicId ?? selection[0] ?? sheet.rootTopic.id
  const topic = useMapStore((s) => s.getTopic(targetId)) ?? sheet.rootTopic
  const targets = selection.length ? selection : [targetId]
  const [labelDraft, setLabelDraft] = useState((topic.labels ?? []).join(', '))

  useEffect(() => {
    setLabelDraft((topic.labels ?? []).join(', '))
  }, [topic.id, topic.labels])

  const hasMarker = (markerId: string) => (topic.markers ?? []).some((m) => m.markerId === markerId)

  const commitLabels = () => {
    for (const id of targets) setLabels(id, labelDraft.split(',').map((s) => s.trim()).filter(Boolean))
  }

  return (
    <div>
      <section className="panel-section">
        <h3 className="panel-title">
          标记
          <span className="hint">{topic.title || '未命名主题'}</span>
        </h3>
        {MARKER_GROUPS.map((group) => (
          <div key={group.id} className="marker-group">
            <div className="marker-group-title">{group.label.zh}</div>
            <div className="marker-grid">
              {group.markers.map((marker) => (
                <button
                  key={marker.id}
                  className={`marker-btn ${hasMarker(marker.id) ? 'active' : ''}`}
                  title={`${marker.label.zh} / ${marker.label.en}`}
                  onClick={() => {
                    for (const id of targets) toggleMarker(id, marker.id)
                  }}
                >
                  {marker.icon}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="panel-section" style={{ borderBottom: 'none' }}>
        <h3 className="panel-title">标签</h3>
        <input
          className="input"
          placeholder="用逗号分隔多个标签"
          value={labelDraft}
          onChange={(event) => setLabelDraft(event.target.value)}
          onBlur={commitLabels}
          onKeyDown={(event) => {
            event.stopPropagation()
            if (event.key === 'Enter') commitLabels()
          }}
        />
        {(topic.labels ?? []).length ? (
          <div className="icon-row" style={{ marginTop: 8 }}>
            {(topic.labels ?? []).map((label) => (
              <span key={label} className="btn small" style={{ borderRadius: 999 }}>
                {label}
                <button
                  title="移除标签"
                  onClick={() => setLabels(targetId, (topic.labels ?? []).filter((l) => l !== label))}
                  style={{ display: 'inline-flex', color: 'var(--ink-faint)' }}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '12px 0' }}>
            输入标签后按 Enter
          </div>
        )}
      </section>
    </div>
  )
}
