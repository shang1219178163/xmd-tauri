import { useEffect, useMemo, useState } from 'react'
import { flattenTopics } from '../../model/tree'
import { useMapStore } from '../../store/mapStore'

export default function NotesPanel() {
  const sheet = useMapStore((s) => s.getActiveSheet())
  const activeTopicId = useMapStore((s) => s.activeTopicId)
  const selection = useMapStore((s) => s.selection)
  const setNotes = useMapStore((s) => s.setNotes)
  const select = useMapStore((s) => s.select)
  const targetId = activeTopicId ?? selection[0] ?? sheet.rootTopic.id
  const topic = useMapStore((s) => (s.getTopic(targetId) ?? sheet.rootTopic))
  const [draft, setDraft] = useState('')

  useEffect(() => {
    setDraft(topic.notes?.plain?.content ?? '')
  }, [topic.id, topic.notes?.plain?.content])

  const noted = useMemo(
    () => flattenTopics(sheet.rootTopic).filter((t) => Boolean(t.notes?.plain?.content?.trim())),
    [sheet.rootTopic]
  )

  const commit = () => {
    setNotes(targetId, draft)
  }

  return (
    <div>
      <section className="panel-section">
        <h3 className="panel-title">
          备注
          <span className="hint">{topic.title || '未命名主题'}</span>
        </h3>
        <textarea
          className="textarea"
          style={{ minHeight: 150 }}
          placeholder="在这里输入备注…"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            event.stopPropagation()
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') commit()
          }}
        />
        <div className="panel-row between" style={{ marginTop: 6 }}>
          <span style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{draft.length} 字符 · ⌘Enter 保存</span>
          <button className="btn small primary" onClick={commit}>
            保存备注
          </button>
        </div>
      </section>

      <section className="panel-section" style={{ borderBottom: 'none' }}>
        <h3 className="panel-title">
          所有备注
          <span className="hint">{noted.length}</span>
        </h3>
        {noted.length ? (
          <div className="search-results">
            {noted.map((item) => (
              <button
                key={item.id}
                className="result-item"
                onClick={() => {
                  select([item.id], false)
                  window.dispatchEvent(new CustomEvent('xmind:center-topic', { detail: item.id }))
                }}
                title={item.notes?.plain?.content}
              >
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title || '未命名主题'}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state">还没有备注。选中主题后在上方输入。</div>
        )}
      </section>
    </div>
  )
}
