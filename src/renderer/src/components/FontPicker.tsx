import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search } from 'lucide-react'
import {
  FONT_PRESETS,
  currentFontKey,
  fontChoicesFromFamilies,
  labelForValue,
  loadFontFamilies,
  loadRecentFontChoices,
  matchesFontChoice,
  rememberFontChoice,
  type FontChoice
} from '../data/fonts'

interface FontPickerProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

interface PopoverBox {
  left: number
  top: number
  width: number
  maxHeight: number
}

function FontOption({
  choice,
  active,
  onSelect
}: {
  choice: FontChoice
  active: boolean
  onSelect: (choice: FontChoice) => void
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      className={`font-option ${active ? 'active' : ''}`}
      title={choice.family ?? choice.label}
      onClick={() => onSelect(choice)}
    >
      <span className="font-option-name" style={{ fontFamily: choice.value }}>
        {choice.label}
      </span>
      {active ? <Check size={13} className="font-option-check" /> : null}
    </button>
  )
}

export default function FontPicker({ value, onChange, disabled }: FontPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [families, setFamilies] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [recents, setRecents] = useState<FontChoice[]>(() => loadRecentFontChoices())
  const [box, setBox] = useState<PopoverBox>({ left: 0, top: 0, width: 280, maxHeight: 360 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const choices = useMemo(() => fontChoicesFromFamilies(families), [families])
  const activeKey = useMemo(() => currentFontKey(value), [value])
  const currentLabel = useMemo(() => labelForValue(value), [value])

  const filteredPresets = useMemo(
    () => FONT_PRESETS.filter((choice) => matchesFontChoice(choice, query)),
    [query]
  )
  const filteredFamilies = useMemo(
    () => choices.filter((choice) => matchesFontChoice(choice, query)),
    [choices, query]
  )
  const filteredRecents = useMemo(
    () => recents.filter((choice) => matchesFontChoice(choice, query)),
    [recents, query]
  )

  const position = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = Math.max(rect.width, 280)
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8)
    const spaceBelow = window.innerHeight - rect.bottom
    let maxHeight = Math.min(380, spaceBelow - 12)
    let top = rect.bottom + 6
    if (maxHeight < 200 && rect.top > spaceBelow) {
      maxHeight = Math.min(380, rect.top - 12)
      top = Math.max(8, rect.top - maxHeight - 6)
    }
    setBox({ left, top, width, maxHeight: Math.max(160, maxHeight) })
  }

  const openPicker = () => {
    if (disabled) return
    if (open) {
      setOpen(false)
      return
    }
    position()
    setQuery('')
    setRecents(loadRecentFontChoices())
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    void loadFontFamilies().then((list) => {
      if (cancelled) return
      setFamilies(list)
      setLoading(false)
    })

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (popupRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onScroll = (event: Event) => {
      const target = event.target
      // Scrolling the font list itself must not dismiss the popup.
      if (target instanceof Node && popupRef.current?.contains(target)) return
      setOpen(false)
    }
    const close = () => setOpen(false)
    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', close)
    const scrollTimer = window.setTimeout(() => {
      window.addEventListener('scroll', onScroll, true)
    }, 150)
    const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 0)

    return () => {
      cancelled = true
      window.clearTimeout(scrollTimer)
      window.clearTimeout(focusTimer)
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  const select = (choice: FontChoice) => {
    onChange(choice.value)
    setRecents(rememberFontChoice(choice))
    setOpen(false)
    setQuery('')
  }

  const onSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const first = filteredFamilies[0] ?? filteredPresets[0]
    if (first) select(first)
  }

  return (
    <div className="font-picker">
      <button
        type="button"
        ref={triggerRef}
        className="field-select font-trigger"
        onClick={openPicker}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={currentLabel}
      >
        <span className="font-trigger-label" style={{ fontFamily: value }}>
          {currentLabel}
        </span>
        <ChevronDown size={14} className="font-trigger-chevron" />
      </button>
      {open
        ? createPortal(
            <div
              ref={popupRef}
              className="font-popover"
              style={{ left: box.left, top: box.top, width: box.width, maxHeight: box.maxHeight }}
              role="listbox"
              aria-label="字体"
            >
              <div className="font-search">
                <Search size={13} />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={onSearchKeyDown}
                  placeholder="搜索字体"
                  aria-label="搜索字体"
                  autoFocus
                />
              </div>
              <div className="font-scroll">
                {!query.trim() && filteredRecents.length ? (
                  <div className="font-group">
                    <div className="font-group-title">最近使用</div>
                    {filteredRecents.map((choice) => (
                      <FontOption
                        key={`recent-${choice.key}`}
                        choice={choice}
                        active={choice.key === activeKey}
                        onSelect={select}
                      />
                    ))}
                  </div>
                ) : null}
                {filteredPresets.length ? (
                  <div className="font-group">
                    <div className="font-group-title">预设</div>
                    {filteredPresets.map((choice) => (
                      <FontOption
                        key={choice.key}
                        choice={choice}
                        active={choice.key === activeKey}
                        onSelect={select}
                      />
                    ))}
                  </div>
                ) : null}
                <div className="font-group">
                  <div className="font-group-title">全部字体</div>
                  {loading && !choices.length ? (
                    <div className="font-empty">正在加载字体…</div>
                  ) : filteredFamilies.length ? (
                    filteredFamilies.map((choice) => (
                      <FontOption
                        key={choice.key}
                        choice={choice}
                        active={choice.key === activeKey}
                        onSelect={select}
                      />
                    ))
                  ) : (
                    <div className="font-empty">没有匹配的字体</div>
                  )}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
