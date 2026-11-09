import { useUiStore } from '../store/uiStore'

export default function Toasts() {
  const toasts = useUiStore((s) => s.toasts)
  const dismiss = useUiStore((s) => s.dismissToast)
  if (!toasts.length) return null
  return (
    <div className="toasts">
      {toasts.map((toast) => (
        <button key={toast.id} className={`toast ${toast.tone}`} onClick={() => dismiss(toast.id)}>
          {toast.message}
        </button>
      ))}
    </div>
  )
}
