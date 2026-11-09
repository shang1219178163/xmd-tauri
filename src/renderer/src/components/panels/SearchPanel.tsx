import { useEffect, useMemo, useRef } from 'react'
import { useMapStore } from '../../store/mapStore'
import { findTopicPath, pathTitles } from '../../model/tree'

export default function SearchPanel() {
  const query = useMapStore((s) => s.searchQuery)
  const results = useMapStore((s) => s.searchResults)
  const setSearchQuery = useMapStore((s) => s.setSearchQuery)
  const select = useMapStore((s) => s.select)
  const sheet = useMapStore((s) => s.getActiveSheet())
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const focus = () => inputRef.current?.focus()
    window.addEventListener('xmind:focus-search', focus)
    return () => window.removeEventListener('xmind:focus-search', focus)
  }, [])

  const rows = useMemo(
    () =>
      results.map((id) => {
        const path = findTopicPath(sheet.rootTopic, id)
        const topic = path?.[path.length - 1]
        return { id, title: topic?.title ?? '', crumb: pathTitles(sheet.rootTopic, id).slice(0, -1).join(' / ') }
      }),
    [results, sheet.rootTopic]
  )

  return (
    <div>
      <section className="panel-section" style={{ borderBottom: 'none' }}>
        <h3 className="panel-title">
          搜索
          <span className="hint">{query ? `${results.length} 个结果` : '主题与标签'}</span>
        </h3>
        <input
          ref={inputRef}
          className="input"
          placeholder="搜索主题或标签…"
          value={query}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        <div className="search-results">
          {rows.map((row) => (
            <button
              key={row.id}
              className="result-item"
              onClick={() => {
                select([row.id], false)
                window.dispatchEvent(new CustomEvent('xmind:center-topic', { detail: row.id }))
              }}
            >
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.title || '未命名主题'}
              </span>
              {row.crumb ? <span className="crumb">{row.crumb}</span> : null}
            </button>
          ))}
          {query && !rows.length ? <div className="empty-state">没有匹配结果</div> : null}
          {!query ? <div className="empty-state">输入关键词开始搜索</div> : null}
        </div>
      </section>
    </div>
  )
}
