import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useMapStore } from '../store/mapStore'

export default function SheetBar() {
  const workbook = useMapStore((s) => s.workbook)
  const setActiveSheet = useMapStore((s) => s.setActiveSheet)
  const addSheet = useMapStore((s) => s.addSheet)
  const deleteSheet = useMapStore((s) => s.deleteSheet)
  const renameSheet = useMapStore((s) => s.renameSheet)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  return (
    <div className="sheetbar">
      {workbook.sheets.map((sheet) => {
        const active = sheet.id === workbook.activeSheetId
        return (
          <div
            key={sheet.id}
            className={`sheet-tab ${active ? 'active' : ''}`}
            onClick={() => setActiveSheet(sheet.id)}
            onDoubleClick={() => {
              setEditingId(sheet.id)
              setDraft(sheet.title)
            }}
            title={sheet.title}
          >
            {editingId === sheet.id ? (
              <input
                autoFocus
                className="input"
                style={{ height: 20, padding: '0 4px', width: 110, fontSize: 11 }}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={() => {
                  renameSheet(sheet.id, draft.trim() || sheet.title)
                  setEditingId(null)
                }}
                onKeyDown={(event) => {
                  event.stopPropagation()
                  if (event.key === 'Enter') {
                    renameSheet(sheet.id, draft.trim() || sheet.title)
                    setEditingId(null)
                  } else if (event.key === 'Escape') {
                    setEditingId(null)
                  }
                }}
              />
            ) : (
              <span>{sheet.title}</span>
            )}
            <span
              className="sheet-close"
              title="删除画布"
              onClick={(event) => {
                event.stopPropagation()
                deleteSheet(sheet.id)
              }}
            >
              <X size={11} />
            </span>
          </div>
        )
      })}
      <button className="sheet-add" title="新建画布" onClick={addSheet}>
        <Plus size={14} />
      </button>
    </div>
  )
}
