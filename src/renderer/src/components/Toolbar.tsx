import { useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  FileText,
  Flag,
  Focus,
  GitBranch,
  Image,
  LayoutTemplate,
  Link2,
  ListPlus,
  ListTree,
  Paperclip,
  Play,
  Plus,
  Spline,
  SquareDashed,
  SquarePlus,
  StickyNote,
  Tag,
  Upload
} from 'lucide-react'
import { runAction } from '../actions'
import { useMapStore } from '../store/mapStore'
import { useUiStore } from '../store/uiStore'

function BarButton({
  icon,
  label,
  title,
  onClick,
  active
}: {
  icon: React.ReactNode
  label: string
  title?: string
  onClick: () => void
  active?: boolean
}) {
  return (
    <button className={`toolbar-btn ${active ? 'active' : ''}`} title={title ?? label} onClick={onClick}>
      <span className="toolbar-icon">{icon}</span>
      <span className="label">{label}</span>
    </button>
  )
}

function MenuItem({
  icon,
  label,
  onClick
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button className="insert-item" onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  )
}

export default function Toolbar() {
  const ui = useUiStore()
  const [insertOpen, setInsertOpen] = useState(false)
  const insertRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!insertOpen) return
    const close = (event: MouseEvent) => {
      if (!insertRef.current?.contains(event.target as Node)) setInsertOpen(false)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [insertOpen])

  const run = (action: string) => {
    setInsertOpen(false)
    runAction(action)
  }

  return (
    <div className="toolbar">
      <div className="toolbar-center">
        <BarButton icon={<ListPlus size={21} />} label="主题" title="插入同级主题 (Enter)" onClick={() => run('insert-sibling')} />
        <BarButton icon={<GitBranch size={21} />} label="子主题" title="插入子主题 (Tab)" onClick={() => run('insert-topic')} />
        <BarButton icon={<Spline size={21} />} label="联系" title="插入关系线" onClick={() => {
          setInsertOpen(false)
          runAction('insert-relationship')
        }} />
        <BarButton icon={<ListTree size={21} />} label="概要" title="插入摘要" onClick={() => run('insert-summary')} />
        <BarButton icon={<SquareDashed size={21} />} label="外框" title="插入边界" onClick={() => run('insert-boundary')} />
        <BarButton
          icon={<Flag size={21} />}
          label="标记"
          title="标记与贴纸"
          active={ui.popover === 'markers'}
          onClick={() => {
            setInsertOpen(false)
            ui.setPopover(ui.popover === 'markers' ? null : 'markers')
          }}
        />

        <div className="insert-wrap" ref={insertRef}>
          <BarButton
            icon={
              <span className="icon-stack">
                <Plus size={21} />
                <ChevronDown size={10} />
              </span>
            }
            label="插入"
            title="插入更多元素"
            active={insertOpen}
            onClick={() => setInsertOpen((open) => !open)}
          />
          {insertOpen ? (
            <div className="insert-menu">
              <MenuItem icon={<FileText size={15} />} label="备注" onClick={() => {
                setInsertOpen(false)
                useUiStore.getState().setPopover('notes')
              }} />
              <MenuItem icon={<Tag size={15} />} label="标签" onClick={() => {
                setInsertOpen(false)
                useUiStore.getState().openDialog('label')
              }} />
              <MenuItem icon={<Link2 size={15} />} label="超链接" onClick={() => {
                setInsertOpen(false)
                useUiStore.getState().openDialog('hyperlink')
              }} />
              <MenuItem icon={<Image size={15} />} label="图片" onClick={() => {
                setInsertOpen(false)
                useUiStore.getState().openDialog('image')
              }} />
              <MenuItem icon={<Paperclip size={15} />} label="附件" onClick={() => {
                setInsertOpen(false)
                useUiStore.getState().openDialog('attachment')
              }} />
              <div className="insert-sep" />
              <MenuItem icon={<StickyNote size={15} />} label="自由主题" onClick={() => run('insert-floating')} />
              <MenuItem icon={<Spline size={15} />} label="关系线" onClick={() => run('insert-relationship')} />
              <MenuItem icon={<SquareDashed size={15} />} label="边界" onClick={() => run('insert-boundary')} />
              <MenuItem icon={<ListTree size={15} />} label="摘要" onClick={() => run('insert-summary')} />
              <div className="insert-sep" />
              <MenuItem icon={<SquarePlus size={15} />} label="新建画布" onClick={() => {
                setInsertOpen(false)
                useMapStore.getState().addSheet()
              }} />
              <MenuItem icon={<LayoutTemplate size={15} />} label="从模板新建" onClick={() => run('new-template')} />
              <div className="insert-sep" />
              <MenuItem icon={<Upload size={15} />} label="导入 Markdown" onClick={() => run('import-markdown')} />
              <MenuItem icon={<Upload size={15} />} label="导入 OPML" onClick={() => run('import-opml')} />
              <MenuItem icon={<Upload size={15} />} label="导入 Word" onClick={() => run('import-word')} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="toolbar-actions">
        <BarButton icon={<Focus size={21} />} label="ZEN" title="ZEN 专注模式" onClick={() => run('zen')} />
        <BarButton icon={<Play size={21} />} label="演播" title="演示模式 (⇧⌘P)" onClick={() => run('pitch')} />
      </div>
    </div>
  )
}
