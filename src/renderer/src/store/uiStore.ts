import { create } from 'zustand'
import type { UserPitchConfig } from '@shared/types'
import { recordPitch } from '../data/userConfig'

export type PopoverType = 'markers' | 'notes' | 'search' | 'outline' | 'navigator' | null

export type PitchSettings = UserPitchConfig

export type DialogType =
  | 'template'
  | 'hyperlink'
  | 'label'
  | 'image'
  | 'attachment'
  | 'shortcuts'
  | 'about'
  | 'confirm-delete'
  | 'unsaved'
  | 'unsaved-switch'
  | 'export'
  | 'command'
  | 'relationship'
  | null

export interface Toast {
  id: number
  message: string
  tone: 'info' | 'success' | 'error'
}

export interface UiState {
  dialog: DialogType
  zen: boolean
  pitch: boolean
  relationshipFrom?: string
  toasts: Toast[]
  commandOpen: boolean
  exporting: boolean
  popover: PopoverType
  pitchSettings: PitchSettings
  outlineMode: boolean
  pendingReplace?: () => void

  openDialog(dialog: DialogType): void
  closeDialog(): void
  setPendingReplace(action?: () => void): void
  setZen(zen: boolean): void
  setPitch(pitch: boolean): void
  setRelationshipFrom(id?: string): void
  toast(message: string, tone?: Toast['tone']): void
  dismissToast(id: number): void
  setCommandOpen(open: boolean): void
  setExporting(exporting: boolean): void
  setPopover(popover: PopoverType): void
  setPitchSettings(patch: Partial<PitchSettings>): void
  setOutlineMode(open: boolean): void
}

let toastId = 0

export const useUiStore = create<UiState>((set, get) => ({
  dialog: null,
  zen: false,
  pitch: false,
  relationshipFrom: undefined,
  toasts: [],
  commandOpen: false,
  exporting: false,
  popover: null,
  pitchSettings: {
    aspect: 'auto',
    themeSlide: 'auto',
    listSlide: 'auto',
    mode: 'fade',
    layout: 'left',
    style: 'dark'
  },
  outlineMode: false,
  pendingReplace: undefined,

  openDialog(dialog) {
    set({ dialog })
  },
  closeDialog() {
    set({ dialog: null })
  },
  setPendingReplace(action) {
    set({ pendingReplace: action })
  },
  setZen(zen) {
    set({ zen })
  },
  setPitch(pitch) {
    set({ pitch })
  },
  setRelationshipFrom(id) {
    set({ relationshipFrom: id })
  },
  toast(message, tone = 'info') {
    toastId += 1
    const toast: Toast = { id: toastId, message, tone }
    set((state) => ({ toasts: [...state.toasts, toast] }))
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== toast.id) }))
    }, 3200)
  },
  dismissToast(id) {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },
  setCommandOpen(open) {
    set({ commandOpen: open })
  },
  setExporting(exporting) {
    set({ exporting })
  },
  setPopover(popover) {
    set({ popover })
  },
  setPitchSettings(patch) {
    const pitchSettings = { ...get().pitchSettings, ...patch }
    set({ pitchSettings })
    recordPitch(pitchSettings)
  },
  setOutlineMode(open) {
    set({ outlineMode: open, popover: open ? null : get().popover })
  }
}))
