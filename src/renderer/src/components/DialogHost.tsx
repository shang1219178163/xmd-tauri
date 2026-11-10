import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, FileImage, FileText, FileType2, ImagePlus, Paperclip, Plus, Sparkles, Trash2, X } from 'lucide-react'
import type { AttachmentRef, RecentFile } from '@shared/types'
import { TEMPLATES, type TemplateDef } from '../data/templates'
import { SHORTCUTS } from '../data/shortcuts'
import { dispatchFileAction } from '../actions'
import { useMapStore } from '../store/mapStore'
import { useUiStore } from '../store/uiStore'
import { runOrConfirm } from '../store/guard'
import AppLogo from './AppLogo'
import {
  addAttachmentFromDisk,
  insertImageFromClipboard,
  insertImageFromDisk,
  openAttachment,
  openWorkbookPath,
  saveCurrentWorkbook
} from '../hooks/useFileOps'

function Dialog({
  title,
  children,
  footer,
  wide,
  onClose
}: {
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  wide?: boolean
  onClose: () => void
}) {
  return (
    <div className="dialog-overlay" onMouseDown={onClose}>
      <div className={`dialog ${wide ? 'wide' : ''}`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="dialog-header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} title="关闭">
            <X size={15} />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
        {footer ? <div className="dialog-footer">{footer}</div> : null}
      </div>
    </div>
  )
}

function TemplateThumb({ template }: { template: TemplateDef }) {
  const accent = template.accent
  return (
    <div className="template-thumb" style={{ background: accent[0] ?? '#f8fafc' }}>
      <div className="tt-root" style={{ background: accent[1] ?? '#2563eb', opacity: 0.9 }} />
      <div className="tt-row">
        <span className="tt-chip" style={{ background: accent[2] ?? '#93c5fd' }} />
        <span className="tt-chip" style={{ background: accent[2] ?? '#93c5fd' }} />
        <span className="tt-chip" style={{ background: accent[2] ?? '#93c5fd' }} />
      </div>
      <div className="tt-row" style={{ width: '70%', margin: '0 auto' }}>
        <span className="tt-chip" style={{ background: accent[3] ?? '#dbeafe' }} />
        <span className="tt-chip" style={{ background: accent[3] ?? '#dbeafe' }} />
      </div>
    </div>
  )
}

const CATEGORY_LABELS: Record<string, string> = {
  planning: '规划',
  work: '工作',
  analysis: '分析',
  life: '生活',
  study: '学习',
  creative: '创意',
  personal: '个人',
  general: '通用'
}

function TemplateDialog({ onClose }: { onClose: () => void }) {
  const reset = useMapStore((s) => s.reset)
  const toast = useUiStore((s) => s.toast)
  const [category, setCategory] = useState('全部')
  const [recent, setRecent] = useState<RecentFile[]>([])
  const categories = useMemo(() => ['全部', ...Array.from(new Set(TEMPLATES.map((t) => t.category)))], [])
  const list = category === '全部' ? TEMPLATES : TEMPLATES.filter((t) => t.category === category)

  useEffect(() => {
    void window.desktop?.getRecentFiles().then((files) => setRecent(Array.isArray(files) ? files.slice(0, 5) : []))
  }, [])

  return (
    <Dialog title="从模板新建" wide onClose={onClose} footer={<button className="btn" onClick={onClose}>取消</button>}>
      {recent.length ? (
        <section style={{ marginBottom: 16 }}>
          <div className="panel-title" style={{ marginBottom: 6 }}>
            最近文件
          </div>
          <div className="search-results" style={{ marginTop: 0 }}>
            {recent.map((file) => (
              <button
                key={file.path}
                className="result-item"
                title={file.path}
                onClick={() => {
                  openWorkbookPath(file.path)
                  onClose()
                }}
              >
                <FileText size={13} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                <span className="crumb">{new Date(file.openedAt).toLocaleDateString()}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
      <div className="icon-row" style={{ marginBottom: 14 }}>
        {categories.map((item) => (
          <button key={item} className={`btn small ${category === item ? 'primary' : ''}`} onClick={() => setCategory(item)}>
            {item === '全部' ? '全部' : CATEGORY_LABELS[item] ?? item}
          </button>
        ))}
      </div>
      <div className="template-grid">
        {list.map((template) => (
          <button
            key={template.id}
            className="template-card"
            onClick={() => {
              const sheet = template.create()
              runOrConfirm(() => {
                reset({ sheets: [sheet], activeSheetId: sheet.id })
                window.setTimeout(() => window.dispatchEvent(new CustomEvent('xmind:fit')), 40)
                toast(`已创建模板：${template.name.zh}`, 'success')
                onClose()
              })
            }}
          >
            <TemplateThumb template={template} />
            <div className="template-meta">
              <div className="name">{template.name.zh}</div>
              <div className="desc">{template.description.zh}</div>
            </div>
          </button>
        ))}
      </div>
    </Dialog>
  )
}

function HyperlinkDialog({ onClose }: { onClose: () => void }) {
  const sheet = useMapStore((s) => s.getActiveSheet())
  const activeTopicId = useMapStore((s) => s.activeTopicId)
  const selection = useMapStore((s) => s.selection)
  const topic = useMapStore((s) => s.getTopic(activeTopicId ?? selection[0] ?? sheet.rootTopic.id))
  const setHyperlink = useMapStore((s) => s.setHyperlink)
  const [url, setUrl] = useState(topic?.hyperlink ?? '')
  const targetId = topic?.id ?? sheet.rootTopic.id

  return (
    <Dialog
      title="超链接"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost left" onClick={() => {
            setHyperlink(targetId, undefined)
            onClose()
          }}>
            移除链接
          </button>
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn primary" onClick={() => {
            setHyperlink(targetId, url.trim() || undefined)
            onClose()
          }}>
            保存
          </button>
        </>
      }
    >
      <div className="field">
        <label>链接地址</label>
        <input className="input" autoFocus placeholder="https://example.com" value={url} onChange={(event) => setUrl(event.target.value)} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>支持网页、邮件和本地文件路径。</div>
    </Dialog>
  )
}

function LabelDialog({ onClose }: { onClose: () => void }) {
  const sheet = useMapStore((s) => s.getActiveSheet())
  const activeTopicId = useMapStore((s) => s.activeTopicId)
  const selection = useMapStore((s) => s.selection)
  const topic = useMapStore((s) => s.getTopic(activeTopicId ?? selection[0] ?? sheet.rootTopic.id))
  const setLabels = useMapStore((s) => s.setLabels)
  const [text, setText] = useState((topic?.labels ?? []).join(', '))
  const targetId = topic?.id ?? sheet.rootTopic.id

  return (
    <Dialog
      title="标签"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn primary" onClick={() => {
            setLabels(targetId, text.split(',').map((s) => s.trim()).filter(Boolean))
            onClose()
          }}>
            应用
          </button>
        </>
      }
    >
      <div className="field">
        <label>用逗号分隔多个标签</label>
        <input className="input" autoFocus placeholder="重要, 待办, 想法" value={text} onChange={(event) => setText(event.target.value)} />
      </div>
    </Dialog>
  )
}

function ImageDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="插入图片" onClose={onClose} footer={<button className="btn" onClick={onClose}>取消</button>}>
      <div className="empty-state" style={{ paddingTop: 0 }}>
        将图片插入到当前主题。图片会嵌入思维导图文件。
      </div>
      <div className="icon-row" style={{ justifyContent: 'center' }}>
        <button className="btn primary" onClick={async () => {
          await insertImageFromDisk()
          onClose()
        }}>
          <ImagePlus size={14} />
          从文件选择
        </button>
        <button className="btn" onClick={async () => {
          await insertImageFromClipboard()
          onClose()
        }}>
          <FileImage size={14} />
          从剪贴板
        </button>
      </div>
    </Dialog>
  )
}

function AttachmentDialog({ onClose }: { onClose: () => void }) {
  const sheet = useMapStore((s) => s.getActiveSheet())
  const activeTopicId = useMapStore((s) => s.activeTopicId)
  const selection = useMapStore((s) => s.selection)
  const topic = useMapStore((s) => s.getTopic(activeTopicId ?? selection[0] ?? sheet.rootTopic.id))
  const setAttachments = useMapStore((s) => s.setAttachments)
  const targetId = topic?.id ?? sheet.rootTopic.id
  const attachments = topic?.attachments ?? []

  return (
    <Dialog
      title="附件"
      onClose={onClose}
      footer={
        <button className="btn" onClick={onClose}>关闭</button>
      }
    >
      <div className="search-results" style={{ marginTop: 0 }}>
        {attachments.map((item: AttachmentRef) => (
          <div key={`${item.name}-${item.path}`} className="result-item" style={{ cursor: 'default' }}>
            <Paperclip size={13} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.path}>
              {item.name}
            </span>
            <button
              className="icon-btn"
              title="打开"
              onClick={() => {
                void openAttachment(item).then((ok) => {
                  if (!ok) useUiStore.getState().toast('无法打开附件', 'error')
                })
              }}
            >
              <ExternalLink size={13} />
            </button>
            <button
              className="icon-btn"
              title="移除"
              onClick={() => setAttachments(targetId, attachments.filter((a) => a !== item))}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {!attachments.length ? <div className="empty-state">还没有附件</div> : null}
      </div>
      <div className="panel-row" style={{ marginTop: 10, justifyContent: 'center' }}>
        <button className="btn primary" onClick={async () => {
          await addAttachmentFromDisk()
        }}>
          <Plus size={14} />
          添加附件
        </button>
      </div>
    </Dialog>
  )
}

function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const language = useMapStore((s) => s.settings.language)
  return (
    <Dialog title="快捷键" wide onClose={onClose} footer={<button className="btn primary" onClick={onClose}>知道了</button>}>
      <div className="shortcut-list">
        {SHORTCUTS.map((item) => (
          <div key={`${item.keys}-${item.zh}`} className="shortcut-row">
            <span>{language === 'zh-CN' ? item.zh : item.en}</span>
            <code className="keys">{item.keys}</code>
          </div>
        ))}
      </div>
    </Dialog>
  )
}

function AboutDialog({ onClose }: { onClose: () => void }) {
  const [info, setInfo] = useState<{ platform: string; version: string } | null>(null)
  useEffect(() => {
    void window.desktop?.getAppInfo().then(setInfo)
  }, [])
  return (
    <Dialog title="关于 xmd" onClose={onClose}>
      <div style={{ textAlign: 'center', padding: '8px 0 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <AppLogo size={52} />
        </div>
        <div style={{ fontSize: 17, fontWeight: 700 }}>xmd</div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 4 }}>
          {info ? `v${info.version} · ${info.platform}` : '加载中…'}
        </div>
      </div>
      <p style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.7, textAlign: 'center' }}>
        一个完全离线、开源的思维导图应用。无登录、无订阅、无云依赖。所有数据保存在你自己的电脑上。
      </p>
    </Dialog>
  )
}

function UnsavedDialog({ onClose }: { onClose: () => void }) {
  const setDirty = useMapStore((s) => s.setDirty)
  return (
    <Dialog
      title="有未保存的修改"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost left" onClick={onClose}>取消</button>
          <button
            className="btn"
            onClick={() => {
              setDirty(false)
              window.desktop?.setDirty(false)
              window.desktop?.confirmClose()
            }}
          >
            不保存
          </button>
          <button
            className="btn primary"
            onClick={async () => {
              const ok = await saveCurrentWorkbook(false)
              if (!ok) return
              setDirty(false)
              window.desktop?.setDirty(false)
              window.desktop?.confirmClose()
            }}
          >
            保存
          </button>
        </>
      }
    >
      <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.7 }}>
        是否在关闭前保存当前文件？如果选择“不保存”，本次修改将丢失。
      </p>
    </Dialog>
  )
}

function UnsavedSwitchDialog({ onClose }: { onClose: () => void }) {
  const pendingReplace = useUiStore((s) => s.pendingReplace)
  const setPendingReplace = useUiStore((s) => s.setPendingReplace)

  const cancel = () => {
    setPendingReplace(undefined)
    onClose()
  }
  const proceed = () => {
    const action = pendingReplace
    setPendingReplace(undefined)
    onClose()
    action?.()
  }

  return (
    <Dialog
      title="有未保存的修改"
      onClose={cancel}
      footer={
        <>
          <button className="btn ghost left" onClick={cancel}>取消</button>
          <button className="btn" onClick={proceed}>不保存</button>
          <button
            className="btn primary"
            onClick={async () => {
              if (await saveCurrentWorkbook(false)) proceed()
            }}
          >
            保存
          </button>
        </>
      }
    >
      <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.7 }}>
        当前文件有未保存的修改。继续操作将丢弃这些修改，是否先保存？
      </p>
    </Dialog>
  )
}

function ExportDialog({ onClose }: { onClose: () => void }) {
  const options: Array<{ label: string; detail: string; action: string; icon: React.ReactNode }> = [
    { label: 'PNG 图片', detail: '2× 高清位图', action: 'export-png', icon: <FileImage size={16} /> },
    { label: 'SVG 矢量图', detail: '可无限缩放', action: 'export-svg', icon: <FileImage size={16} /> },
    { label: 'PDF 文档', detail: '适合打印与分享', action: 'export-pdf', icon: <FileType2 size={16} /> },
    { label: 'Markdown', detail: '标题与缩进列表', action: 'export-markdown', icon: <FileText size={16} /> },
    { label: '纯文本', detail: '纯缩进大纲', action: 'export-text', icon: <FileText size={16} /> },
    { label: 'Word (.docx)', detail: '标题层级文档', action: 'export-docx', icon: <FileText size={16} /> },
    { label: 'Excel (.xlsx)', detail: '主题表格', action: 'export-xlsx', icon: <FileText size={16} /> },
    { label: 'PowerPoint (.pptx)', detail: '每章一页幻灯片', action: 'export-pptx', icon: <Sparkles size={16} /> },
    { label: 'OPML', detail: '通用大纲格式', action: 'export-opml', icon: <FileText size={16} /> }
  ]
  return (
    <Dialog title="导出" onClose={onClose} footer={<button className="btn" onClick={onClose}>取消</button>}>
      <div className="search-results" style={{ marginTop: 0 }}>
        {options.map((option) => (
          <button
            key={option.action}
            className="result-item"
            style={{ padding: '10px 10px' }}
            onClick={() => {
              dispatchFileAction(option.action as never)
              onClose()
            }}
          >
            {option.icon}
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontWeight: 600, color: 'var(--ink)' }}>{option.label}</span>
              <span style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{option.detail}</span>
            </span>
          </button>
        ))}
      </div>
    </Dialog>
  )
}

export default function DialogHost() {
  const dialog = useUiStore((s) => s.dialog)
  const closeDialog = useUiStore((s) => s.closeDialog)

  if (!dialog) return null
  if (dialog === 'template') return <TemplateDialog onClose={closeDialog} />
  if (dialog === 'hyperlink') return <HyperlinkDialog onClose={closeDialog} />
  if (dialog === 'label') return <LabelDialog onClose={closeDialog} />
  if (dialog === 'image') return <ImageDialog onClose={closeDialog} />
  if (dialog === 'attachment') return <AttachmentDialog onClose={closeDialog} />
  if (dialog === 'shortcuts') return <ShortcutsDialog onClose={closeDialog} />
  if (dialog === 'about') return <AboutDialog onClose={closeDialog} />
  if (dialog === 'unsaved') return <UnsavedDialog onClose={closeDialog} />
  if (dialog === 'unsaved-switch') return <UnsavedSwitchDialog onClose={closeDialog} />
  if (dialog === 'export') return <ExportDialog onClose={closeDialog} />
  return null
}
