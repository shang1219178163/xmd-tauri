import { useEffect } from 'react'
import { Minimize2 } from 'lucide-react'
import Canvas from './components/Canvas'
import CommandPalette from './components/CommandPalette'
import DialogHost from './components/DialogHost'
import FloatingPanels from './components/FloatingPanels'
import Inspector from './components/Inspector'
import OutlineHeader from './components/OutlineHeader'
import OutlineStatusBar from './components/OutlineStatusBar'
import OutlineView from './components/OutlineView'
import PitchMode from './components/PitchMode'
import SheetBar from './components/SheetBar'
import StatusBar from './components/StatusBar'
import Toasts from './components/Toasts'
import Toolbar from './components/Toolbar'
import TitleBar from './components/TitleBar'
import { useFileOps } from './hooks/useFileOps'
import { useKeyboard } from './hooks/useKeyboard'
import { useMenuActions } from './hooks/useMenuActions'
import { applyTheme } from './actions'
import { markReady } from './desktop'
import { useMapStore } from './store/mapStore'
import { useUiStore } from './store/uiStore'

export default function App(): React.ReactElement {
  const zen = useUiStore((s) => s.zen)
  const pitch = useUiStore((s) => s.pitch)
  const outlineMode = useUiStore((s) => s.outlineMode)
  const setZen = useUiStore((s) => s.setZen)
  const fileName = useMapStore((s) => s.fileName)
  const dirty = useMapStore((s) => s.dirty)
  const sheetCount = useMapStore((s) => s.workbook.sheets.length)
  const theme = useMapStore((s) => s.settings.theme)
  const setSettings = useMapStore((s) => s.setSettings)

  useKeyboard()
  useMenuActions()
  useFileOps()

  useEffect(() => {
    let cancelled = false
    void window.desktop?.getSettings().then((settings) => {
      if (cancelled) return
      setSettings(settings)
      applyTheme()
      if (settings.language) void window.desktop?.setLanguage(settings.language)
    })
    applyTheme()
    return () => {
      cancelled = true
    }
  }, [setSettings])

  useEffect(() => {
    applyTheme()
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme()
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [theme])

  useEffect(() => {
    document.title = `${dirty ? '• ' : ''}${fileName} — xmd`
    window.desktop?.setDirty(dirty)
  }, [fileName, dirty])

  useEffect(() => {
    const cleanup = window.desktop?.onRequestClose(() => {
      useUiStore.getState().openDialog('unsaved')
    })
    return cleanup
  }, [])

  // Listeners for menu actions / file-open events are registered by the hooks
  // above; tell the desktop host this window can now receive live events.
  useEffect(() => {
    markReady()
  }, [])

  return (
    <>
      <div className={`app ${zen ? 'zen' : ''} ${outlineMode ? 'outline-mode' : ''}`}>
        {outlineMode ? (
          <>
            <OutlineHeader />
            <OutlineView />
            <OutlineStatusBar />
          </>
        ) : (
          <>
            <TitleBar />
            <Toolbar />
            {sheetCount > 1 ? <SheetBar /> : null}
            <div className="workspace">
              <Canvas />
              <Inspector />
            </div>
            <StatusBar />
          </>
        )}
      </div>

      {zen ? (
        <button className="zen-exit" onClick={() => setZen(false)} title="退出 ZEN 模式">
          <Minimize2 size={13} />
          退出 ZEN
        </button>
      ) : null}

      {pitch ? <PitchMode /> : null}
      <FloatingPanels />
      <DialogHost />
      <CommandPalette />
      <Toasts />
    </>
  )
}
