import { useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  Flag,
  GitBranch,
  IndentDecrease,
  IndentIncrease,
  ListPlus,
  MoreHorizontal,
  Plus,
  StickyNote,
  Tag,
  Trash2
} from 'lucide-react'
import { runAction } from '../actions'
import { useMapStore } from '../store/mapStore'
import { useUiStore } from '../store/uiStore'

function HeaderButton({
  icon,
  label,
  onClick,
  active,
  title
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
  title?: string
}) {
  return (
    <button className={`toolbar-btn ${active ? 'active' : ''}`} title={title ?? label} onClick={onClick}>
      <span className="toolbar-icon">{icon}</span>
      <span className="label">{label}</span>
    </button>
  )
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className="insert-item" onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  )
}

export default function OutlineHeader() {
  const fileName = useMapStore((s) => s.fileName)
  const filePath = useMapStore((s) => s.filePath)
  const dirty = useMapStore((s) => s.dirty)
  const activeTopicId = useMapStore((s) => s.activeTopicId)
  const indentTopic = useMapStore((s) => s.indentTopic)
  const outdentTopic = useMapStore((s) => s.outdentTopic)
  const addChild = useMapStore((s) => s.addChild)
  const addSibling = useMapStore((s) => s.addSibling)
  const select = useMapStore((s) => s.select)
  const deleteSelection = useMapStore((s) => s.deleteSelection)
  const ui = useUiStore()
  const [insertOpen, setInsertOpen] = useState(false)
  const insertRef = useRef<HTMLDivElement>(null)
  const title = fileName.replace(/\.xmind$/i, '')

  useEffect(() => {
    if (!insertOpen) return
    const close = (event: MouseEvent) => {
      if (!insertRef.current?.contains(event.target as Node)) setInsertOpen(false)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [insertOpen])

  const target = activeTopicId ?? useMapStore.getState().getActiveSheet().rootTopic.id

  const addTopic = (kind: 'child' | 'sibling') => {
    const id = kind === 'child' ? addChild(target) : addSibling(target)
    if (!id) return
    useMapStore.setState({ editingTopicId: undefined, editingDraft: '' })
    window.dispatchEvent(new CustomEvent('xmind:outline-focus', { detail: id }))
  }

  return (
    <header className="outline-header" data-tauri-drag-region>
      <div className="outline-header-title" data-tauri-drag-region>
        <span className="doc-title" title={filePath ?? fileName} data-tauri-drag-region>
          {title}
        </span>
        {dirty ? <span className="dirty-dot" title="未保存" /> : null}
      </div>

      <div className="toolbar-center">
        <HeaderButton
          icon={<IndentIncrease size={21} />}
          label="缩进"
          title="增加缩进 (Tab)"
          onClick={() => {
            setInsertOpen(false)
            indentTopic(target)
          }}
        />
        <HeaderButton
          icon={<IndentDecrease size={21} />}
          label="减少缩进"
          title="减少缩进 (Shift+Tab)"
          onClick={() => {
            setInsertOpen(false)
            outdentTopic(target)
          }}
        />
        <div className="insert-wrap" ref={insertRef}>
          <HeaderButton
            icon={
              <span className="icon-stack">
                <Plus size={21} />
                <ChevronDown size={10} />
              </span>
            }
            label="插入"
            active={insertOpen}
            onClick={() => setInsertOpen((open) => !open)}
          />
          {insertOpen ? (
            <div className="insert-menu">
              <MenuItem
                icon={<GitBranch size={15} />}
                label="子主题"
                onClick={() => {
                  setInsertOpen(false)
                  addTopic('child')
                }}
              />
              <MenuItem
                icon={<ListPlus size={15} />}
                label="同级主题"
                onClick={() => {
                  setInsertOpen(false)
                  addTopic('sibling')
                }}
              />
              <div className="insert-sep" />
              <MenuItem
                icon={<StickyNote size={15} />}
                label="备注"
                onClick={() => {
                  setInsertOpen(false)
                  ui.setPopover('notes')
                }}
              />
              <MenuItem
                icon={<Tag size={15} />}
                label="标签"
                onClick={() => {
                  setInsertOpen(false)
                  ui.openDialog('label')
                }}
              />
              <div className="insert-sep" />
              <MenuItem
                icon={<Trash2 size={15} />}
                label="删除主题"
                onClick={() => {
                  setInsertOpen(false)
                  select([target], false)
                  deleteSelection()
                }}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="outline-header-actions">
        <HeaderButton
          icon={<Flag size={21} />}
          label="标记"
          title="标记与标签"
          active={ui.popover === 'markers'}
          onClick={() => ui.setPopover(ui.popover === 'markers' ? null : 'markers')}
        />
        <button className="icon-btn" title="更多" onClick={() => runAction('command')}>
          <MoreHorizontal size={18} />
        </button>
      </div>
    </header>
  )
}
