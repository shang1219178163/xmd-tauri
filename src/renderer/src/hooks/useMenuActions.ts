import { useEffect } from 'react'
import { runAction } from '../actions'

export function useMenuActions(): void {
  useEffect(() => {
    if (!window.desktop) return
    const cleanup = window.desktop.onMenuAction((action) => {
      runAction(action)
    })
    return cleanup
  }, [])
}
