import { useEffect, useRef, useState } from 'react'
import { Moon, MoreHorizontal, Search, SlidersHorizontal, Sun } from 'lucide-react'
import { runAction } from '../actions'
import { useMapStore } from '../store/mapStore'
import { useUiStore } from '../store/uiStore'

export default function TitleBar() {
  const fileName = useMapStore((s) => s.fileName)
  const filePath = useMapStore((s) => s.filePath)
  const dirty = useMapStore((s) => s.dirty)
  const theme = useMapStore((s) => s.settings.theme)
  const language = useMapStore((s) => s.settings.language)
  const activePanel = useMapStore((s) => s.activePanel)
  const setActivePanel = useMapStore((s) => s.setActivePanel)
  const outlineMode = useUiStore((s) => s.outlineMode)
  const setSettings = useMapStore((s) => s.setSettings)
  const toast = useUiStore((s) => s.toast)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const isDark = theme === 'dark'
  const title = fileName.replace(/\.xmind$/i, '')

  useEffect(() => {
    if (!menuOpen) return
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [menuOpen])

  const toggleLanguage = () => {
    const next = language === 'zh-CN' ? 'en-US' : 'zh-CN'
    setSettings({ language: next })
    void window.desktop?.saveSettings({ language: next })
    void window.desktop?.setLanguage(next)
    toast(next === 'zh-CN' ? '菜单语言已切换为简体中文' : 'Menu language switched to English')
    setMenuOpen(false)
  }

  return (
    <header className="titlebar" data-tauri-drag-region>
      <div className="titlebar-left" data-tauri-drag-region>
        <span className="doc-title" title={filePath ?? fileName} data-tauri-drag-region>
          {title}
        </span>
        {dirty ? <span className="dirty-dot" title="未保存" /> : null}
      </div>
      <div className="titlebar-spacer" data-tauri-drag-region />
      <div className="titlebar-right">
        {!outlineMode ? (
          <button
            className={`icon-btn ${activePanel === 'style' ? 'active' : ''}`}
            title="格式面板"
            onClick={() => setActivePanel('style')}
          >
            <SlidersHorizontal size={17} />
          </button>
        ) : null}
        <div className="titlebar-menu-wrap" ref={menuRef}>
          <button className={`icon-btn ${menuOpen ? 'active' : ''}`} title="更多" onClick={() => setMenuOpen((open) => !open)}>
            <MoreHorizontal size={18} />
          </button>
          {menuOpen ? (
            <div className="titlebar-menu">
              <button className="insert-item" onClick={() => {
                setMenuOpen(false)
                runAction('search-panel')
              }}>
                <Search size={14} />
                搜索
              </button>
              <button className="insert-item" onClick={() => {
                setMenuOpen(false)
                runAction('export-dialog')
              }}>
                导出…
              </button>
              <button className="insert-item" onClick={toggleLanguage}>
                <span style={{ width: 14, textAlign: 'center', fontSize: 11, fontWeight: 600 }}>中</span>
                {language === 'zh-CN' ? '切换菜单语言为 English' : 'Switch menu language to 简体中文'}
              </button>
              <button className="insert-item" onClick={() => {
                setMenuOpen(false)
                runAction('toggle-dark')
              }}>
                {isDark ? <Sun size={14} /> : <Moon size={14} />}
                {isDark ? '切换浅色外观' : '切换深色外观'}
              </button>
              <div className="insert-sep" />
              <button className="insert-item" onClick={() => {
                setMenuOpen(false)
                runAction('shortcuts')
              }}>
                快捷键
              </button>
              <button className="insert-item" onClick={() => {
                setMenuOpen(false)
                runAction('about')
              }}>
                关于
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
