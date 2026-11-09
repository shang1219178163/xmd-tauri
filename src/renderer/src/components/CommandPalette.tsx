import { useEffect, useMemo, useRef, useState } from 'react'
import { useUiStore } from '../store/uiStore'
import { runAction } from '../actions'

interface Command {
  id: string
  label: string
  action: string
  shortcut?: string
  keywords?: string
}

const COMMANDS: Command[] = [
  { id: 'new-map', label: '新建空白图', action: 'new-map', shortcut: '⌘N', keywords: 'new blank' },
  { id: 'new-starter', label: '新建示例图', action: 'new-starter', shortcut: '⇧⌘N', keywords: 'starter demo' },
  { id: 'new-template', label: '从模板新建', action: 'new-template', shortcut: '⌘T', keywords: 'template' },
  { id: 'open', label: '打开文件', action: 'open', shortcut: '⌘O', keywords: 'open' },
  { id: 'save', label: '保存', action: 'save', shortcut: '⌘S', keywords: 'save' },
  { id: 'save-as', label: '另存为', action: 'save-as', shortcut: '⇧⌘S', keywords: 'save as' },
  { id: 'export-dialog', label: '导出…', action: 'export-dialog', keywords: 'export dialog' },
  { id: 'export-png', label: '导出为 PNG', action: 'export-png', shortcut: '⇧⌘E', keywords: 'export image png' },
  { id: 'export-pdf', label: '导出为 PDF', action: 'export-pdf', keywords: 'export pdf' },
  { id: 'export-markdown', label: '导出为 Markdown', action: 'export-markdown', keywords: 'export markdown' },
  { id: 'insert-topic', label: '插入子主题', action: 'insert-topic', shortcut: 'Tab', keywords: 'child topic' },
  { id: 'insert-sibling', label: '插入同级主题', action: 'insert-sibling', shortcut: 'Enter', keywords: 'sibling topic' },
  { id: 'insert-floating', label: '插入自由主题', action: 'insert-floating', keywords: 'floating' },
  { id: 'insert-note', label: '添加备注', action: 'insert-note', shortcut: '⇧⌘K', keywords: 'note' },
  { id: 'insert-label', label: '添加标签', action: 'insert-label', keywords: 'label tag' },
  { id: 'insert-marker', label: '添加标记', action: 'insert-marker', keywords: 'marker icon' },
  { id: 'insert-relationship', label: '添加关系线', action: 'insert-relationship', keywords: 'relationship' },
  { id: 'insert-boundary', label: '添加边界', action: 'insert-boundary', keywords: 'boundary' },
  { id: 'insert-summary', label: '添加摘要', action: 'insert-summary', keywords: 'summary' },
  { id: 'insert-image', label: '插入图片', action: 'insert-image', keywords: 'image picture' },
  { id: 'insert-attachment', label: '插入附件', action: 'insert-attachment', keywords: 'attachment file' },
  { id: 'copy-style', label: '复制样式', action: 'copy-style', keywords: 'copy style format' },
  { id: 'paste-style', label: '粘贴样式', action: 'paste-style', keywords: 'paste style format' },
  { id: 'theme-panel', label: '打开主题面板', action: 'theme-panel', shortcut: '⇧⌘T', keywords: 'theme' },
  { id: 'format-panel', label: '打开格式面板', action: 'format-panel', shortcut: '⇧⌘F', keywords: 'format style' },
  { id: 'outline-panel', label: '打开大纲视图', action: 'outline-panel', shortcut: '⇧⌘O', keywords: 'outline' },
  { id: 'outline-tree', label: '打开大纲面板', action: 'outline-tree', keywords: 'outline tree panel' },
  { id: 'search-panel', label: '搜索主题', action: 'search-panel', shortcut: '⌘F', keywords: 'search find' },
  { id: 'fit', label: '适应画布', action: 'fit', shortcut: '⇧⌘H', keywords: 'fit center' },
  { id: 'zen', label: '进入 ZEN 专注模式', action: 'zen', keywords: 'zen focus' },
  { id: 'pitch', label: '进入演示模式', action: 'pitch', shortcut: '⇧⌘P', keywords: 'pitch present' },
  { id: 'toggle-dark', label: '切换深色外观', action: 'toggle-dark', keywords: 'dark light theme' },
  { id: 'shortcuts', label: '查看快捷键', action: 'shortcuts', shortcut: '/', keywords: 'shortcut help' },
  { id: 'about', label: '关于 xmd', action: 'about', keywords: 'about version' }
]

export default function CommandPalette() {
  const open = useUiStore((s) => s.commandOpen)
  const setOpen = useUiStore((s) => s.setCommandOpen)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COMMANDS
    return COMMANDS.filter((command) => `${command.label} ${command.keywords ?? ''}`.toLowerCase().includes(q))
  }, [query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setIndex(0)
      window.setTimeout(() => inputRef.current?.focus(), 20)
    }
  }, [open])

  useEffect(() => {
    setIndex(0)
  }, [query])

  if (!open) return null

  const execute = (command: Command | undefined) => {
    if (!command) return
    setOpen(false)
    runAction(command.action)
  }

  return (
    <div className="command-overlay" onMouseDown={() => setOpen(false)}>
      <div className="command-box" onMouseDown={(event) => event.stopPropagation()}>
        <input
          ref={inputRef}
          className="command-input"
          placeholder="输入命令…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            event.stopPropagation()
            if (event.key === 'Escape') setOpen(false)
            else if (event.key === 'ArrowDown') {
              event.preventDefault()
              setIndex((current) => Math.min(list.length - 1, current + 1))
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setIndex((current) => Math.max(0, current - 1))
            } else if (event.key === 'Enter') {
              event.preventDefault()
              execute(list[index])
            }
          }}
        />
        <div className="command-list">
          {list.map((command, itemIndex) => (
            <button
              key={command.id}
              className={`command-item ${itemIndex === index ? 'active' : ''}`}
              onMouseEnter={() => setIndex(itemIndex)}
              onClick={() => execute(command)}
            >
              <span>{command.label}</span>
              {command.shortcut ? <span className="shortcut">{command.shortcut}</span> : null}
            </button>
          ))}
          {!list.length ? <div className="empty-state">没有匹配的命令</div> : null}
        </div>
      </div>
    </div>
  )
}
