import { useEffect, useMemo, useRef, useState } from 'react'
import type { Topic } from '@shared/types'
import { attachedOf } from '../model/tree'
import { useMapStore } from '../store/mapStore'
import { useUiStore } from '../store/uiStore'

interface OutlineRow {
  topic: Topic
  depth: number
}

function collectRows(topic: Topic, depth: number, rows: OutlineRow[]): void {
  for (const child of attachedOf(topic)) {
    rows.push({ topic: child, depth })
    collectRows(child, depth + 1, rows)
  }
  // Floating topics stay visible in the outline as well.
  for (const child of topic.children?.detached ?? []) {
    rows.push({ topic: child, depth })
    collectRows(child, depth + 1, rows)
  }
}

function focusById(id: string, selectAll = false): void {
  const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-outline-id]'))
  const element = elements.find((item) => item.dataset.outlineId === id)
  if (!element) return
  element.focus()
  const range = document.createRange()
  range.selectNodeContents(element)
  if (!selectAll) range.collapse(false)
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
}

function Editable({
  id,
  title,
  className,
  onFocus,
  onBlur,
  onInput,
  onKeyDown
}: {
  id: string
  title: string
  className: string
  onFocus: () => void
  onBlur: () => void
  onInput: (text: string) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (document.activeElement !== element && element.textContent !== title) {
      element.textContent = title
    }
  }, [title])

  return (
    <div
      ref={ref}
      className={className}
      data-outline-id={id}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onFocus={onFocus}
      onBlur={onBlur}
      onInput={(event) => onInput(event.currentTarget.textContent ?? '')}
      onKeyDown={onKeyDown}
    />
  )
}

export default function OutlineView() {
  const sheet = useMapStore((s) => s.getActiveSheet())
  const activeTopicId = useMapStore((s) => s.activeTopicId)
  const select = useMapStore((s) => s.select)
  const updateTopic = useMapStore((s) => s.updateTopic)
  const addChild = useMapStore((s) => s.addChild)
  const addSibling = useMapStore((s) => s.addSibling)
  const deleteSelection = useMapStore((s) => s.deleteSelection)
  const indentTopic = useMapStore((s) => s.indentTopic)
  const outdentTopic = useMapStore((s) => s.outdentTopic)
  const beginTransaction = useMapStore((s) => s.beginTransaction)
  const endTransaction = useMapStore((s) => s.endTransaction)
  const setOutlineMode = useUiStore((s) => s.setOutlineMode)

  const [focusRequest, setFocusRequest] = useState<{ id: string; seq: number; selectAll: boolean } | null>(null)
  const sequence = useRef(0)
  const root = sheet.rootTopic

  const rows = useMemo(() => {
    const collected: OutlineRow[] = []
    collectRows(root, 1, collected)
    return collected
  }, [root])

  const focus = (id: string, selectAll = false) => {
    sequence.current += 1
    setFocusRequest({ id, seq: sequence.current, selectAll })
  }

  useEffect(() => {
    if (!focusRequest) return
    focusById(focusRequest.id, focusRequest.selectAll)
  }, [focusRequest])

  useEffect(() => {
    useMapStore.setState({ editingTopicId: undefined, editingDraft: '' })
    const timer = window.setTimeout(() => focusById(root.id), 80)
    const focusNew = (event: Event) => {
      const id = (event as CustomEvent<string>).detail
      if (id) focus(id, true)
    }
    window.addEventListener('xmind:outline-focus', focusNew)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('xmind:outline-focus', focusNew)
      useMapStore.getState().endTransaction()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet.id])

  const startEditing = (id: string) => {
    select([id], false)
    beginTransaction()
  }

  const stopEditing = () => {
    endTransaction()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, id: string, isRoot: boolean) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return
    if (event.key === 'Escape') {
      event.preventDefault()
      event.currentTarget.blur()
      setOutlineMode(false)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const next = isRoot ? addChild(id) : addSibling(id)
      if (next) {
        useMapStore.setState({ editingTopicId: undefined, editingDraft: '' })
        focus(next, true)
      }
      return
    }
    if (event.key === 'Tab') {
      event.preventDefault()
      if (event.shiftKey) outdentTopic(id)
      else indentTopic(id)
      focus(id)
      return
    }
    if (event.key === 'Backspace') {
      const text = event.currentTarget.textContent ?? ''
      if (!text.trim() && !isRoot) {
        event.preventDefault()
        const index = rows.findIndex((row) => row.topic.id === id)
        const previous = index > 0 ? rows[index - 1].topic.id : root.id
        select([id], false)
        deleteSelection()
        focus(previous)
      }
    }
  }

  return (
    <div className="outline-page">
      <div className="outline-heading-row">
        <div className="outline-content">
          <Editable
            id={root.id}
            title={root.title}
            className={`outline-heading ${activeTopicId === root.id ? 'active' : ''}`}
            onFocus={() => startEditing(root.id)}
            onBlur={stopEditing}
            onInput={(text) => updateTopic(root.id, { title: text }, false)}
            onKeyDown={(event) => handleKeyDown(event, root.id, true)}
          />
        </div>
      </div>
      <div className="outline-content">
        <div className="outline-list">
          {rows.map((row) => (
            <div
              key={row.topic.id}
              className={`outline-item ${activeTopicId === row.topic.id ? 'active' : ''}`}
              style={{ paddingLeft: (row.depth - 1) * 28 }}
              onClick={() => select([row.topic.id], false)}
            >
              <span className={`outline-dot ${row.depth > 2 ? 'hollow' : ''}`} />
              <Editable
                id={row.topic.id}
                title={row.topic.title}
                className="outline-text"
                onFocus={() => startEditing(row.topic.id)}
                onBlur={stopEditing}
                onInput={(text) => updateTopic(row.topic.id, { title: text }, false)}
                onKeyDown={(event) => handleKeyDown(event, row.topic.id, false)}
              />
              {row.topic.notes?.plain?.content ? <span className="outline-note-dot" title="有备注">✎</span> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
