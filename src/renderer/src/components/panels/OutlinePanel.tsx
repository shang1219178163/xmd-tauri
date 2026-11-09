import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Topic } from '@shared/types'
import { attachedOf, flattenTopics } from '../../model/tree'
import { useMapStore } from '../../store/mapStore'

function OutlineRow({
  topic,
  depth,
  expanded,
  toggle
}: {
  topic: Topic
  depth: number
  expanded: Set<string>
  toggle: (id: string) => void
}) {
  const activeTopicId = useMapStore((s) => s.activeTopicId)
  const selection = useMapStore((s) => s.selection)
  const select = useMapStore((s) => s.select)
  const beginEdit = useMapStore((s) => s.beginEdit)
  const children = attachedOf(topic)
  const isOpen = expanded.has(topic.id)
  const active = activeTopicId === topic.id || selection.includes(topic.id)
  return (
    <>
      <div
        className={`outline-row ${active ? 'active' : ''}`}
        style={{ paddingLeft: 4 + depth * 14 }}
        onClick={() => select([topic.id], false)}
        onDoubleClick={() => beginEdit(topic.id)}
      >
        <span
          className="outline-caret"
          onClick={(event) => {
            event.stopPropagation()
            if (children.length) toggle(topic.id)
          }}
        >
          {children.length ? isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} /> : null}
        </span>
        <span className="outline-text">{topic.title || '未命名主题'}</span>
        {topic.notes?.plain?.content ? <span className="outline-badge">✎</span> : null}
        {(topic.markers?.length ?? 0) > 0 ? <span className="outline-badge">⚑{topic.markers?.length}</span> : null}
        {children.length ? <span className="outline-badge">{children.length}</span> : null}
      </div>
      {isOpen
        ? children.map((child) => (
            <OutlineRow key={child.id} topic={child} depth={depth + 1} expanded={expanded} toggle={toggle} />
          ))
        : null}
    </>
  )
}

export default function OutlinePanel() {
  const sheet = useMapStore((s) => s.getActiveSheet())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    const ids = new Set<string>()
    for (const topic of flattenTopics(sheet.rootTopic)) {
      if (attachedOf(topic).length) ids.add(topic.id)
    }
    setExpanded(ids)
  }, [sheet.id, sheet.rootTopic])

  const toggle = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div>
      <section className="panel-section" style={{ borderBottom: 'none' }}>
        <h3 className="panel-title">
          大纲
          <span className="hint">双击编辑</span>
        </h3>
        <div className="outline-tree">
          <OutlineRow topic={sheet.rootTopic} depth={0} expanded={expanded} toggle={toggle} />
        </div>
      </section>
    </div>
  )
}
